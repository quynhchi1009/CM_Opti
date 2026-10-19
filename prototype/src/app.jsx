// App shell (Admin Center chrome), prototype state and the scenario jump menu.
(() => {
  const { useState, useCallback, useEffect, useRef } = React;

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const freshState = () => ({ users: clone(MOCK.users), departments: clone(MOCK.departments), history: clone(MOCK.history) });
  const now = () => {
    const d = new Date();
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    );
  };
  let hid = 100;
  // deptName is kept on each entry so the log still reads correctly after a department is deleted.
  const entry = (deptId, text, deptName) => ({ id: 'h' + hid++, deptId, deptName, when: now(), actor: MOCK.CURRENT_ADMIN.name, text });

  const NAV = [
    { title: 'User Management', items: [['Users', 'user'], ['Groups', 'users'], ['Teams', 'team']] },
    { title: 'Access Setup', items: [['Product Access', 'grid'], ['Roles', 'shield']] },
    { title: 'Settings', items: [['Usage & Billing', 'billing'], ['Settings', 'gear']] },
  ];

  function TopBar({ navOpen, onMenu }) {
    return (
      <header className="topbar">
        <div className="topbar-left">
          {onMenu && (
            <button type="button" className="icon-btn nav-toggle" aria-label="Menu" aria-expanded={!!navOpen} aria-controls="admin-nav" onClick={onMenu}>
              <Icon name="menu" size={22} />
            </button>
          )}
          <img className="wordmark" src="assets/optimizely-logo.png" alt="Optimizely" width="88" height="21" />
          <button type="button" className="crumb">Optimizely Solution Architect <Icon name="chevronDown" size={16} /></button>
          <span className="crumb-sep" aria-hidden="true">/</span>
          <button type="button" className="crumb">Admin Center <Icon name="chevronDown" size={16} /></button>
        </div>
        <div className="topbar-right">
          <button type="button" className="ask-opal">Ask Opal <span className="opal-orb" aria-hidden="true" /></button>
          <IconButton icon="search" label="Search" />
          <IconButton icon="bell" label="Notifications" />
          <IconButton icon="help" label="Help" />
          <span className="avatar" title={MOCK.CURRENT_ADMIN.name}>{MOCK.CURRENT_ADMIN.initials}</span>
        </div>
      </header>
    );
  }

  function Sidebar({ onElsewhere, open, onClose }) {
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open]);
    return (
      <nav className={'sidebar' + (open ? ' is-open' : '')} id="admin-nav" aria-label="Admin Center">
        {NAV.map((g) => (
          <div key={g.title} className="nav-group">
            <p className="nav-title">{g.title}</p>
            <ul>
              {g.items.map(([label, icon]) => {
                const active = label === 'Usage & Billing';
                return (
                  <li key={label}>
                    <a
                      href="#"
                      className={'nav-item' + (active ? ' is-active' : '')}
                      aria-current={active ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        onClose && onClose();
                        if (!active) onElsewhere(label);
                      }}
                    >
                      <Icon name={icon} size={22} />
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  // Shows exactly what will be sent before anything goes to the account team.
  function RequestCreditsDialog({ consumed, pool, onSend, onClose }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const amountId = 'req-amount';
    const noteId = 'req-note';
    return (
      <Modal
        title="Request more credits"
        onClose={onClose}
        width={540}
        className="dialog request-dialog"
        overlay
        initialFocus={'#' + amountId}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => onSend({ amount, note })}>Send request</Button>
          </>
        }
      >
        <div className="request-summary tabular">
          <span>Current usage: <strong>{fmt(consumed)}</strong> of {fmt(pool)} contracted ({fmtPct(Math.round(pctOf(consumed, pool)))})</span>
          <span>Contract term ends {MOCK.CONTRACT.expires}</span>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={amountId}>Credits you think you'll need <span className="optional">Optional</span></label>
          <input id={amountId} className="input" inputMode="numeric" placeholder="e.g. 5,000" value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={noteId}>Note for your account team <span className="optional">Optional</span></label>
          <textarea id={noteId} className="input textarea" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Marketing - US is launching a new campaign next month" />
        </div>
        <p className="small muted request-foot">
          Goes to your Optimizely account team by email, from {MOCK.CURRENT_ADMIN.name}. They'll follow up with options.
          Nothing changes in your account until new credits are added.
        </p>
      </Modal>
    );
  }

  // Move people and agents out of Unallocated into an existing department.
  function AssignDrawer({ users, departments, onAssign, onClose }) {
    const [target, setTarget] = useState(departments[0]?.id || '');
    const [staged, setStaged] = useState(new Set());
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const selectId = 'assign-target';
    const targetName = departments.find((d) => d.id === target)?.name;
    const ids = [...staged].filter((id) => users.find((u) => u.id === id)?.deptId !== target);
    const requestClose = () => (ids.length ? setConfirmDiscard(true) : onClose());
    return (
      <>
        <Modal
          title="Assign to a department"
          subtitle="Their future usage counts toward the department you pick. Past usage stays where it is."
          onClose={requestClose}
          width={760}
          className="manage assign"
          drawer
          initialFocus={'#' + selectId}
          footer={
            <div className="foot-row">
              <span className="foot-hint">{ids.length ? `${ids.length} selected` : 'Check people to assign them'}</span>
              <Button variant="ghost" onClick={requestClose}>Cancel</Button>
              <Button variant="primary" disabled={!ids.length} onClick={() => onAssign(target, ids)}>
                {ids.length ? `Move ${ids.length} to ${targetName}` : 'Move'}
              </Button>
            </div>
          }
        >
          <div className="manage-panel">
            <label className="select-field wide" htmlFor={selectId}>
              <span className="field-label">Department</span>
              <span className="select-wrap">
                <select id={selectId} className="select-input" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Icon name="chevronDown" size={16} />
              </span>
            </label>
            <MemberPicker key={target} users={users} departments={departments} staged={staged} setStaged={setStaged}
              targetDeptId={target} title={`People to move to ${targetName}`} />
          </div>
        </Modal>
        {confirmDiscard && (
          <ConfirmDialog
            title="Discard your selection?"
            tone="danger"
            confirmLabel="Discard selection"
            cancelLabel="Keep editing"
            onCancel={() => setConfirmDiscard(false)}
            onConfirm={onClose}
          >
            <p>{ids.length} selected {ids.length === 1 ? 'person' : 'people'} won't be moved.</p>
          </ConfirmDialog>
        )}
      </>
    );
  }

  function ScenarioMenu({ onPick }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
      document.addEventListener('mousedown', close);
      return () => document.removeEventListener('mousedown', close);
    }, []);
    const items = [
      ['reset', 'Reset prototype data'],
      ['wizard', 'Add department budget · step 1'],
      ['wizard-over', 'Step 2 · more than available'],
      ['wizard-review', 'Step 3 · review'],
      ['assign', 'Assign from Unallocated'],
      ['request', 'Request credits'],
      ['manage-over', 'Manage · Engineering (over budget)'],
      ['manage-members', 'Manage · Marketing - US members'],
      ['manage-details', 'Manage · department details'],
      ['empty', 'Empty state · no departments'],
      ...Object.entries(MOCK.BATCH_SCENARIOS).map(([n, b]) => ['batch-' + n, 'Credit batches · ' + n + '. ' + b.title]),
      ['hl-intro', 'Hard limit · intro (first 30 days)'],
      ['hl-after', 'Hard limit · after intro (control only)'],
      ['hl-reached', 'Hard limit · limit reached'],
    ];
    return (
      <div className="scenarios" ref={ref}>
        {open && (
          <ul className="scenario-list" role="menu">
            {items.map(([id, label]) => (
              <li key={id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onPick(id);
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="scenario-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="layers" size={18} /> Screens
        </button>
      </div>
    );
  }

  function App() {
    const [state, setState] = useState(freshState);
    const [productTab, setProductTab] = useState('credits');
    const [wizard, setWizard] = useState(null); // { startStep, preset }
    const [manage, setManage] = useState(null); // { deptId, tab }
    const [toasts, setToasts] = useState([]);
    const [navOpen, setNavOpen] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [highlightId, setHighlightId] = useState(null);
    const [batchScenario, setBatchScenario] = useState(1);

    // A toast with an action stays a little longer so there's time to use it.
    const toast = useCallback((text, action) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, text, action }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 10000 : 5000);
    }, []);

    const allocated = state.departments.reduce((a, d) => a + d.budget, 0);
    const deptName = (id) => state.departments.find((d) => d.id === id)?.name || 'Unallocated';

    const consumedTotal = state.users.reduce((a, u) => a + u.consumed, 0);
    const fromName = (s, u) => (u.deptId ? s.departments.find((d) => d.id === u.deptId)?.name : 'Unallocated');

    const create = ({ name, description, contact, budget, members }, another = false) => {
      const id = 'd' + Date.now();
      setState((s) => {
        const moved = s.users.filter((u) => members.includes(u.id));
        const history = [...s.history, entry(id, `Created department with a budget of ${fmt(budget)} credits`, name)];
        moved.forEach((u) => history.push(entry(id, `Moved ${fullName(u)} from ${fromName(s, u)}`, name)));
        return {
          departments: [
            ...s.departments,
            {
              id, name, description, budget, contact, recipients: [],
              createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              createdBy: MOCK.CURRENT_ADMIN.name,
            },
          ],
          users: s.users.map((u) => (members.includes(u.id) ? { ...u, deptId: id } : u)),
          history,
        };
      });
      // "Create and add another" reopens the wizard on step 1 with the same budget share, kept within what's left.
      if (another) {
        const left = MOCK.POOL - (allocated + budget);
        const pct = Math.floor((Math.min(budget, left) / MOCK.POOL) * 1000) / 10;
        setWizard({ startStep: 0, key: Date.now(), preset: { pct: String(pct) } });
      } else setWizard(null);
      setHighlightId(id);
      setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 6000);
      toast(
        `${name} created with a budget of ${fmt(budget)} credits.${another ? ' Ready for the next one.' : ''}`,
        contact || another ? undefined : { label: 'Add a contact', run: () => setManage({ deptId: id, tab: 'details' }) },
      );
    };

    const save = ({ deptId, budget, name, description, contact, recipients, removeIds, addIds }) => {
      setState((s) => {
        const dept = s.departments.find((d) => d.id === deptId);
        const history = [...s.history];
        const log = (text) => history.push(entry(deptId, text, name));
        if (budget !== dept.budget) log(`${budget > dept.budget ? 'Increased' : 'Decreased'} budget ${fmt(dept.budget)} → ${fmt(budget)}`);
        if (name !== dept.name) log(`Renamed from ${dept.name}`);
        removeIds.forEach((uid) => log(`Moved ${fullName(s.users.find((u) => u.id === uid))} to Unallocated`));
        addIds.forEach((uid) => {
          const u = s.users.find((x) => x.id === uid);
          log(`Moved ${fullName(u)} from ${fromName(s, u)}`);
        });
        return {
          departments: s.departments.map((d) => (d.id === deptId ? { ...d, budget, name, description, contact, recipients } : d)),
          users: s.users.map((u) =>
            removeIds.includes(u.id) ? { ...u, deptId: null } : addIds.includes(u.id) ? { ...u, deptId } : u,
          ),
          history,
        };
      });
      setManage(null);
      toast(`Changes to ${name} saved.`);
    };

    const remove = (deptId) => {
      const name = deptName(deptId);
      setState((s) => ({
        departments: s.departments.filter((d) => d.id !== deptId),
        // Where a deleted department's past usage belongs isn't decided; the prototype files it under Unallocated.
        users: s.users.map((u) => {
          const usage = { ...u.usage };
          if (usage[deptId]) {
            usage.none = (usage.none || 0) + usage[deptId];
            delete usage[deptId];
          }
          return { ...u, usage, deptId: u.deptId === deptId ? null : u.deptId };
        }),
        history: [...s.history, entry(deptId, `Deleted department; members moved to Unallocated`, name)],
      }));
      setManage(null);
      toast(`${name} deleted. Its members are now in Unallocated.`);
    };

    const assign = (deptId, ids) => {
      const name = deptName(deptId);
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (ids.includes(u.id) ? { ...u, deptId } : u)),
        history: [...s.history, ...s.users.filter((u) => ids.includes(u.id)).map((u) => entry(deptId, `Moved ${fullName(u)} from ${fromName(s, u)}`, name))],
      }));
      setAssigning(false);
      toast(`${ids.length} moved to ${name}. Their future usage counts toward its budget.`);
    };

    const sendRequest = () => {
      setRequesting(false);
      toast('Request sent to your Optimizely account team. They\'ll follow up by email.');
    };

    const pick = (id) => {
      setWizard(null);
      setManage(null);
      setAssigning(false);
      setRequesting(false);
      setProductTab('credits');
      const unassigned = state.users.filter((u) => !u.deptId).slice(0, 6).map((u) => u.id);
      if (id === 'reset') {
        setState(freshState());
        setBatchScenario(1);
        window.dispatchEvent(new CustomEvent('hl-scenario', { detail: 'hl-reset' }));
        toast('Prototype data reset.');
      } else if (id === 'wizard') setWizard({ startStep: 0 });
      else if (id === 'wizard-over') setWizard({ startStep: 1, preset: { name: 'Marketing - EU', description: 'EU campaigns and localisation', members: unassigned, pct: '60' } });
      else if (id === 'wizard-review') setWizard({ startStep: 2, preset: { name: 'Marketing - EU', description: 'EU campaigns and localisation', members: unassigned, pct: '40' } });
      else if (id === 'assign') state.departments.length ? setAssigning(true) : toast('Add a department first.');
      else if (id.startsWith('batch-')) {
        setBatchScenario(Number(id.slice(6)));
        document.getElementById('main')?.scrollIntoView();
      } else if (id === 'request') setRequesting(true);
      else if (id === 'manage-over') state.departments.some((d) => d.id === 'eng') ? setManage({ deptId: 'eng', tab: 'usage' }) : toast('Reset the data first: Engineering was deleted.');
      else if (id === 'manage-members') state.departments.some((d) => d.id === 'mus') ? setManage({ deptId: 'mus', tab: 'members' }) : toast('Reset the data first: Marketing - US was deleted.');
      else if (id === 'manage-details') state.departments.length ? setManage({ deptId: state.departments[0].id, tab: 'details' }) : toast('There are no departments to manage.');
      else if (id.startsWith('hl-')) {
        window.dispatchEvent(new CustomEvent('hl-scenario', { detail: id }));
        document.getElementById('main')?.scrollIntoView();
      } else if (id === 'empty') {
        setState((s) => ({ ...s, departments: [], users: s.users.map((u) => ({ ...u, deptId: null, usage: { none: u.consumed } })) }));
      }
    };

    const managed = manage && state.departments.find((d) => d.id === manage.deptId);

    return (
      <div className="app">
        <a href="#main" className="skip-link">Skip to content</a>
        <TopBar navOpen={navOpen} onMenu={() => setNavOpen(!navOpen)} />
        <div className="layout">
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} onElsewhere={(label) => toast(`${label} isn't part of this prototype.`)} />
          {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}
          <main className="main" id="main">
            <h1 className="page-title">Usage &amp; Billing</h1>
            <Tabs
              idBase="product"
              label="Products"
              className="product-tabs"
              value={productTab}
              onChange={setProductTab}
              tabs={[
                { id: 'credits', label: 'Credits' },
                { id: 'cms', label: 'CMS PaaS' },
                { id: 'cmp', label: 'Content Marketing Platform' },
              ]}
            />
            <TabPanel idBase="product" id={productTab}>
              {productTab === 'credits' ? (
                <CreditsPage
                  state={state}
                  onAdd={() => setWizard({ startStep: 0 })}
                  onManage={(deptId, tab) => setManage({ deptId, tab })}
                  onRequest={() => setRequesting(true)}
                  onAssign={() => setAssigning(true)}
                  highlightId={highlightId}
                  batchScenario={batchScenario}
                />
              ) : (
                <div className="card empty empty-hero">
                  <p className="empty-title">Not part of this prototype</p>
                  <p className="empty-text">This prototype covers Opal credit management on the Credits tab.</p>
                  <Button variant="ghost" onClick={() => setProductTab('credits')}>Go to Credits</Button>
                </div>
              )}
            </TabPanel>
          </main>
        </div>

        {wizard && (
          <AddDepartmentWizard
            key={wizard.key || 'wizard'}
            users={state.users}
            departments={state.departments}
            allocated={allocated}
            pool={MOCK.POOL}
            startStep={wizard.startStep}
            preset={wizard.preset}
            onCreate={create}
            onClose={() => setWizard(null)}
            onRequestCredits={() => setRequesting(true)}
          />
        )}
        {managed && (
          <ManageDepartment
            key={managed.id}
            dept={managed}
            users={state.users}
            departments={state.departments}
            allocated={allocated}
            pool={MOCK.POOL}
            history={state.history}
            initialTab={manage.tab}
            onSave={save}
            onDelete={remove}
            onClose={() => setManage(null)}
            onRequestCredits={() => setRequesting(true)}
          />
        )}
        {assigning && (
          <AssignDrawer users={state.users} departments={state.departments} onAssign={assign} onClose={() => setAssigning(false)} />
        )}
        {requesting && (
          <RequestCreditsDialog consumed={consumedTotal} pool={MOCK.POOL} onSend={sendRequest} onClose={() => setRequesting(false)} />
        )}

        <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
        <ScenarioMenu onPick={pick} />
      </div>
    );
  }

  Object.assign(window, { TopBar, Sidebar });
  if (!window.FLOW_BOARD) ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
