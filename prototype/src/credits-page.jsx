// Usage & Billing → Credits: org summary, credit budget by department, usage breakdown, allocation history.
(() => {
  const { useState, useEffect, useRef } = React;

  function OrgSummary({ consumed, pool, allocated, onRequest }) {
    const status = statusOf(consumed, pool);
    const usedPct = pctOf(consumed, pool);
    return (
      <section className="section" aria-labelledby="org-title">
        <div className="section-head">
          <h2 className="section-title" id="org-title">Organization Credit Summary</h2>
        </div>
        <div className="card org-card">
          <div className="org-top">
            <p className="org-label">Consumed this contract term</p>
            <Button variant="secondary" size="sm" icon="plus" onClick={onRequest}>Request credits</Button>
          </div>
          <div className="org-figure">
            <span className="org-number tabular">{fmt(consumed)}</span>
            <span className="org-of tabular">of {fmt(pool)} contracted</span>
            <span className="org-pct tabular">· {fmtPct(Math.round(usedPct))} used</span>
            <StatusBadge status={status} />
          </div>
          <UsageBar consumed={consumed} budget={pool} status={status} />
          <div className="org-row">
            <span className="tabular">
              {consumed <= pool ? `${fmt(pool - consumed)} credits remaining` : `${fmt(consumed - pool)} credits over the contracted amount`}
            </span>
            <span>Expires {MOCK.CONTRACT.expires}</span>
          </div>
          <div className="org-alloc">
            <div className="alloc-item">
              <span className="alloc-label">Budgeted to departments</span>
              <span className="alloc-value tabular">{fmt(allocated)} <span className="muted">({fmtPct(pctOf(allocated, pool))})</span></span>
            </div>
            <div className="alloc-item">
              <span className="alloc-label">
                Available to allocate
                <InfoTip
                  label="About available to allocate"
                  text="Credits not yet given to any department as a budget. It only changes when you set or change a budget. It isn't the same as credits remaining, which is what's left to use."
                />
              </span>
              <span className="alloc-value tabular">{fmt(pool - allocated)}</span>
            </div>
          </div>
          <p className="org-updated">
            <UsageAsOf />
            <InfoTip label="About usage timing" text={FRESHNESS_HELP} />
          </p>
        </div>
      </section>
    );
  }

  // Top consumers include people who have since moved: their past usage stays with this department.
  function ConsumerRows({ deptId, users, members, consumed, onViewAll, viewAllLabel }) {
    const top = users
      .map((u) => ({ ...u, here: usageIn(u, deptId), gone: u.deptId !== deptId }))
      .filter((u) => u.here > 0)
      .sort((a, b) => b.here - a.here)
      .slice(0, 4);
    return (
      <tr className="consumers-row">
        <td className="hide-sm" />
        <td colSpan={6} className="consumers-cell">
          <table className="table consumers">
            <thead>
              <tr>
                <th>Top consumers</th>
                <th className="num">Consumed</th>
                <th className="num">% of department</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">{members.length ? 'No usage yet.' : 'No members yet.'}</td>
                </tr>
              )}
              {top.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="email-cell">
                      {u.email}
                      {u.type === 'vt' && <VirtualTag />}
                      {u.gone && <span className="tag-dept">Moved out</span>}
                    </span>
                    <Principal user={u} />
                  </td>
                  <td className="num tabular">{fmt(u.here)}</td>
                  <td className="num tabular">{consumed ? fmtPct(Math.round(pctOf(u.here, consumed))) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length > 0 && (
            <button type="button" className="link-btn view-all" onClick={onViewAll}>
              {viewAllLabel}
            </button>
          )}
        </td>
      </tr>
    );
  }

  const SORTS = {
    name: (a, b) => a.name.localeCompare(b.name),
    members: (a, b) => a.members.length - b.members.length,
    budget: (a, b) => a.budget - b.budget,
    consumed: (a, b) => pctOf(a.consumed, a.budget) - pctOf(b.consumed, b.budget),
    share: (a, b) => a.consumed - b.consumed,
  };

  function SortHeader({ id, label, sort, setSort, className = '' }) {
    const active = sort.key === id;
    const dir = active ? sort.dir : null;
    return (
      <th className={className} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
        <button
          type="button"
          className={'sort-btn' + (active ? ' is-active' : '')}
          onClick={() => setSort({ key: id, dir: active && dir === 'desc' ? 'asc' : 'desc' })}
        >
          {label}
          <Icon name={active ? (dir === 'asc' ? 'sortUp' : 'sortDown') : 'sort'} size={14} />
        </button>
      </th>
    );
  }

  const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

  function exportCsv(rows, orgConsumed) {
    const header = ['Department', 'People', 'Virtual teammates', 'Budget (credits)', 'Consumed (credits)', '% of budget', 'Status', '% of org usage'];
    const lines = rows.map((d) => {
      const vts = d.members.filter((u) => u.type === 'vt').length;
      return [
        d.name,
        d.members.length - vts,
        vts,
        d.isUnallocated ? '' : d.budget,
        d.consumed,
        d.isUnallocated ? '' : Math.round(pctOf(d.consumed, d.budget)),
        d.isUnallocated ? '' : STATUS_LABEL[d.status],
        Math.round(pctOf(d.consumed, orgConsumed)),
      ];
    });
    const csv = [header, ...lines].map((l) => l.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `opal-credits-by-department-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function DepartmentTable({ departments, users, orgConsumed, allocated, pool, onAdd, onManage, onAssign, highlightId }) {
    const [open, setOpen] = useState(new Set());
    const [sort, setSort] = useState({ key: null, dir: 'desc' });
    const [flashId, setFlashId] = useState(null);
    const [cycle, setCycle] = useState({ over: -1, near: -1 });
    const [announce, setAnnounce] = useState('');
    const tableRef = useRef(null);
    const toggle = (id) => {
      const next = new Set(open);
      next.has(id) ? next.delete(id) : next.add(id);
      setOpen(next);
    };

    // A newly created department opens, scrolls into view and is briefly highlighted.
    useEffect(() => {
      if (!highlightId) return;
      if (deptUsage(users, highlightId) > 0) setOpen((o) => new Set([...o, highlightId]));
      // Runs after the wizard hands focus back, then moves focus to the new row's Manage link.
      const t = setTimeout(() => {
        const row = tableRef.current?.querySelector(`[data-dept="${highlightId}"]`);
        if (!row) return;
        row.scrollIntoView({ block: 'center' });
        row.querySelector('.col-action .link-btn')?.focus({ preventScroll: true });
      }, 60);
      return () => clearTimeout(t);
    }, [highlightId]);

    const withStats = (d) => {
      const members = users.filter((u) => (d.isUnallocated ? !u.deptId : u.deptId === d.id));
      const consumed = deptUsage(users, d.isUnallocated ? null : d.id);
      return { ...d, members, consumed, status: d.isUnallocated ? 'none' : statusOf(consumed, d.budget) };
    };
    let rows = departments.map((d) => withStats({ ...d, isUnallocated: false }));
    if (sort.key) {
      rows = [...rows].sort(SORTS[sort.key]);
      if (sort.dir === 'desc') rows.reverse();
    }
    // Unallocated always sits last, whatever the sort.
    const unallocated = withStats({ id: '__unallocated', name: 'Unallocated', description: 'People and agents not in a department', budget: 0, isUnallocated: true });
    rows.push(unallocated);

    const unassignedCount = unallocated.members.length;
    const overRows = rows.filter((d) => d.status === 'over');
    const nearRows = rows.filter((d) => d.status === 'approaching');

    // Chips jump to the first department in that state and flash it briefly.
    // Each click moves to the next department in that state and wraps around.
    const jumpTo = (list, key) => {
      if (!list.length) return;
      const idx = (cycle[key] + 1) % list.length;
      setCycle((c) => ({ ...c, [key]: idx }));
      const target = list[idx];
      setAnnounce(`${target.name}, ${idx + 1} of ${list.length}`);
      const row = tableRef.current?.querySelector(`[data-dept="${target.id}"]`);
      row?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      row?.querySelector('.col-action .link-btn')?.focus({ preventScroll: true });
      setFlashId(target.id);
      setTimeout(() => setFlashId((f) => (f === target.id ? null : f)), 2400);
    };

    return (
      <section className="section" aria-labelledby="dept-title">
        <div className="section-head">
          <div>
            <h2 className="section-title" id="dept-title">Credit budget by department</h2>
            <p className="section-sub">Soft budgets for tracking and alerts. Usage is never blocked.</p>
            {departments.length > 0 && (
              <p className="rollup" aria-label="Department status summary">
                {overRows.length + nearRows.length === 0 ? (
                  <span className="rollup-ok"><Icon name="checkCircle" size={16} /> All departments are on track</span>
                ) : (
                  <>
                    {overRows.length > 0 && (
                      <button type="button" className="rollup-chip is-over" onClick={() => jumpTo(overRows, 'over')}>
                        <span className="rollup-dot" aria-hidden="true" />
                        {overRows.length} over budget
                        {overRows.length > 1 && cycle.over >= 0 && <span className="rollup-pos tabular">{cycle.over + 1}/{overRows.length}</span>}
                      </button>
                    )}
                    {nearRows.length > 0 && (
                      <button type="button" className="rollup-chip is-near" onClick={() => jumpTo(nearRows, 'near')}>
                        <span className="rollup-dot" aria-hidden="true" />
                        {nearRows.length} approaching
                        {nearRows.length > 1 && cycle.near >= 0 && <span className="rollup-pos tabular">{cycle.near + 1}/{nearRows.length}</span>}
                      </button>
                    )}
                    <span className="rollup-note">Usage continues either way.</span>
                  </>
                )}
                <span className="sr-only" role="status" aria-live="polite">{announce}</span>
              </p>
            )}
          </div>
          {departments.length > 0 && (
            <div className="section-actions">
              <Button variant="ghost" size="sm" icon="download" onClick={() => exportCsv(rows, orgConsumed)}>Export CSV</Button>
              <Button variant="primary" icon="plus" onClick={onAdd}>Add department budget</Button>
            </div>
          )}
        </div>

        {departments.length === 0 && (
          <div className="card empty empty-hero">
            <p className="empty-title">No department budgets yet</p>
            <p className="empty-text">
              Split your {fmt(pool)} credits across departments to see who uses what and get an email before anyone
              runs over. Usage is never blocked.
            </p>
            <Button variant="primary" icon="plus" onClick={onAdd}>Add department budget</Button>
          </div>
        )}

        {departments.length > 0 && unassignedCount > 0 && (
          <div className="nudge">
            <Icon name="users" size={18} />
            <p>
              <strong>{unassignedCount} people and agents aren't in a department.</strong>{' '}
              Their future usage won't count toward any budget.
            </p>
            <button type="button" className="link-btn" onClick={onAssign}>Assign to departments</button>
          </div>
        )}

        <div className="card table-card table-scroll" ref={tableRef}>
          <table className="table dept-table">
            <thead>
              <tr>
                <th className="col-toggle"><span className="sr-only">Expand</span></th>
                <SortHeader id="name" label="Department" sort={sort} setSort={setSort} />
                <SortHeader id="members" label="Members" sort={sort} setSort={setSort} className="num hide-sm" />
                <SortHeader id="budget" label="Budget" sort={sort} setSort={setSort} className="num hide-sm" />
                <SortHeader id="consumed" label="Consumed" sort={sort} setSort={setSort} className="col-consumed" />
                <SortHeader id="share" label="% of org usage" sort={sort} setSort={setSort} className="num hide-sm col-share" />
                <th className="col-action"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const isOpen = open.has(d.id);
                const pct = d.budget ? pctOf(d.consumed, d.budget) : 0;
                const share = fmtPct(Math.round(pctOf(d.consumed, orgConsumed)));
                return (
                  <React.Fragment key={d.id}>
                    <tr
                      data-dept={d.id}
                      className={'dept-row' + (isOpen ? ' is-open' : '') + (d.isUnallocated ? ' is-unallocated' : '') + (d.id === highlightId ? ' is-new' : '') + (d.id === flashId ? ' is-flash' : '')}
                    >
                      <td className="col-toggle">
                        <button
                          type="button"
                          className="icon-btn chevron"
                          aria-expanded={isOpen}
                          aria-label={(isOpen ? 'Hide' : 'Show') + ' top consumers in ' + d.name}
                          onClick={() => toggle(d.id)}
                        >
                          <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={18} />
                        </button>
                      </td>
                      <td className="col-name">
                        <span className="cell-name">
                          {d.name}
                          {d.id === highlightId && <span className="tag-added">New</span>}
                          {!d.isUnallocated && !d.contact && <span className="tag-dept">No contact</span>}
                        </span>
                        <span className="cell-sub">{d.description}</span>
                        <span className="cell-meta tabular">
                          {d.members.length} members{d.isUnallocated ? '' : ` · ${fmt(d.budget)} budget`} · {share} of org usage
                        </span>
                      </td>
                      <td className="num tabular hide-sm">{d.members.length}</td>
                      <td className="num tabular hide-sm">{d.isUnallocated ? <span className="muted">No budget</span> : fmt(d.budget)}</td>
                      <td className="col-consumed">
                        {d.isUnallocated ? (
                          <span className="tabular">{fmt(d.consumed)} <span className="muted small">incl. usage from before departments</span></span>
                        ) : (
                          <div className="consumed-cell">
                            <div className="consumed-line">
                              <span className="tabular consumed-value">
                                {fmt(d.consumed)} <span className="consumed-pct">({fmtPct(Math.round(pct))})</span>
                              </span>
                              <span className={'tabular consumed-left' + (d.status === 'over' ? ' is-over' : '')}>
                                {d.consumed > d.budget ? `${fmt(d.consumed - d.budget)} over` : `${fmt(d.budget - d.consumed)} left`}
                              </span>
                            </div>
                            <UsageBar consumed={d.consumed} budget={d.budget} status={d.status} thin />
                            <StatusBadge status={d.status} />
                          </div>
                        )}
                      </td>
                      <td className="num tabular hide-sm col-share">{share}</td>
                      <td className="col-action">
                        {d.isUnallocated ? (
                          <button type="button" className="link-btn" onClick={onAssign} disabled={!departments.length}>
                            Assign<span className="sr-only"> people from Unallocated</span>
                          </button>
                        ) : (
                          <button type="button" className="link-btn" onClick={() => onManage(d.id, 'usage')}>
                            Manage<span className="sr-only"> {d.name}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <ConsumerRows
                        deptId={d.isUnallocated ? null : d.id}
                        users={users}
                        members={d.members}
                        consumed={d.consumed}
                        viewAllLabel={d.isUnallocated ? `Assign these ${d.members.length}` : `View all ${d.members.length} members`}
                        onViewAll={() => (d.isUnallocated ? onAssign() : onManage(d.id, 'members'))}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="hide-sm" />
                <td>Total</td>
                <td className="num tabular hide-sm">{users.length}</td>
                <td className="num tabular hide-sm">
                  {fmt(allocated)}
                  <span className="foot-sub">{fmt(pool - allocated)} available to allocate</span>
                </td>
                <td className="col-consumed tabular">
                  {fmt(orgConsumed)} <span className="muted">of {fmt(pool)} contracted</span>
                </td>
                <td className="num tabular hide-sm col-share">100%</td>
                <td className="hide-sm" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    );
  }

  // Org-wide, read-only log: department changes, member moves, purchases. Deleted departments keep their name.
  function AllocationHistory({ history, departments }) {
    const [showAll, setShowAll] = useState(false);
    const label = (h) => departments.find((d) => d.id === h.deptId)?.name || h.deptName || 'Organization';
    const list = newestFirst(history);
    const shown = showAll ? list : list.slice(0, 6);
    return (
      <section className="section" aria-labelledby="history-title">
        <div className="section-head">
          <div>
            <h2 className="section-title" id="history-title">Allocation history</h2>
            <p className="section-sub">Every budget change, member move and credit purchase. Read-only.</p>
          </div>
        </div>
        <div className="card history-card">
          <ol className="history">
            {shown.map((h) => (
              <li key={h.id}>
                <span className="history-scope">{label(h)}</span>
                <span className="history-text">{h.text}</span>
                <span className="history-meta">{h.when} · {h.actor}</span>
              </li>
            ))}
          </ol>
          {list.length > 6 && (
            <button type="button" className="link-btn view-all" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show recent only' : `Show all ${list.length}`}
            </button>
          )}
        </div>
      </section>
    );
  }

  function CreditsPage({ state, onAdd, onManage, onRequest, onAssign = () => {}, highlightId }) {
    const { users, departments } = state;
    const consumed = users.reduce((a, u) => a + u.consumed, 0);
    const allocated = departments.reduce((a, d) => a + d.budget, 0);
    return (
      <>
        <OrgSummary consumed={consumed} pool={MOCK.POOL} allocated={allocated} onRequest={onRequest} />
        <DepartmentTable
          departments={departments}
          users={users}
          orgConsumed={consumed}
          allocated={allocated}
          pool={MOCK.POOL}
          onAdd={onAdd}
          onManage={onManage}
          onAssign={onAssign}
          highlightId={highlightId}
        />
        <Breakdown users={users} departments={departments} />
        {state.history && <AllocationHistory history={state.history} departments={departments} />}
      </>
    );
  }

  window.CreditsPage = CreditsPage;
})();
