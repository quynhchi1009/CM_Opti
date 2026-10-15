// Search, filter and pick people and virtual teammates for a department.
// Checking someone selects them straight away; nothing is saved until the department is created or saved.
(() => {
  const { useMemo, useState, useEffect, useId } = React;
  const PAGE = 12;

  // `initial` lets the flow board open the picker in a given state.
  function MemberPicker({ users, departments, staged, setStaged, targetDeptId = null, title = 'Members', initial = {} }) {
    const [tab, setTab] = useState(initial.tab ?? 'org');
    const [query, setQuery] = useState(initial.query ?? '');
    const [group, setGroup] = useState('all');
    const [role, setRole] = useState('all');
    const DEFAULT_DEPT = 'none';
    const [dept, setDept] = useState(initial.dept ?? DEFAULT_DEPT);
    const [page, setPage] = useState(1);
    const idBase = useId();

    const deptName = (id) => departments.find((d) => d.id === id)?.name;
    const others = departments.filter((d) => d.id !== targetDeptId);

    // People already in the target department are not candidates.
    const candidates = useMemo(() => users.filter((u) => !targetDeptId || u.deptId !== targetDeptId), [users, targetDeptId]);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      return candidates.filter((u) => {
        if (q && !(fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
        if (group !== 'all' && u.group !== group) return false;
        if (role !== 'all' && u.role !== role) return false;
        if (dept === 'none' && u.deptId && u.deptId !== targetDeptId) return false;
        if (dept !== 'none' && dept !== 'all' && u.deptId !== dept) return false;
        return true;
      });
    }, [candidates, query, group, role, dept]);

    useEffect(() => setPage(1), [query, group, role, dept]);

    const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
    const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
    const allOnPage = rows.length > 0 && rows.every((u) => staged.has(u.id));
    const filtersOn = query.trim() || group !== 'all' || role !== 'all' || dept !== DEFAULT_DEPT;

    const toggle = (id) => {
      const next = new Set(staged);
      next.has(id) ? next.delete(id) : next.add(id);
      setStaged(next);
    };
    const togglePage = () => {
      const next = new Set(staged);
      rows.forEach((u) => (allOnPage ? next.delete(u.id) : next.add(u.id)));
      setStaged(next);
    };
    const clearFilters = () => {
      setQuery('');
      setGroup('all');
      setRole('all');
      setDept(DEFAULT_DEPT);
    };

    const stagedUsers = users.filter((u) => staged.has(u.id));
    const movingFrom = stagedUsers.filter((u) => u.deptId && u.deptId !== targetDeptId);

    let moveNote = null;
    if (dept !== 'none' && dept !== 'all') {
      moveNote = `People from ${deptName(dept)} move to this department when selected. Their past usage stays with ${deptName(dept)}.`;
    } else if (dept === 'all') {
      moveNote = 'People already in another department move here when selected. Their past usage stays where it is.';
    }

    const movesSummary =
      movingFrom.length > 0 &&
      (movingFrom.length === 1
        ? `${fullName(movingFrom[0])} will move from ${deptName(movingFrom[0].deptId)}.`
        : `${movingFrom.length} people will move from other departments.`) + ' Past usage stays with their current department.';

    return (
      <section className="picker" aria-label={title}>
        <div className="section-title-row">
          <h3 className="field-group-title">{title}</h3>
          <InfoTip
            label="How moving members works"
            text="Each person or virtual teammate belongs to one department. Selecting someone who's already in another department moves them here. Their future usage counts toward this department; past usage stays with the old one."
          />
          <span className="picker-optional">Optional. You can add people later.</span>
        </div>

        <Tabs
          idBase={idBase}
          label={title}
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'org', label: 'Organization' },
            { id: 'dept', label: 'Selected', count: staged.size, countTone: staged.size ? 'lime' : '' },
          ]}
        />

        {tab === 'org' && (
          <TabPanel idBase={idBase} id="org" className="picker-panel">
            <div className="search">
              <Icon name="search" size={18} />
              <input
                className="input search-input"
                type="search"
                placeholder="Search by name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search by name or email"
              />
            </div>

            <div className="filters">
              <SelectField label="Current department" value={dept} onChange={setDept} className="wide"
                options={[
                  { value: 'none', label: 'Not in a department' },
                  { value: 'all', label: 'Any department' },
                  ...others.map((d) => ({ value: d.id, label: d.name })),
                ]} />
              <SelectField label="Group" value={group} onChange={setGroup}
                options={[{ value: 'all', label: 'All' }, ...MOCK.GROUPS.map((g) => ({ value: g, label: g })), { value: 'Virtual Teammates', label: 'Virtual Teammates' }]} />
              <SelectField label="Role" value={role} onChange={setRole}
                options={[{ value: 'all', label: 'All' }, ...MOCK.ROLES.map((r) => ({ value: r, label: r })), { value: 'Agent', label: 'Agent' }]} />
            </div>

            {moveNote && (
              <p className="note note-move">
                <Icon name="arrowRight" size={16} />
                {moveNote}
              </p>
            )}

            <div className="selection-bar" aria-live="polite">
              <span className="tabular">
                Showing <strong>{filtered.length}</strong> of {candidates.length} {candidates.length === 1 ? 'person' : 'people and virtual teammates'}
                {filtersOn && (
                  <button type="button" className="link-btn" onClick={clearFilters}>Reset filters</button>
                )}
              </span>
              {staged.size > 0 && (
                <span className="selection-count">
                  <Icon name="check" size={14} /> {staged.size} selected
                </span>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="empty">
                <p className="empty-title">No people match these filters</p>
                <p className="empty-text">Try a different search, or reset the filters.</p>
                <Button variant="ghost" size="sm" onClick={clearFilters}>Reset filters</Button>
              </div>
            ) : (
              <>
                <table className="table table-compact picker-table">
                  <thead>
                    <tr>
                      <th className="col-check">
                        <input type="checkbox" className="checkbox" checked={allOnPage} onChange={togglePage}
                          aria-label={`Select all ${rows.length} on this page`} />
                      </th>
                      <th>First name</th>
                      <th className="col-last">Last name</th>
                      <th>Email address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => {
                      const isOn = staged.has(u.id);
                      return (
                        <tr key={u.id} className={isOn ? 'is-selected' : ''} onClick={() => toggle(u.id)}>
                          <td className="col-check">
                            <input type="checkbox" className="checkbox" checked={isOn}
                              onChange={() => toggle(u.id)} onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${fullName(u)}`} />
                          </td>
                          <td>{u.first}</td>
                          <td className="col-last">{u.last || <span className="muted">–</span>}</td>
                          <td>
                            <span className="email-cell">
                              {u.email}
                              {u.type === 'vt' && <VirtualTag />}
                              {u.deptId && u.deptId !== targetDeptId && (
                                <span className="tag-dept">{isOn ? 'From ' : ''}{deptName(u.deptId)}</span>
                              )}
                            </span>
                            <Principal user={u} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Pagination page={page} pages={pages} onChange={setPage} />
              </>
            )}
          </TabPanel>
        )}

        {tab === 'dept' && (
          <TabPanel idBase={idBase} id="dept" className="picker-panel">
            {movesSummary && (
              <p className="note note-move">
                <Icon name="arrowRight" size={16} />
                {movesSummary}
              </p>
            )}
            {stagedUsers.length === 0 ? (
              <div className="empty">
                <p className="empty-title">Nobody selected yet</p>
                <p className="empty-text">Check people on the Organization tab. You can also create the department empty and add people later.</p>
                <Button variant="ghost" size="sm" onClick={() => setTab('org')}>Browse organization</Button>
              </div>
            ) : (
              <table className="table table-compact picker-table">
                <thead>
                  <tr>
                    <th>First name</th>
                    <th className="col-last">Last name</th>
                    <th>Email address</th>
                    <th className="col-action"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {stagedUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.first}</td>
                      <td className="col-last">{u.last || <span className="muted">–</span>}</td>
                      <td>
                        <span className="email-cell">
                          {u.email}
                          {u.type === 'vt' && <VirtualTag />}
                          {u.deptId && u.deptId !== targetDeptId && <span className="tag-dept">From {deptName(u.deptId)}</span>}
                        </span>
                        <Principal user={u} />
                      </td>
                      <td className="col-action">
                        <IconButton icon="x" size={18} label={`Unselect ${fullName(u)}`} onClick={() => toggle(u.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabPanel>
        )}
      </section>
    );
  }

  window.MemberPicker = MemberPicker;
})();
