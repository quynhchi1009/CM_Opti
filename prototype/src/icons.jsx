// Line icons drawn at 24px on a 1.75 stroke, matching the Admin Center nav.
(() => {
  const paths = {
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18 14.3c2.1.7 3.5 2.8 3.5 5.7" /></>,
    team: <><circle cx="12" cy="7.5" r="3" /><circle cx="5" cy="9" r="2.2" /><circle cx="19" cy="9" r="2.2" /><path d="M7 20c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5" /><path d="M1.5 18.5c0-2.3 1.5-4 3.5-4" /><path d="M22.5 18.5c0-2.3-1.5-4-3.5-4" /></>,
    grid: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9.5h18M3 15h18M9 4v16M15 4v16" /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
    billing: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><circle cx="12" cy="14" r="3" /><path d="M12 12.5v3" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><path d="M12 17h.01" /></>,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    chevronLeft: <path d="m15 6-6 6 6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    refresh: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 4v4.5H8" /></>,
    trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
    alert: <><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5" /><path d="M12 17.5h.01" /></>,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16 10" /></>,
    pencil: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 4v4.5H8" /><path d="M12 8v4l3 2" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m3.5 6 8.5 7 8.5-7" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    moveOut: <><path d="M10 4H5v16h5" /><path d="M14 12h7M18 9l3 3-3 3" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    lock: <><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
    sort: <><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></>,
    sortUp: <path d="m8 14 4-4 4 4" />,
    sortDown: <path d="m8 10 4 4 4-4" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };

  function Icon({ name, size = 20, className = '', label }) {
    return (
      <svg
        className={'icon ' + className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
        aria-label={label}
      >
        {paths[name]}
      </svg>
    );
  }

  window.Icon = Icon;
})();
