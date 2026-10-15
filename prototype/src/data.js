// Mock data for the Opal credit management prototype.
// All people, emails and numbers are placeholders.
(function () {
  const POOL = 15000;

  const CURRENT_ADMIN = { name: 'Alex Zhou', initials: 'AZ', role: 'Super Admin' };

  const GROUPS = ['Content Studio', 'Brand', 'Web Ops', 'Analytics', 'Leadership'];
  const ROLES = ['Super Admin', 'Billing Admin', 'Admin', 'User'];

  // Seeded random so the mock data is stable between reloads.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const people = [
    // Marketing - US (10 people + 2 virtual teammates)
    ['Emma', 'Williams', 'mus'], ['Sophia', 'Johnson', 'mus'], ['Bill', 'Perez', 'mus'],
    ['Isabella', 'Garcia', 'mus'], ['Olivia', 'Jones', 'mus'], ['Charlotte', 'Martinez', 'mus'],
    ['Amelia', 'Davis', 'mus'], ['Mia', 'Rodriguez', 'mus'], ['Harper', 'Lee', 'mus'],
    ['Evelyn', 'Clark', 'mus'],
    // Marketing - UK
    ['Oliver', 'Hughes', 'muk'], ['George', 'Patel', 'muk'], ['Freya', 'Walsh', 'muk'],
    ['Arthur', 'Bennett', 'muk'], ['Poppy', 'Shaw', 'muk'], ['Isla', 'Murray', 'muk'],
    ['Theo', 'Grant', 'muk'],
    // Product
    ['Noah', 'Kim', 'prod'], ['Liam', 'Nguyen', 'prod'], ['Ava', 'Chen', 'prod'],
    ['Lucas', 'Silva', 'prod'], ['Ella', 'Brooks', 'prod'], ['Mason', 'Ward', 'prod'],
    ['Zoe', 'Price', 'prod'], ['Leo', 'Foster', 'prod'], ['Ruby', 'Hayes', 'prod'],
    // Engineering
    ['Ethan', 'Park', 'eng'], ['Aiden', 'Ross', 'eng'], ['Chloe', 'Reed', 'eng'],
    ['Jack', 'Cole', 'eng'], ['Nora', 'Bell', 'eng'], ['Owen', 'Diaz', 'eng'],
    // Not in a department
    ['Grace', 'Turner', null], ['Henry', 'Scott', null], ['Lily', 'Adams', null],
    ['Samuel', 'Baker', null], ['Hannah', 'Nelson', null], ['Daniel', 'Carter', null],
    ['Aria', 'Mitchell', null], ['Jacob', 'Roberts', null], ['Layla', 'Phillips', null],
    ['Wyatt', 'Campbell', null], ['Scarlett', 'Parker', null], ['Logan', 'Evans', null],
    ['Victoria', 'Edwards', null], ['Gabriel', 'Collins', null], ['Penelope', 'Stewart', null],
    ['Julian', 'Morris', null], ['Stella', 'Rogers', null], ['Levi', 'Cook', null],
    ['Hazel', 'Morgan', null], ['Isaac', 'Bailey', null], ['Aurora', 'Cooper', null],
    ['Caleb', 'Richardson', null], ['Violet', 'Howard', null], ['Ezra', 'Torres', null],
  ];

  const users = people.map(([first, last, deptId], i) => ({
    id: 'u' + (i + 1),
    first,
    last,
    email: `${first}.${last}`.toLowerCase() + '@example.com',
    type: 'person',
    deptId,
    group: GROUPS[i % GROUPS.length],
    role: i === 0 ? 'Super Admin' : i === 1 ? 'Billing Admin' : i % 9 === 0 ? 'Admin' : 'User',
    consumed: 0,
  }));

  const vts = [
    { first: 'Randy', email: 'randy@opal.domain', deptId: 'mus', principals: ['Emma Williams'] },
    { first: 'Joyce', email: 'joyce@opal.domain', deptId: 'mus', principals: ['Emma Williams', 'Sophia Johnson'] },
    { first: 'Atlas', email: 'atlas@opal.domain', deptId: 'eng', principals: ['Ethan Park'] },
    { first: 'Quill', email: 'quill@opal.domain', deptId: null, principals: ['Grace Turner'] },
    { first: 'Juniper', email: 'juniper@opal.domain', deptId: null, principals: ['Henry Scott', 'Lily Adams'] },
  ].map((v, i) => ({
    id: 'vt' + (i + 1),
    first: v.first,
    last: '',
    email: v.email,
    type: 'vt',
    deptId: v.deptId,
    principals: v.principals,
    group: 'Virtual Teammates',
    role: 'Agent',
    consumed: 0,
  }));

  const allUsers = [...users, ...vts];

  // Consumption per department for the current contract term.
  const deptConsumed = { mus: 2800, muk: 1100, prod: 1350, eng: 1180, null: 1770 };
  // Fixed values that match the Figma table for Marketing - US.
  const fixed = { 'randy@opal.domain': 1340, 'joyce@opal.domain': 720, 'emma.williams@example.com': 610 };

  Object.keys(deptConsumed).forEach((key) => {
    const deptId = key === 'null' ? null : key;
    const members = allUsers.filter((u) => u.deptId === deptId);
    let remaining = deptConsumed[key];
    const flexible = [];
    members.forEach((m) => {
      if (fixed[m.email] != null) {
        m.consumed = fixed[m.email];
        remaining -= m.consumed;
      } else flexible.push(m);
    });
    // A few people with zero usage keep the data honest: not everyone uses Opal.
    const weights = flexible.map((_, i) => (i % 5 === 4 ? 0 : Math.pow(rand(), 2) + 0.05));
    const total = weights.reduce((a, b) => a + b, 0);
    let assigned = 0;
    flexible.forEach((m, i) => {
      m.consumed = Math.floor((weights[i] / total) * remaining);
      assigned += m.consumed;
    });
    if (flexible.length) {
      const top = flexible.reduce((a, b) => (b.consumed > a.consumed ? b : a));
      top.consumed += remaining - assigned;
    }
  });

  // Usage is recorded against the department someone was in at the time, so moving a person never moves
  // their past usage. `consumed` stays the person's total for the term.
  allUsers.forEach((u) => (u.usage = { [u.deptId || 'none']: u.consumed }));

  const departments = [
    { id: 'mus', name: 'Marketing - US', description: 'Content ops and campaigns', budget: 3500, contact: 'Emma Williams', createdAt: 'Jan 12, 2026', createdBy: 'Alex Zhou' },
    { id: 'muk', name: 'Marketing - UK', description: 'Regional campaigns and localisation', budget: 2000, contact: 'Oliver Hughes', createdAt: 'Jan 12, 2026', createdBy: 'Alex Zhou' },
    { id: 'prod', name: 'Product', description: 'Product marketing and launches', budget: 1500, contact: 'Noah Kim', createdAt: 'Feb 3, 2026', createdBy: 'Sophia Johnson' },
    { id: 'eng', name: 'Engineering', description: 'Web platform and experimentation', budget: 1000, contact: 'Ethan Park', createdAt: 'Mar 18, 2026', createdBy: 'Alex Zhou' },
  ];

  const history = [
    { id: 'h1', deptId: 'mus', when: 'Jan 12, 2026 · 9:14 AM', actor: 'Alex Zhou', text: 'Created department with a budget of 3,000 credits' },
    { id: 'h2', deptId: 'mus', when: 'Jan 12, 2026 · 9:14 AM', actor: 'Alex Zhou', text: 'Added 10 members and 2 virtual teammates' },
    { id: 'h3', deptId: 'mus', when: 'Apr 2, 2026 · 3:40 PM', actor: 'Sophia Johnson', text: 'Increased budget 3,000 → 3,500' },
    { id: 'h4', deptId: 'mus', when: 'May 20, 2026 · 11:02 AM', actor: 'Alex Zhou', text: 'Moved Harper Lee from Unallocated' },
    { id: 'h5', deptId: 'muk', when: 'Jan 12, 2026 · 9:20 AM', actor: 'Alex Zhou', text: 'Created department with a budget of 2,000 credits' },
    { id: 'h6', deptId: 'prod', when: 'Feb 3, 2026 · 1:05 PM', actor: 'Sophia Johnson', text: 'Created department with a budget of 1,500 credits' },
    { id: 'h7', deptId: 'eng', when: 'Mar 18, 2026 · 10:30 AM', actor: 'Alex Zhou', text: 'Created department with a budget of 1,500 credits' },
    { id: 'h8', deptId: 'eng', when: 'Jun 9, 2026 · 4:12 PM', actor: 'Alex Zhou', text: 'Decreased budget 1,500 → 1,000' },
    { id: 'h9', deptId: null, when: 'Aug 1, 2025', actor: 'System', text: 'Contract term started · 15,000 credits purchased' },
  ];

  departments.forEach((d) => (d.recipients = d.id === 'mus' ? ['Sophia Johnson'] : []));
  // Names are kept on history entries so the log still reads correctly after a department is deleted.
  history.forEach((h) => (h.deptName = departments.find((d) => d.id === h.deptId)?.name));

  // Usage by agent and by product for the breakdown section. Both sum to 8,200.
  const agents = [
    { name: 'Opal Chat', kind: 'Conversational', consumed: 2960 },
    { name: 'Content brief generator', kind: 'Content', consumed: 1420 },
    { name: 'SEO recommendations', kind: 'Search', consumed: 1050 },
    { name: 'Campaign planner', kind: 'Planning', consumed: 880 },
    { name: 'Image generation', kind: 'Creative', consumed: 760 },
    { name: 'Experiment ideas', kind: 'Experimentation', consumed: 610 },
    { name: 'Translation', kind: 'Localisation', consumed: 520 },
  ];

  const products = [
    { name: 'Content Marketing Platform', consumed: 3100 },
    { name: 'CMS PaaS', consumed: 2050 },
    { name: 'Opal (standalone)', consumed: 1810 },
    { name: 'Web Experimentation', consumed: 1240 },
  ];

  window.MOCK = {
    POOL,
    CONTRACT: { start: 'August 1, 2025', expires: 'August 1, 2026' },
    CURRENT_ADMIN,
    GROUPS,
    ROLES,
    users: allUsers,
    departments,
    history,
    agents,
    products,
  };
})();
