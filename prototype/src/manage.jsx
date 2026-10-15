// Manage a department in a side drawer: Credit Usage, Members, Department Details.
// Edits are staged across tabs and saved together; deleting is confirmed separately.
(() => {
  const { useMemo, useState, useId } = React;

  const peopleSummary = (list) => {
    const vts = list.filter((u) => u.type === 'vt').length;
    const people = list.length - vts;
    return `${people} ${people === 1 ? 'person' : 'people'} · ${vts} virtual ${vts === 1 ? 'teammate' : 'teammates'}`;
  };

  function RecipientsEditor({ users, contact, recipients, setRecipients }) {
    const selectId = useId();
    const taken = new Set([contact, ...recipients]);
    return (
      <section className="field-group recipients" aria-labelledby={selectId + '-title'}>
        <h3 className="field-group-title" id={selectId + '-title'}>
          <Icon name="mail" size={18} /> Alert recipients
        </h3>
        <p className="field-help">Emails go out at 75%, 90% and 100% of the budget, then monthly while over. Nothing is blocked.</p>
        <ul className="recipient-list">
          {FIXED_RECIPIENTS.map((r) => (
            <li key={r} className="recipient is-fixed">
              <Icon name="lock" size={14} />
              {r}
              <span className="sr-only">(always included)</span>
            </li>
          ))}
          {contact && (
            <li className="recipient">
              {contact} <span className="muted">· contact</span>
            </li>
          )}
          {recipients.map((r) => (
            <li key={r} className="recipient">
              {r}
              <button type="button" className="recipient-remove" aria-label={`Remove ${r} from alert recipients`}
                onClick={() => setRecipients(recipients.filter((x) => x !== r))}>
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="recipient-add">
          <label className="sr-only" htmlFor={selectId}>Add a recipient</label>
          <PersonCombobox
            id={selectId}
            users={users}
            value=""
            exclude={[...taken]}
            placeholder="Add recipient: search by name or email"
            resetOnSelect
            onChange={(v) => v && setRecipients([...recipients, v])}
          />
        </div>
        <p className="field-help small">Super Admins, Billing Admins and your CSM always get alerts and can't be removed.</p>
      </section>
    );
  }

  // `preset` lets the flow board open the drawer in a given state.
  function ManageDepartment({ dept, users, departments, allocated, pool, history, onSave, onDelete, onClose, onRequestCredits, initialTab = 'usage', preset = {} }) {
    const current = users.filter((u) => u.deptId === dept.id);
    const consumed = deptUsage(users, dept.id);
    const available = pool - (allocated - dept.budget);
    const startCredits = String(dept.budget);

    const [tab, setTab] = useState(initialTab === 'budget' ? 'usage' : initialTab);
    const [credits, setCredits] = useState(preset.pct != null ? creditsFromPct(preset.pct, pool) : startCredits);
    const [name, setName] = useState(dept.name);
    const [description, setDescription] = useState(dept.description);
    const [contact, setContact] = useState(dept.contact || '');
    const [recipients, setRecipients] = useState(dept.recipients || []);
    const [removed, setRemoved] = useState(new Set([...(preset.removed ?? []), ...(preset.confirmRemove ? [preset.confirmRemove] : [])]));
    const [added, setAdded] = useState(new Set());
    const [adding, setAdding] = useState(false);
    const [query, setQuery] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(!!preset.confirmDelete);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const [confirmLower, setConfirmLower] = useState(false);
    const nameId = useId();
    const descId = useId();
    const contactId = useId();
    const idBase = useId();

    const budgetChanged = credits !== startCredits;
    const newBudget = budgetChanged ? parseCredits(credits) || 0 : dept.budget;
    // An untouched budget is always valid, even if other changes made it larger than what's free.
    const bError = budgetChanged ? budgetError(credits, available) : null;
    const trimmed = name.trim();
    const nameError = !trimmed
      ? 'Enter a department name.'
      : departments.some((d) => d.id !== dept.id && d.name.toLowerCase() === trimmed.toLowerCase())
        ? 'A department with this name already exists. Choose another name.'
        : null;

    const recipientsChanged = recipients.join('|') !== (dept.recipients || []).join('|');
    const dirtyTabs = {
      usage: budgetChanged,
      members: removed.size > 0 || added.size > 0,
      details: trimmed !== dept.name || description.trim() !== dept.description || contact !== (dept.contact || '') || recipientsChanged,
    };
    const dirty = Object.values(dirtyTabs).some(Boolean);

    const members = useMemo(() => {
      const list = users.filter((u) => u.deptId === dept.id).map((u) => ({ ...u, leaving: removed.has(u.id) }));
      const incoming = users.filter((u) => added.has(u.id)).map((u) => ({ ...u, incoming: true }));
      return [...incoming, ...list];
    }, [users, dept.id, removed, added]);
    const staying = members.filter((u) => !u.leaving);
    const q = query.trim().toLowerCase();
    const visible = members
      .filter((u) => !q || fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => (b.incoming ? 1 : 0) - (a.incoming ? 1 : 0) || usageIn(b, dept.id) - usageIn(a, dept.id));
    const deptName = (id) => departments.find((d) => d.id === id)?.name;

    const status = statusOf(consumed, dept.budget);
    const newStatus = statusOf(consumed, newBudget);
    const deptHistory = history.filter((h) => h.deptId === dept.id);

    // Who is driving usage here, including people who have since moved out (their past usage stays).
    const topConsumers = users
      .map((u) => ({ u, here: usageIn(u, dept.id) }))
      .filter((r) => r.here > 0)
      .sort((a, b) => b.here - a.here)
      .slice(0, 3);
    // One-step fix for an over-budget department: usage plus 10% room, if that's still free to allocate.
    const raiseTo = Math.ceil((consumed * 1.1) / 50) * 50;
    const canRaise = status === 'over' && !budgetChanged && raiseTo > dept.budget && raiseTo <= available;

    // Plain-language list of everything that will change, shown above Save.
    const changes = [
      budgetChanged && !bError && `Budget ${fmt(dept.budget)} → ${fmt(newBudget)} credits`,
      added.size > 0 && `${added.size} ${added.size === 1 ? 'member' : 'members'} added`,
      removed.size > 0 && `${removed.size} moved to Unallocated`,
      trimmed !== dept.name && `Renamed to ${trimmed || '…'}`,
      description.trim() !== dept.description && 'Description updated',
      contact !== (dept.contact || '') && (contact ? `Contact set to ${contact}` : 'Contact removed'),
      recipientsChanged && 'Alert recipients updated',
    ].filter(Boolean);

    const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

    const commit = () =>
      onSave({
        deptId: dept.id,
        budget: newBudget,
        name: trimmed,
        description: description.trim(),
        contact,
        recipients,
        removeIds: [...removed],
        addIds: [...added],
      });

    // Save explains problems instead of greying out: it jumps to the tab that needs fixing.
    const save = () => {
      if (bError) {
        setTab('usage');
        return setTimeout(() => document.querySelector('.manage .input-credits')?.focus(), 0);
      }
      if (nameError) {
        setTab('details');
        return setTimeout(() => document.getElementById(nameId)?.focus(), 0);
      }
      if (budgetChanged && newBudget < dept.budget && newBudget < consumed) return setConfirmLower(true);
      commit();
    };

    let budgetNote = null;
    if (budgetChanged && !bError) {
      if (status === 'over' && newBudget > dept.budget && newBudget < consumed) {
        budgetNote = { tone: 'warn', text: `This reduces the overage, but ${dept.name} will still be over budget by ${fmt(consumed - newBudget)} credits.` };
      } else if (newBudget < consumed) {
        budgetNote = {
          tone: 'warn',
          text: `This is lower than what ${dept.name} has already used (${fmt(consumed)} credits), so it will show as over budget by ${fmt(consumed - newBudget)} right away${status === 'over' ? '' : ' and alert emails will go out'}. Usage won't be blocked.`,
        };
      } else if (status === 'over') {
        budgetNote = { tone: 'ok', text: `This clears the overage. ${dept.name} will be back within budget.` };
      }
    }

    const footer = adding ? (
      <div className="foot-row">
        <span className="foot-hint">{added.size ? `${added.size} selected` : 'Check people to add them'}</span>
        <Button variant="primary" onClick={() => setAdding(false)}>Done</Button>
      </div>
    ) : (
      <>
        {dirty && (
          <div className="pending" aria-live="polite">
            <p className="pending-title">
              {changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}
            </p>
            <ul className="pending-list">
              {changes.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        )}
        <div className="foot-row">
          {!dirty && <span className="foot-hint">No changes yet</span>}
          <Button variant="ghost" onClick={requestClose}>{dirty ? 'Cancel' : 'Close'}</Button>
          <Button variant="primary" disabled={!dirty} onClick={save}>Save changes</Button>
        </div>
      </>
    );

    const stageRemove = (u) => {
      if (u.incoming) {
        const next = new Set(added);
        next.delete(u.id);
        return setAdded(next);
      }
      const next = new Set(removed);
      next.has(u.id) ? next.delete(u.id) : next.add(u.id);
      setRemoved(next);
    };

    return (
      <>
        <Modal
          title={dept.name}
          subtitle={`${dept.description ? dept.description + ' · ' : ''}${peopleSummary(current)}`}
          onClose={requestClose}
          footer={footer}
          width={760}
          className="manage"
          drawer
        >
          {!adding && (
            <Tabs
              idBase={idBase}
              label="Manage department"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'usage', label: 'Credit Usage', dirty: dirtyTabs.usage },
                { id: 'members', label: 'Members', count: staying.length, countTone: 'muted', dirty: dirtyTabs.members },
                { id: 'details', label: 'Department Details', dirty: dirtyTabs.details },
              ]}
            />
          )}

          {tab === 'usage' && (
            <TabPanel idBase={idBase} id="usage" className="manage-panel">
              <section className={`usage-summary summary-${status}`} aria-label="Current usage">
                <div className="usage-summary-head">
                  <p className="tabular">
                    <strong>{fmt(consumed)}</strong> of {fmt(dept.budget)} consumed · {fmtPct(Math.round(pctOf(consumed, dept.budget)))}
                  </p>
                  <StatusBadge status={status} />
                </div>
                <UsageBar consumed={consumed} budget={dept.budget} status={status} />
                <div className="usage-summary-foot">
                  <span className="tabular">
                    {consumed > dept.budget ? `${fmt(consumed - dept.budget)} over budget · usage continues` : `${fmt(dept.budget - consumed)} left`}
                  </span>
                  <span className="as-of-wrap">
                    <UsageAsOf />
                    <InfoTip label="About usage timing" text={FRESHNESS_HELP} />
                  </span>
                </div>
              </section>

              {topConsumers.length > 0 && (
                <section className="field-group top-consumers" aria-labelledby={idBase + '-top'}>
                  <h3 className="field-group-title" id={idBase + '-top'}>Top consumers</h3>
                  <ol className="consumer-list">
                    {topConsumers.map(({ u, here }) => (
                      <li key={u.id}>
                        <span className="consumer-name">
                          {fullName(u)}
                          {u.type === 'vt' && <VirtualTag />}
                          {u.deptId !== dept.id && <span className="tag-dept">Moved out</span>}
                        </span>
                        <span className="tabular">{fmt(here)}</span>
                        <span className="tabular muted consumer-pct">{fmtPct(Math.round(pctOf(here, consumed)))}</span>
                      </li>
                    ))}
                  </ol>
                  <button type="button" className="link-btn view-all" onClick={() => setTab('members')}>See all members</button>
                </section>
              )}

              <section className="field-group">
                <h3 className="field-group-title">Budget</h3>
                {canRaise && (
                  <p className="raise">
                    <Button variant="secondary" size="sm" onClick={() => setCredits(String(raiseTo))}>
                      Raise to {fmt(raiseTo)}
                    </Button>
                    <span className="muted small">Covers current usage with 10% room. Nothing saves until you confirm.</span>
                  </p>
                )}
                <BudgetSlider value={credits} onChange={setCredits} pool={pool} available={available}
                  showError={budgetChanged} current={dept.budget} own={dept.budget} onRequestCredits={onRequestCredits} />
                {budgetChanged && !bError && (
                  <div className={`budget-preview summary-${newStatus}`}>
                    <span className="tabular">
                      With the new budget: <strong>{fmt(consumed)}</strong> of {fmt(newBudget)} · {fmtPct(Math.round(pctOf(consumed, newBudget)))}
                    </span>
                    <StatusBadge status={newStatus} />
                  </div>
                )}
                {budgetNote && (
                  <p className={'note note-' + budgetNote.tone} role="status">
                    <Icon name={budgetNote.tone === 'ok' ? 'checkCircle' : 'alert'} size={16} />
                    {budgetNote.text}
                  </p>
                )}
              </section>

              <p className="alerts-line">
                <Icon name="mail" size={16} />
                Alerts at 75%, 90% and 100% go to {FIXED_RECIPIENTS.length + (contact ? 1 : 0) + recipients.length} recipients.
                <button type="button" className="link-btn" onClick={() => setTab('details')}>Change recipients</button>
              </p>

              <section className="field-group">
                <h3 className="field-group-title">
                  <Icon name="history" size={18} /> Allocation history
                </h3>
                {deptHistory.length === 0 ? (
                  <p className="muted small">No changes recorded yet.</p>
                ) : (
                  <ol className="history">
                    {newestFirst(deptHistory).map((h) => (
                      <li key={h.id}>
                        <span className="history-text">{h.text}</span>
                        <span className="history-meta">{h.when} · {h.actor}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </TabPanel>
          )}

          {tab === 'members' && !adding && (
            <TabPanel idBase={idBase} id="members" className="manage-panel">
              <div className="members-head">
                <p className="tabular">{peopleSummary(staying)}</p>
                <Button variant="secondary" size="sm" icon="plus" onClick={() => setAdding(true)}>Add members</Button>
              </div>
              <p className="field-help">Each person or virtual teammate can be in one department for credit tracking.</p>
              {(removed.size > 0 || added.size > 0) && (
                <p className="note note-move" role="status">
                  <Icon name="info" size={16} />
                  {[
                    added.size && `${added.size} to add`,
                    removed.size && `${removed.size} to move to Unallocated`,
                  ].filter(Boolean).join(' · ')}. Changes apply when you save. Past usage stays with {dept.name}.
                  <button type="button" className="link-btn" onClick={() => { setRemoved(new Set()); setAdded(new Set()); }}>Undo all</button>
                </p>
              )}
              <div className="search">
                <Icon name="search" size={18} />
                <input
                  className="input search-input"
                  type="search"
                  placeholder="Search by name or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search members"
                />
              </div>
              {visible.length === 0 ? (
                <div className="empty">
                  <p className="empty-title">{members.length ? 'No members match this search' : 'No members yet'}</p>
                  <p className="empty-text">
                    {members.length ? 'Try a different name or email.' : 'Add people so their usage counts toward this department.'}
                  </p>
                  {!members.length && <Button variant="ghost" size="sm" icon="plus" onClick={() => setAdding(true)}>Add members</Button>}
                </div>
              ) : (
                <table className="table table-compact members-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email address</th>
                      <th className="num">Consumed here</th>
                      <th className="col-action"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((u) => (
                      <tr key={u.id} className={u.leaving ? 'is-leaving' : u.incoming ? 'is-incoming' : ''}>
                        <td>
                          <span className="cell-name">{fullName(u)}</span>
                          {u.leaving && <span className="tag-leaving">Moving to Unallocated</span>}
                          {u.incoming && <span className="tag-added">{u.deptId ? `From ${deptName(u.deptId)}` : 'New'}</span>}
                        </td>
                        <td>
                          <span className="email-cell">
                            {u.email}
                            {u.type === 'vt' && <VirtualTag />}
                          </span>
                          <Principal user={u} />
                        </td>
                        <td className="num tabular">{u.incoming ? <span className="muted">–</span> : fmt(usageIn(u, dept.id))}</td>
                        <td className="col-action">
                          {u.leaving ? (
                            <button type="button" className="link-btn" onClick={() => stageRemove(u)}>
                              Undo<span className="sr-only"> moving {fullName(u)}</span>
                            </button>
                          ) : (
                            <IconButton
                              icon={u.incoming ? 'x' : 'moveOut'}
                              size={18}
                              label={u.incoming ? `Don't add ${fullName(u)}` : `Move ${fullName(u)} to Unallocated`}
                              onClick={() => stageRemove(u)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabPanel>
          )}

          {tab === 'members' && adding && (
            <div className="manage-panel">
              <button type="button" className="link-btn back-link" onClick={() => setAdding(false)}>
                <Icon name="chevronLeft" size={16} /> Back to members
              </button>
              <MemberPicker
                users={users}
                departments={departments}
                staged={added}
                setStaged={setAdded}
                targetDeptId={dept.id}
                title={`Add members to ${dept.name}`}
              />
            </div>
          )}

          {tab === 'details' && (
            <TabPanel idBase={idBase} id="details" className="manage-panel">
              <div className="field">
                <label className="field-label" htmlFor={nameId}>
                  Department name <span className="req" aria-hidden="true">*</span>
                </label>
                <input id={nameId} className={'input' + (nameError ? ' has-error' : '')} value={name} maxLength={60}
                  onChange={(e) => setName(e.target.value)} aria-required="true" aria-invalid={!!nameError}
                  aria-describedby={nameError ? nameId + '-err' : undefined} />
                {nameError && (
                  <p className="field-error" id={nameId + '-err'} role="alert"><Icon name="alert" size={16} />{nameError}</p>
                )}
              </div>
              <div className="field">
                <label className="field-label" htmlFor={descId}>Description <span className="optional">Optional</span></label>
                <textarea id={descId} className="input textarea" rows={2} maxLength={200} value={description}
                  onChange={(e) => setDescription(e.target.value)} />
              </div>
              <ContactField id={contactId} users={users} value={contact} onChange={(v) => { setContact(v); setRecipients(recipients.filter((r) => r !== v)); }} />

              <RecipientsEditor users={users} contact={contact} recipients={recipients} setRecipients={setRecipients} />

              <dl className="meta-list">
                <div><dt>Created</dt><dd>{dept.createdAt}</dd></div>
                <div><dt>Created by</dt><dd>{dept.createdBy}</dd></div>
              </dl>
              <section className="danger-zone">
                <div>
                  <h3 className="field-group-title">Delete this department</h3>
                  <p className="small muted">
                    Members move to Unallocated and the budget goes back to available to allocate.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>Delete department</Button>
              </section>
            </TabPanel>
          )}
        </Modal>

        {confirmLower && (
          <ConfirmDialog
            title={`Lower the budget below usage?`}
            confirmLabel="Save changes"
            cancelLabel="Go back"
            onCancel={() => setConfirmLower(false)}
            onConfirm={() => {
              setConfirmLower(false);
              commit();
            }}
          >
            <p className="budget-diff tabular">
              {fmt(dept.budget)} <Icon name="arrowRight" size={14} /> <strong>{fmt(newBudget)}</strong> credits
            </p>
            <p>
              {dept.name} has already used {fmt(consumed)} credits, so it will show as over budget by{' '}
              {fmt(consumed - newBudget)}{status === 'over' ? '' : ' and alert emails will go out'}. Usage won't be blocked.
            </p>
          </ConfirmDialog>
        )}

        {confirmDelete && (
          <ConfirmDialog
            title={`Delete ${dept.name}?`}
            tone="danger"
            confirmLabel="Delete department"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => onDelete(dept.id)}
          >
            <p>
              Its {peopleSummary(current).replace(' · ', ' and ')} move to Unallocated, and its {fmt(dept.budget)}-credit
              budget goes back to available to allocate.
            </p>
            <p className="muted">This can't be undone.</p>
          </ConfirmDialog>
        )}

        {confirmDiscard && (
          <ConfirmDialog
            title="Discard your changes?"
            tone="danger"
            confirmLabel="Discard changes"
            cancelLabel="Keep editing"
            onCancel={() => setConfirmDiscard(false)}
            onConfirm={() => {
              setConfirmDiscard(false);
              onClose();
            }}
          >
            <p>You have {changes.length || 'some'} unsaved {changes.length === 1 ? 'change' : 'changes'} to {dept.name}. If you close now, they won't be applied.</p>
          </ConfirmDialog>
        )}
      </>
    );
  }

  window.ManageDepartment = ManageDepartment;
})();
