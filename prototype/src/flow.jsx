// Flow board: the Figma canvas restructured as one ordered journey.
// Every frame renders the real prototype components in a fixed state.
(() => {
  const { useEffect, useRef, useState } = React;

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const data = () => ({ users: clone(MOCK.users), departments: clone(MOCK.departments), history: clone(MOCK.history) });
  const noop = () => {};
  const allocatedOf = (d) => d.departments.reduce((a, x) => a + x.budget, 0);
  const firstUnassigned = (d, n) => d.users.filter((u) => !u.deptId && u.type === 'person').slice(0, n).map((u) => u.id);
  const ukMember = (d) => d.users.find((u) => u.deptId === 'muk').id;

  // ---------- Frame: scales a live component to fit its column ----------

  // `focus` scrolls the frame to the region that changes in this state (a selector inside the frame).
  function Frame({ title, note, rules = [], natural = 720, kind = 'modal', clip, focus, children, wide }) {
    const ref = useRef(null);
    const inner = useRef(null);
    const [zoom, setZoom] = useState(0.5);
    const [shift, setShift] = useState(0);
    useEffect(() => {
      const el = ref.current;
      const pad = kind === 'modal' ? 32 : 0;
      const ro = new ResizeObserver(([e]) => setZoom(Math.min(1, (e.contentRect.width - pad) / natural)));
      ro.observe(el);
      return () => ro.disconnect();
    }, [natural, kind]);
    useEffect(() => {
      if (!focus) return;
      const box = inner.current;
      const target = box.querySelector(focus);
      if (!target) return;
      const delta = (target.getBoundingClientRect().top - box.getBoundingClientRect().top) / zoom;
      setShift(Math.max(0, delta - 28));
    }, [focus, zoom]);
    const pad = kind === 'modal' ? 32 : 0;
    return (
      <figure className={'frame' + (wide ? ' frame-wide' : '')}>
        <div ref={ref} className={`frame-canvas canvas-${kind}`} style={clip ? { maxHeight: clip * zoom + pad } : undefined}>
          <div className="frame-zoom" style={{ zoom, width: natural }} inert="">
            <div ref={inner} style={shift ? { marginTop: -shift } : undefined}>{children}</div>
          </div>
          {shift > 0 && <div className="frame-fade frame-fade-top" aria-hidden="true" />}
          {clip && <div className="frame-fade" aria-hidden="true" />}
        </div>
        <figcaption>
          <span className="frame-title">{title}</span>
          {note && <span className="frame-note">{note}</span>}
          {rules.length > 0 && (
            <span className="frame-rules">
              {rules.map((r) => (
                <RuleChip key={r} id={r} />
              ))}
            </span>
          )}
        </figcaption>
      </figure>
    );
  }

  function RuleChip({ id }) {
    const tone = id === 'Figma' ? 'figma' : id === 'Open' ? 'open' : id === 'PRD' ? 'prd' : 'rule';
    return <span className={'rule-chip chip-' + tone}>{id === 'Figma' ? 'Figma note' : id}</span>;
  }

  // ---------- Stage scaffolding ----------

  function Stage({ n, id, title, purpose, entry, exit, conditions, children }) {
    return (
      <section className="stage" id={id} aria-labelledby={id + '-title'}>
        <header className="stage-head">
          <span className="stage-n" aria-hidden="true">{n}</span>
          <div className="stage-intro">
            <h2 className="stage-title" id={id + '-title'}>{title}</h2>
            <p className="stage-purpose">{purpose}</p>
            <p className="stage-path">
              <span className="path-label">From</span> {entry}
              <Icon name="arrowRight" size={14} />
              <span className="path-label">To</span> {exit}
            </p>
          </div>
        </header>
        <div className="stage-body">
          <div className="stage-frames">{children}</div>
          <aside className="stage-rules" aria-label={title + ' conditions'}>
            <h3 className="rules-title">Conditions</h3>
            <ol className="rules-list">
              {conditions.map(([text, ...refs], i) => (
                <li key={i}>
                  <span className="rules-text">{text}</span>
                  <span className="rules-refs">
                    {refs.map((r) => (
                      <RuleChip key={r} id={r} />
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    );
  }

  function StatesLabel({ children }) {
    return <h3 className="states-label">{children}</h3>;
  }

  // ---------- Screens in fixed states ----------

  function PageShell({ d }) {
    return (
      <div className="app">
        <TopBar />
        <div className="layout">
          <Sidebar onElsewhere={noop} />
          <main className="main">
            <h1 className="page-title">Usage &amp; Billing</h1>
            <Tabs className="product-tabs" value="credits" onChange={noop}
              tabs={[{ id: 'credits', label: 'Credits' }, { id: 'cms', label: 'CMS PaaS' }, { id: 'cmp', label: 'Content Marketing Platform' }]} />
            <CreditsPage state={d} onAdd={noop} onManage={noop} onRequest={noop} />
          </main>
        </div>
      </div>
    );
  }

  function Wizard({ step = 0, preset }) {
    const d = data();
    return (
      <AddDepartmentWizard users={d.users} departments={d.departments} allocated={allocatedOf(d)} pool={MOCK.POOL}
        startStep={step} preset={typeof preset === 'function' ? preset(d) : preset} onCreate={noop} onClose={noop} />
    );
  }

  function Manage({ deptId, tab = 'budget', preset }) {
    const d = data();
    return (
      <ManageDepartment dept={d.departments.find((x) => x.id === deptId)} users={d.users} departments={d.departments}
        allocated={allocatedOf(d)} pool={MOCK.POOL} history={d.history} initialTab={tab}
        preset={typeof preset === 'function' ? preset(d) : preset} onSave={noop} onDelete={noop} onClose={noop} />
    );
  }

  function StateScale() {
    const rows = [
      ['ontrack', 'On track', '0–74% of budget', 1100, 2000, 'No email'],
      ['approaching', 'Approaching', '75–99%', 2800, 3500, 'Email at 75% and 90%'],
      ['over', 'Over budget', '100% and above', 1180, 1000, 'Email on crossing, then monthly'],
    ];
    return (
      <div className="state-scale">
        {rows.map(([s, label, range, used, budget, mail]) => (
          <div key={s} className="state-row">
            <div className="state-name">
              <strong>{label}</strong>
              <span className="muted">{range}</span>
            </div>
            <div className="state-bar">
              <div className="consumed-line">
                <span className="tabular consumed-value">{fmt(used)} ({fmtPct(Math.round(pctOf(used, budget)))})</span>
                <span className={'tabular consumed-left' + (s === 'over' ? ' is-over' : '')}>
                  {used > budget ? `${fmt(used - budget)} over` : `${fmt(budget - used)} left`}
                </span>
              </div>
              <UsageBar consumed={used} budget={budget} status={s} thin />
            </div>
            <div className="state-badge"><StatusBadge status={s} /></div>
            <div className="state-mail muted">{mail}</div>
          </div>
        ))}
      </div>
    );
  }

  // ---------- Journey ----------

  const STAGES = [
    { id: 'overview', label: 'Credits overview' },
    { id: 'members', label: 'Department and members' },
    { id: 'budget', label: 'Set budget' },
    { id: 'review', label: 'Review and create' },
    { id: 'manage', label: 'Manage department' },
    { id: 'breakdown', label: 'Usage breakdown' },
    { id: 'open', label: 'Open questions' },
  ];

  function Journey() {
    const [active, setActive] = useState(STAGES[0].id);
    useEffect(() => {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
        { rootMargin: '-35% 0px -60% 0px' },
      );
      STAGES.forEach((s) => {
        const el = document.getElementById(s.id);
        el && io.observe(el);
      });
      return () => io.disconnect();
    }, []);
    const idx = STAGES.findIndex((s) => s.id === active);
    return (
      <nav className="journey" aria-label="Flow">
        <ol>
          {STAGES.map((s, i) => (
            <li key={s.id} className={i < idx ? 'is-past' : i === idx ? 'is-current' : ''}>
              <a href={'#' + s.id} aria-current={i === idx ? 'step' : undefined}>
                <span className="journey-dot">{s.id === 'open' ? '?' : i + 1}</span>
                <span className="journey-label">{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  function Board() {
    return (
      <div className="board">
        <header className="board-head">
          <p className="board-path">Admin Center <Icon name="chevronRight" size={14} /> Usage &amp; Billing <Icon name="chevronRight" size={14} /> Credits</p>
          <h1 className="board-title">Opal credit management: V1 flow</h1>
          <p className="board-lede">
            Admins split the organization's credit pool into soft department budgets, then watch usage against them.
            Nothing is ever blocked in V1. Read top to bottom: each step shows the screen, its states, and the rules
            that drive them.
          </p>
          <dl className="board-meta">
            <div><dt>Design</dt><dd>Thuan Nguyen</dd></div>
            <div><dt>PM</dt><dd>Afia Chowdhury</dd></div>
            <div><dt>Money PM</dt><dd>Sarah Mitchell</dd></div>
            <div><dt>Status</dt><dd>Working draft · V1</dd></div>
          </dl>
          <div className="legend">
            <span><RuleChip id="R5" /> Allocation rules doc</span>
            <span><RuleChip id="PRD" /> V1 PRD</span>
            <span><RuleChip id="Figma" /> Conditions note in Figma (paraphrased)</span>
            <span><RuleChip id="Open" /> Not decided yet</span>
            <a className="legend-live link-btn" href="index.html"><Icon name="layers" size={14} /> Frames use the real components. Open the clickable prototype</a>
          </div>
        </header>

        <Journey />

        <Stage n={1} id="overview" title="Credits overview"
          purpose="The admin sees the org pool, how it's split across departments, and which departments need attention."
          entry="Settings › Usage & Billing" exit="Add department budget, or Manage on a row"
          conditions={[
            ['Org summary shows consumed vs contracted, credits remaining, expiry, and allocated vs available to allocate.', 'PRD'],
            ['Each department shows one of three states. The bar stops at full; the numbers never cap (1,180 · 118%).', 'Rules B'],
            ['Unallocated is always listed. It holds unassigned people, agents and all usage from before departments existed.', 'Rules 5'],
            ['Rows expand to the top consumers; "View all" opens Manage › Members. Columns sort; the table exports to CSV.', 'PRD'],
            ['Usage data lags about 6 hours today, so the page says when the numbers are from ("Usage as of …"), not "just now".', 'PRD', 'Open'],
            ['Unallocated people and agents get a nudge and an Assign action that moves them into an existing department.', 'Rules 5'],
            ['Every state has a text badge (ON TRACK / APPROACHING / OVER BUDGET), so status never relies on colour.', 'Rules B'],
          ]}>
          <Frame title="Credits tab" note="Default: Marketing - US expanded" natural={1440} kind="page" clip={1500} wide>
            <PageShell d={data()} />
          </Frame>
          <StatesLabel>Department states</StatesLabel>
          <Frame title="Display states" note="Thresholds, badge and email per state" natural={900} kind="spec" rules={['Rules B', 'R8']} wide>
            <StateScale />
          </Frame>
          <StatesLabel>Empty</StatesLabel>
          <Frame title="No departments yet" note="First visit, before any budget exists" natural={1440} kind="page" clip={1150} wide>
            <PageShell d={(() => { const d = data(); d.departments = []; d.users.forEach((u) => { u.deptId = null; u.usage = { none: u.consumed }; }); return d; })()} />
          </Frame>
        </Stage>

        <Stage n={2} id="members" title="Department and members"
          purpose="Step 1 of the wizard. Name the department and stage the people and virtual teammates who belong to it."
          entry="Add department budget" exit="Continue to Set budget"
          conditions={[
            ['Name is required and must be unique. Continue stays clickable and points to what is missing.', 'R1', 'Figma'],
            ['A department contact is optional at creation and receives this department\'s alerts.', 'Rules', 'Open'],
            ['Close (X): if anything was entered, ask "Leave this flow?". Otherwise close straight away.', 'Figma'],
            ['One person or agent belongs to one department. Adding someone from another department moves them; past usage stays behind.', 'R2'],
            ['Virtual teammates are individual members and always show their Principal(s).', 'R3'],
            ['A department can be created with no members.', 'R4'],
            ['The list defaults to "Not in a department". Picking a department in the filter explains the move before anyone is added.', 'Figma'],
            ['Checking someone selects them straight away; there is no separate "add" step to forget. Nothing is saved until Create department.', 'R10'],
          ]}>
          <Frame title="Default" note="Empty form, organization members tab" rules={['R1']}>
            <Wizard />
          </Frame>
          <StatesLabel>States</StatesLabel>
          <div className="frame-grid">
            <Frame title="Name missing" note="After Continue or leaving the field" rules={['R1']} clip={760}>
              <Wizard preset={{ touched: true }} />
            </Frame>
            <Frame title="People selected" note="Checked people are selected straight away" clip={640} focus=".picker .selection-bar">
              <Wizard preset={(d) => ({ name: 'Marketing - EU', picker: { selected: firstUnassigned(d, 3) } })} />
            </Frame>
            <Frame title="Moving from another department" note="Filter set to Marketing - UK" rules={['R2']} clip={640} focus=".picker .search">
              <Wizard preset={(d) => ({ name: 'Marketing - EU', picker: { dept: 'muk', selected: [ukMember(d)] } })} />
            </Frame>
            <Frame title="No matches" note="Search or filters return nothing" rules={['Figma']} clip={640} focus=".picker .search">
              <Wizard preset={{ name: 'Marketing - EU', picker: { query: 'xyz' } }} />
            </Frame>
            <Frame title="Selected" note="Selected members, one moving from Marketing - UK" rules={['R2', 'R3']} clip={640} focus=".picker .tabs">
              <Wizard preset={(d) => ({ name: 'Marketing - EU', members: [...firstUnassigned(d, 3), ukMember(d), 'vt4'], picker: { tab: 'dept' } })} />
            </Frame>
            <Frame title="Leave without creating?" note="Close (X) after entering something; Keep editing has focus" rules={['Figma']} clip={760}>
              <Wizard preset={{ name: 'Marketing - EU', confirmLeave: true }} />
            </Frame>
          </div>
        </Stage>

        <Stage n={3} id="budget" title="Set budget"
          purpose="Step 2. Give the department a share of the org pool. The slider shows what is still free, so over-allocating is hard by accident."
          entry="Continue from step 1" exit="Continue to Review, or Back"
          conditions={[
            ['Budget is required. Enter credits or a %; the two stay in sync and the budget is kept as a % of the org total.', 'R6', 'PRD', 'Open'],
            ['Default is 10% (Figma). The PRD proposes 25%.', 'Figma', 'Open'],
            ['The slider stops at "available to allocate". Typing more shows an error and blocks Continue.', 'R5', 'I2'],
            ['0 or empty shows "Enter a budget above 0 credits" when Continue is pressed.', 'Figma'],
            ['Alerts at 75%, 90% and 100%, by email to Super Admins, Billing Admins, the CSM and the department contact. Nothing is blocked at any threshold.', 'R7', 'R8', 'R9'],
            ['Because budgets are a %, their credit amount changes when allotments start or expire.', 'Rules 7'],
          ]}>
          <Frame title="Default" note="10% of 15,000 = 1,500 credits; 7,000 available" rules={['R5', 'R6']}>
            <Wizard step={1} preset={{ name: 'Marketing - EU' }} />
          </Frame>
          <StatesLabel>States</StatesLabel>
          <div className="frame-grid">
            <Frame title="Empty" note="Error shown after Continue" rules={['Figma']}>
              <Wizard step={1} preset={{ name: 'Marketing - EU', pct: '' }} />
            </Frame>
            <Frame title="More than available" note="60% asked, 46.7% free" rules={['R5', 'I2']}>
              <Wizard step={1} preset={{ name: 'Marketing - EU', pct: '60' }} />
            </Frame>
          </div>
        </Stage>

        <Stage n={4} id="review" title="Review and create"
          purpose="Step 3. One last look at everything that will change, with a way back to each step."
          entry="Continue from step 2" exit="Create department, then back to the overview with a confirmation"
          conditions={[
            ['Nothing changes until Create department. Then members move, the budget is taken from available, and alerts are set up.', 'R10'],
            ['Edit returns to that step with entries kept. Back goes to the previous step.', 'Figma'],
            ['"40% of your 15,000 contracted credits · 1,000 left to allocate after this". The % is budget ÷ contracted, rounded to a whole number.', 'Figma'],
            ['Anyone moving from another department is called out again before creating.', 'R2'],
            ['Creating writes to the history log.', 'H1', 'H3'],
          ]}>
          <Frame title="Review" note="6,000 credits, 4 members, one moving" rules={['R10']}>
            <Wizard step={2} preset={(d) => ({ name: 'Marketing - EU', description: 'EU campaigns and localisation', pct: '40', members: [...firstUnassigned(d, 3), ukMember(d)] })} />
          </Frame>
          <StatesLabel>States</StatesLabel>
          <div className="frame-grid">
            <Frame title="No members" note="Allowed; people can be added later" rules={['R4']}>
              <Wizard step={2} preset={{ name: 'Marketing - EU', pct: '20' }} />
            </Frame>
          </div>
        </Stage>

        <Stage n={5} id="manage" title="Manage department"
          purpose="Change a department's budget, members and details after it exists. Edits are staged and saved together."
          entry="Manage on a department row" exit="Save changes, or Delete"
          conditions={[
            ['Side drawer with three tabs: Credit Usage, Members, Department Details. Tabs with unsaved edits are marked, and every pending change is listed above Save.', 'PRD', 'Figma'],
            ['Raising a budget within available saves. Beyond available is blocked with the same error as the wizard.', 'I1', 'I2'],
            ['On an over-budget department: raising past usage clears the overage; a smaller raise warns it is still over.', 'I3', 'I4'],
            ['Lowering below usage is allowed with a warning, and Save asks to confirm with old → new values.', 'D2'],
            ['Moving a member to Unallocated is staged in the list with Undo. Credits they already used stay here.', 'R2', 'Figma'],
            ['Alert recipients: Super Admins, Billing Admins and CSM are fixed; admins add more, never the same person twice.', 'R9'],
            ['Deleting asks first. Members move to Unallocated and the budget goes back to available.', 'PRD', 'Open'],
            ['Every change is logged: created, budget changes, member moves, credit purchases.', 'H1', 'H2', 'H3', 'H4'],
          ]}>
          <Frame title="Credit Usage" note="Marketing - US, approaching (80%)" rules={['Rules B']} natural={760}>
            <Manage deptId="mus" />
          </Frame>
          <StatesLabel>Budget states</StatesLabel>
          <div className="frame-grid">
            <Frame title="Over budget" note="Engineering, 1,180 of 1,000" rules={['Rules B']} natural={760} clip={900}>
              <Manage deptId="eng" />
            </Frame>
            <Frame title="Raise, still over" note="Engineering raised to 7.5%" rules={['I4']} natural={760} clip={640} focus=".manage-panel > .field-group">
              <Manage deptId="eng" preset={{ pct: '7.5' }} />
            </Frame>
            <Frame title="Lower below usage" note="Marketing - US lowered to 15%" rules={['D2']} natural={760} clip={640} focus=".manage-panel > .field-group">
              <Manage deptId="mus" preset={{ pct: '15' }} />
            </Frame>
          </div>
          <StatesLabel>Members and details</StatesLabel>
          <div className="frame-grid">
            <Frame title="Members" note="Agents show their Principal(s)" rules={['R3']} natural={760} clip={1000}>
              <Manage deptId="mus" tab="members" />
            </Frame>
            <Frame title="Moving a member out" note="Staged with Undo; moves to Unallocated on save" rules={['R2']} natural={760} clip={1000}>
              <Manage deptId="mus" tab="members" preset={{ confirmRemove: 'vt1' }} />
            </Frame>
            <Frame title="Department Details" note="Rename, contact, alert recipients, delete" natural={760}>
              <Manage deptId="mus" tab="details" />
            </Frame>
            <Frame title="Delete department?" note="Members to Unallocated, budget returned" rules={['Open']} natural={760}>
              <Manage deptId="mus" tab="details" preset={{ confirmDelete: true }} />
            </Frame>
          </div>
        </Stage>

        <Stage n={6} id="breakdown" title="Usage breakdown"
          purpose="Below the department table: who and what is using credits, for chargeback and follow-up."
          entry="Credits overview" exit="Manage a department, or adjust budgets"
          conditions={[
            ['Five views: People, Agents, Virtual Teammates, Departments, Products. Every view adds up to org consumption.', 'PRD'],
            ['Date range narrows the period. Department filter applies to People and Virtual Teammates.', 'Figma'],
            ['Pacing (usage vs budget over time) is Phase 2.', 'PRD'],
          ]}>
          <Frame title="People" note="Ranked by credits, contract term" natural={1100} kind="page" wide>
            <div className="frame-pad"><Breakdown users={data().users} departments={data().departments} /></div>
          </Frame>
          <StatesLabel>Other views</StatesLabel>
          <div className="frame-grid">
            {[['agent', 'Agent'], ['vt', 'Virtual Teammates'], ['department', 'Department'], ['product', 'Product']].map(([id, label]) => (
              <Frame key={id} title={label} natural={1100} kind="page">
                <div className="frame-pad"><Breakdown users={data().users} departments={data().departments} initialTab={id} /></div>
              </Frame>
            ))}
          </div>
        </Stage>

        <section className="stage stage-open" id="open" aria-labelledby="open-title">
          <header className="stage-head">
            <span className="stage-n" aria-hidden="true">?</span>
            <div className="stage-intro">
              <h2 className="stage-title" id="open-title">Open questions</h2>
              <p className="stage-purpose">Decisions the flow depends on that aren't settled yet.</p>
            </div>
          </header>
          <div className="open-grid">
            <div>
              <h3 className="rules-title">From the PRD and rules doc</h3>
              <ul className="open-list">
                <li>What happens commercially when the whole org pool runs out?</li>
                <li>Does a deleted department's history stay read-only, or do its credits go back to Unallocated?</li>
                <li>Default budget: 10% (Figma) or 25% (PRD)?</li>
                <li>Can a budget also be set as a fixed credit amount, not only a %? The prototype lets admins type either but keeps a %.</li>
                <li>Does "Stop new usage" appear in the UI at all in V1?</li>
                <li>How are automated workflows attributed? Assumed: whoever set the schedule.</li>
                <li>Who gets alerts for agents with several Principals?</li>
                <li>Department or Team? UI uses Department; Team collides with CMP Teams.</li>
              </ul>
            </div>
            <div>
              <h3 className="rules-title">Where Figma and the rules disagree</h3>
              <ul className="open-list">
                <li>Marketing - US at 80% is drawn green in Figma; the rules make 75–99% amber. Board follows the rules.</li>
                <li>The rules require a department contact at creation (name + email); no Figma frame has the field. The prototype adds it to step 1 as optional.</li>
                <li>PRD lists a Virtual Teammates usage section on the page; Figma covers it only as a breakdown tab.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<Board />);
})();
