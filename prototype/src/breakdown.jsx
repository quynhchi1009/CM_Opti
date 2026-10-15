// Credit usage breakdown: who and what consumed credits, by People / Agent / VT / Department / Product.
(() => {
  const { useState, useMemo, useId } = React;

  // Shares of contract-term usage that fell in each window (mock).
  const PERIODS = [
    { value: 'term', label: 'This contract term', factor: 1 },
    { value: '90', label: 'Last 90 days', factor: 0.34 },
    { value: '30', label: 'Last 30 days', factor: 0.12 },
    { value: '7', label: 'Last 7 days', factor: 0.03 },
  ];
  const LIMIT = 10;

  function Breakdown({ users, departments, initialTab = 'people' }) {
    const [tab, setTab] = useState(initialTab);
    const [period, setPeriod] = useState('term');
    const [dept, setDept] = useState('all');
    const [expanded, setExpanded] = useState(false);
    const idBase = useId();
    const factor = PERIODS.find((p) => p.value === period).factor;
    const deptName = (id) => (id ? departments.find((d) => d.id === id)?.name : 'Unallocated');

    const rows = useMemo(() => {
      const inDept = (u) => dept === 'all' || (dept === 'unallocated' ? !u.deptId : u.deptId === dept);
      let list;
      if (tab === 'people')
        list = users.filter((u) => u.type === 'person' && inDept(u)).map((u) => ({ key: u.id, name: fullName(u), sub: u.email, meta: deptName(u.deptId), value: u.consumed }));
      else if (tab === 'vt')
        list = users.filter((u) => u.type === 'vt' && inDept(u)).map((u) => ({ key: u.id, name: u.first, sub: 'Principal: ' + u.principals.join(', '), meta: deptName(u.deptId), value: u.consumed, vt: true }));
      else if (tab === 'agent')
        list = MOCK.agents.map((a) => ({ key: a.name, name: a.name, sub: a.kind, value: a.consumed }));
      else if (tab === 'product')
        list = MOCK.products.map((p) => ({ key: p.name, name: p.name, value: p.consumed }));
      else {
        list = [...departments.map((d) => ({ id: d.id, name: d.name })), { id: null, name: 'Unallocated' }].map((d) => {
          const members = users.filter((u) => u.deptId === d.id);
          return { key: d.name, name: d.name, sub: `${members.length} members`, value: deptUsage(users, d.id) };
        });
      }
      return list.map((r) => ({ ...r, value: Math.round(r.value * factor) })).sort((a, b) => b.value - a.value);
    }, [tab, period, dept, users, departments]);

    const total = rows.reduce((a, r) => a + r.value, 0);
    const max = rows.length ? rows[0].value : 0;
    const shown = expanded ? rows : rows.slice(0, LIMIT);
    const supportsDeptFilter = tab === 'people' || tab === 'vt';
    const nameHeader = { people: 'Person', vt: 'Virtual teammate', agent: 'Agent', department: 'Department', product: 'Product' }[tab];

    return (
      <section className="section" aria-labelledby="breakdown-title">
        <div className="section-head">
          <div>
            <h2 className="section-title" id="breakdown-title">Credit usage breakdown</h2>
            <p className="section-sub">See who and what is using credits. Filter by date to look at a shorter period.</p>
          </div>
        </div>

        <Tabs
          idBase={idBase}
          label="Break down usage by"
          variant="segmented"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setExpanded(false);
          }}
          tabs={[
            { id: 'people', label: 'People' },
            { id: 'agent', label: 'Agents' },
            { id: 'vt', label: 'Virtual Teammates' },
            { id: 'department', label: 'Departments' },
            { id: 'product', label: 'Products' },
          ]}
        />

        <TabPanel idBase={idBase} id={tab} className="panel">
          <div className="panel-toolbar">
            <SelectField label="Date range" value={period} onChange={setPeriod} options={PERIODS} />
            {supportsDeptFilter && (
              <SelectField
                label="Department"
                value={dept}
                onChange={setDept}
                options={[
                  { value: 'all', label: 'All departments' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                  { value: 'unallocated', label: 'Unallocated' },
                ]}
              />
            )}
            <p className="panel-total tabular">
              <strong>{fmt(total)}</strong> credits · {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="empty">
              <p className="empty-title">No usage to show</p>
              <p className="empty-text">No credits were used in this period{supportsDeptFilter && dept !== 'all' ? ' by this department' : ''}.</p>
            </div>
          ) : (
            <div className="table-scroll">
            <table className="table breakdown-table">
              <thead>
                <tr>
                  <th className="col-rank">#</th>
                  <th>{nameHeader}</th>
                  {supportsDeptFilter && <th>Department</th>}
                  <th className="col-bar">Credits consumed</th>
                  <th className="num">Share</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={r.key}>
                    <td className="col-rank muted tabular">{i + 1}</td>
                    <td>
                      <span className="cell-name">
                        {r.name}
                        {r.vt && <VirtualTag />}
                      </span>
                      {r.sub && <span className="cell-sub">{r.sub}</span>}
                    </td>
                    {supportsDeptFilter && <td className="muted">{r.meta}</td>}
                    <td className="col-bar">
                      <span className="hbar">
                        <span className="hbar-fill" style={{ width: max ? (r.value / max) * 100 + '%' : 0 }} />
                        <span className="hbar-value tabular">{fmt(r.value)}</span>
                      </span>
                    </td>
                    <td className="num tabular muted">{total ? fmtPct(pctOf(r.value, total)) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {rows.length > LIMIT && (
            <button type="button" className="link-btn view-all" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show top 10' : `Show all ${rows.length}`}
            </button>
          )}
        </TabPanel>
      </section>
    );
  }

  window.Breakdown = Breakdown;
})();
