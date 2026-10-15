// "Add department budget": 1 Department info and members → 2 Set budget → 3 Review.
// Nothing is committed until Create department.
(() => {
  const { useState, useId } = React;
  const STEPS = ['Department info and members', 'Set budget', 'Review'];
  const DEFAULT_PCT = 10; // Figma default; the PRD proposes 25%. Not decided yet.

  const FIXED_RECIPIENTS = ['Super Admins', 'Billing Admins', 'Your Optimizely CSM'];

  function recipientsSentence(contact, extra = []) {
    const names = [...FIXED_RECIPIENTS.map((r) => (r === 'Your Optimizely CSM' ? 'your Optimizely CSM' : r)), contact && `${contact} (department contact)`, ...extra].filter(Boolean);
    return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  }

  function UsageAlertsNote({ contact, extra, hint }) {
    return (
      <div className="alerts-note">
        <h3 className="field-group-title">
          <Icon name="mail" size={18} /> Usage alerts
        </h3>
        <p>
          Emails go out at <strong>75%</strong>, <strong>90%</strong> and <strong>100%</strong> of the budget, then once a
          month while over budget. Nothing is blocked at any threshold.
        </p>
        <p className="muted">Sent to {recipientsSentence(contact, extra)}.</p>
        {hint && <p className="muted">{hint}</p>}
      </div>
    );
  }

  function ContactField({ id, users, value, onChange }) {
    return (
      <div className="field">
        <label className="field-label" htmlFor={id}>Department contact <span className="optional">Optional</span></label>
        <PersonCombobox id={id} users={users} value={value} onChange={onChange} placeholder="Search people" clearLabel="No contact yet" />
        <p className="field-help">Gets this department's usage alerts. Doesn't need to be an admin.</p>
      </div>
    );
  }

  // Helps set the number: where it starts from, what these members have used, and what peers have.
  function BudgetContext({ stagedUsers, departments, pool, available, credits, isDefault, setCredits }) {
    const used = stagedUsers.reduce((a, u) => a + u.consumed, 0);
    const buffered = Math.ceil((used * 1.25) / 50) * 50;
    const budgets = departments.map((d) => d.budget);
    const current = parseCredits(credits);
    const options = [
      used > 0 && { label: 'Match their usage', value: used },
      used > 0 && { label: 'Usage + 25% room', value: buffered },
    ].filter((o) => o && o.value <= available);
    return (
      <div className="budget-context">
        {isDefault && (
          <p className="field-help">
            Starting point: {DEFAULT_PCT}% of {fmt(pool)} credits. Change it to fit what this department needs.
          </p>
        )}
        {stagedUsers.length > 0 && (
          <p className="field-help tabular">
            {stagedUsers.length === 1 ? 'The person or teammate' : `The ${stagedUsers.length} people and teammates`} you picked used{' '}
            <strong>{fmt(used)}</strong> credits this term. That usage stays with their current departments.
          </p>
        )}
        {budgets.length > 0 && (
          <p className="field-help tabular">
            Other departments are budgeted between {fmt(Math.min(...budgets))} and {fmt(Math.max(...budgets))} credits.
          </p>
        )}
        {options.length > 0 && (
          <div className="chips" role="group" aria-label="Suggested budgets">
            {options.map((o) => (
              <button
                key={o.label}
                type="button"
                className={'chip' + (current === o.value ? ' is-on' : '')}
                aria-pressed={current === o.value}
                onClick={() => setCredits(String(o.value))}
              >
                {o.label} <span className="tabular">{fmt(o.value)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function AddDepartmentWizard({ users, departments, allocated, pool, onCreate, onClose, onRequestCredits, startStep = 0, preset }) {
    const available = pool - allocated;
    const defaultCredits = String(Math.max(0, Math.min(Math.round((DEFAULT_PCT / 100) * pool), available)));

    const [step, setStep] = useState(startStep);
    const [name, setName] = useState(preset?.name ?? '');
    const [description, setDescription] = useState(preset?.description ?? '');
    const [contact, setContact] = useState(preset?.contact ?? '');
    const [staged, setStaged] = useState(new Set([...(preset?.members ?? []), ...(preset?.picker?.selected ?? [])]));
    const [credits, setCredits] = useState(preset?.pct != null ? (preset.pct === '' ? '' : creditsFromPct(preset.pct, pool)) : defaultCredits);
    const [touchedName, setTouchedName] = useState(!!preset?.touched);
    const [touchedBudget, setTouchedBudget] = useState(preset?.pct != null);
    const [confirmLeave, setConfirmLeave] = useState(!!preset?.confirmLeave);
    const [showAll, setShowAll] = useState(false);
    const [showDesc, setShowDesc] = useState(!!preset?.description);
    const [showMembers, setShowMembers] = useState(!!(preset?.members?.length || preset?.picker));
    const membersId = useId();
    const nameId = useId();
    const descId = useId();
    const contactId = useId();
    const nameErrId = useId();

    const trimmed = name.trim();
    const duplicate = departments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase());
    const nameError = !trimmed ? 'Enter a department name.' : duplicate ? 'A department with this name already exists. Choose another name.' : null;
    const bError = budgetError(credits, available);
    const amount = parseCredits(credits) || 0;

    const dirty = trimmed || description.trim() || contact || staged.size || credits !== defaultCredits;
    const requestClose = () => (dirty ? setConfirmLeave(true) : onClose());

    // Continue stays clickable: it explains what's missing instead of greying out.
    const next = () => {
      if (step === 0) {
        setTouchedName(true);
        if (nameError) return document.getElementById(nameId)?.focus();
      }
      if (step === 1) {
        setTouchedBudget(true);
        if (bError) return document.querySelector('.wizard .input-credits')?.focus();
      }
      setStep(step + 1);
    };

    const stagedUsers = users.filter((u) => staged.has(u.id));
    const vtCount = stagedUsers.filter((u) => u.type === 'vt').length;
    const peopleCount = stagedUsers.length - vtCount;
    const deptName = (id) => departments.find((d) => d.id === id)?.name;
    const movers = stagedUsers.filter((u) => u.deptId);

    const create = (another = false) =>
      onCreate({ name: trimmed, description: description.trim(), contact, budget: amount, members: [...staged] }, another);
    // After this one, is there still budget left to hand out? If not, there is nothing to repeat.
    const canRepeat = available - amount > 0;

    const footer = (
      <>
        {step === 0 ? (
          <Button variant="ghost" onClick={requestClose}>Cancel</Button>
        ) : (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
        )}
        {step < 2 ? (
          <Button variant="primary" onClick={next}>Continue</Button>
        ) : (
          <>
            {canRepeat && <Button variant="secondary" onClick={() => create(true)}>Create and add another</Button>}
            <Button variant="primary" onClick={() => create(false)}>Create department</Button>
          </>
        )}
      </>
    );

    return (
      <>
        <Modal title="Add department budget" onClose={requestClose} footer={footer} width={760} className="wizard">
          <Stepper steps={STEPS} current={step} />

          {step === 0 && (
            <div className="wizard-step">
              <section className="field-group" aria-labelledby="dept-info">
                <h3 className="field-group-title" id="dept-info">Department info</h3>
                <div className="field-row">
                  <div className="field">
                    <label className="field-label" htmlFor={nameId}>
                      Name <span className="req" aria-hidden="true">*</span>
                    </label>
                    <input
                      id={nameId}
                      className={'input' + (touchedName && nameError ? ' has-error' : '')}
                      placeholder="e.g. Marketing - EU"
                      value={name}
                      maxLength={60}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => trimmed && setTouchedName(true)}
                      aria-required="true"
                      aria-invalid={touchedName && !!nameError}
                      aria-describedby={touchedName && nameError ? nameErrId : undefined}
                      autoComplete="off"
                    />
                    {touchedName && nameError && (
                      <p className="field-error" id={nameErrId} role="alert">
                        <Icon name="alert" size={16} />
                        {nameError}
                      </p>
                    )}
                  </div>
                  <ContactField id={contactId} users={users} value={contact} onChange={setContact} />
                </div>
                {showDesc || description ? (
                  <div className="field">
                    <label className="field-label" htmlFor={descId}>Description <span className="optional">Optional</span></label>
                    <textarea
                      id={descId}
                      className="input textarea"
                      placeholder="What this department does, e.g. regional campaigns and localisation"
                      value={description}
                      maxLength={200}
                      rows={2}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                ) : (
                  <button type="button" className="link-btn add-link" onClick={() => setShowDesc(true)}>
                    <Icon name="plus" size={14} /> Add a description
                  </button>
                )}
              </section>

              <section className="disclosure">
                <button
                  type="button"
                  className="disclosure-toggle"
                  aria-expanded={showMembers}
                  aria-controls={membersId}
                  onClick={() => setShowMembers(!showMembers)}
                >
                  <Icon name={showMembers ? 'chevronDown' : 'chevronRight'} size={18} />
                  <span className="field-group-title">Members</span>
                  <span className="muted small">
                    Optional · {staged.size ? `${staged.size} selected` : 'you can add people later'}
                  </span>
                </button>
                {showMembers && (
                  <div id={membersId}>
                    <MemberPicker users={users} departments={departments} staged={staged} setStaged={setStaged} initial={preset?.picker} />
                  </div>
                )}
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="wizard-step">
              <section className="field-group">
                <h3 className="field-group-title">Budget for this department</h3>
                <p className="field-help">
                  A soft budget for tracking and alerts. Usage is never blocked. Enter credits or a share. The budget is
                  kept as a share of the organization pool, so its credit amount changes when credit allotments start or
                  expire.
                </p>
                <BudgetContext
                  stagedUsers={stagedUsers}
                  departments={departments}
                  pool={pool}
                  available={available}
                  credits={credits}
                  isDefault={credits === defaultCredits && !preset}
                  setCredits={setCredits}
                />
                <BudgetSlider value={credits} onChange={setCredits} pool={pool} available={available}
                  showError={touchedBudget || credits !== defaultCredits} onRequestCredits={onRequestCredits} />
              </section>
              <UsageAlertsNote contact={contact} hint="You can add more recipients later in Department details." />
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step review">
              <section className="review-block">
                <div className="review-head">
                  <h3 className="field-group-title">Department info</h3>
                  <button type="button" className="link-btn" onClick={() => setStep(0)}>
                    <Icon name="pencil" size={14} /> Edit<span className="sr-only"> department info</span>
                  </button>
                </div>
                <div className="review-card">
                  <p className="review-strong">{trimmed}</p>
                  <p className="muted">{description.trim() || 'No description'}</p>
                  <p className="small">Contact: {contact || <span className="muted">None yet</span>}</p>
                  {!contact && (
                    <p className="small muted">
                      Alerts will go to admins and your CSM only.{' '}
                      <button type="button" className="link-btn inline-link" onClick={() => setStep(0)}>Add a contact</button>
                    </p>
                  )}
                </div>
              </section>

              <section className="review-block">
                <div className="review-head">
                  <h3 className="field-group-title">Department budget</h3>
                  <button type="button" className="link-btn" onClick={() => setStep(1)}>
                    <Icon name="pencil" size={14} /> Edit<span className="sr-only"> budget</span>
                  </button>
                </div>
                <div className="review-card">
                  <p className="review-strong tabular">{fmt(amount)} credits</p>
                  <p className="muted tabular">
                    {fmtPct(pctOf(amount, pool))} of your {fmt(pool)} contracted credits · {fmt(available - amount)} left to
                    allocate after this
                  </p>
                  {credits === defaultCredits && !preset && (
                    <p className="small muted">
                      This is the starting budget ({DEFAULT_PCT}% of your pool), not one you've changed.{' '}
                      <button type="button" className="link-btn inline-link" onClick={() => setStep(1)}>Edit budget</button>
                    </p>
                  )}
                  <hr className="divider" />
                  <p className="small">
                    Alerts at <strong>75%</strong>, <strong>90%</strong> and <strong>100%</strong> of the budget.
                  </p>
                  <p className="small muted">Sent to {recipientsSentence(contact)}.</p>
                </div>
              </section>

              <section className="review-block">
                <div className="review-head">
                  <h3 className="field-group-title">
                    Members ({stagedUsers.length})
                    {stagedUsers.length > 0 && (
                      <span className="muted">
                        {' '}· {peopleCount} {peopleCount === 1 ? 'person' : 'people'}, {vtCount} virtual {vtCount === 1 ? 'teammate' : 'teammates'}
                      </span>
                    )}
                  </h3>
                  <button type="button" className="link-btn" onClick={() => setStep(0)}>
                    <Icon name="pencil" size={14} /> Edit<span className="sr-only"> members</span>
                  </button>
                </div>
                {movers.length > 0 && (
                  <p className="note note-move">
                    <Icon name="arrowRight" size={16} />
                    {movers.length === 1
                      ? `${fullName(movers[0])} moves from ${deptName(movers[0].deptId)}.`
                      : `${movers.length} people move from other departments.`}{' '}
                    Their past usage stays where it is.
                  </p>
                )}
                {stagedUsers.length === 0 ? (
                  <div className="review-card muted">
                    No members yet. You can add people after the department is created.
                  </div>
                ) : (
                  <div className="review-card flush">
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>First name</th>
                          <th className="col-last">Last name</th>
                          <th>Email address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAll ? stagedUsers : stagedUsers.slice(0, 5)).map((u) => (
                          <tr key={u.id}>
                            <td>{u.first}</td>
                            <td className="col-last">{u.last || <span className="muted">–</span>}</td>
                            <td>
                              <span className="email-cell">
                                {u.email}
                                {u.type === 'vt' && <VirtualTag />}
                                {u.deptId && <span className="tag-dept">From {deptName(u.deptId)}</span>}
                              </span>
                              <Principal user={u} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {stagedUsers.length > 5 && (
                      <button type="button" className="link-btn view-all" onClick={() => setShowAll(!showAll)}>
                        {showAll ? 'Show fewer' : `View all ${stagedUsers.length}`}
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </Modal>

        {confirmLeave && (
          <ConfirmDialog
            title="Leave without creating?"
            tone="danger"
            confirmLabel="Discard entries"
            cancelLabel="Keep editing"
            onConfirm={() => {
              setConfirmLeave(false);
              onClose();
            }}
            onCancel={() => setConfirmLeave(false)}
          >
            {trimmed || 'This department'} hasn't been created yet. If you leave now, what you've entered will be lost.
          </ConfirmDialog>
        )}
      </>
    );
  }

  Object.assign(window, { AddDepartmentWizard, UsageAlertsNote, ContactField, FIXED_RECIPIENTS, recipientsSentence });
})();
