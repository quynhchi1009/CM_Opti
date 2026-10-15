// Shared building blocks: formatting, status rules, buttons, modals, tabs, bars.
(() => {
  const { useEffect, useRef, useState, useId } = React;

  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const pctOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
  const fmtPct = (p) => {
    const r = Math.round(p * 10) / 10;
    return (Number.isInteger(r) ? r : r.toFixed(1)) + '%';
  };

  // Display states from the V1 allocation rules: 0–74 on track, 75–99 approaching, ≥100 over.
  function statusOf(consumed, budget) {
    if (!budget) return 'none';
    const p = pctOf(consumed, budget);
    if (p >= 100) return 'over';
    if (p >= 75) return 'approaching';
    return 'ontrack';
  }
  const STATUS_LABEL = { ontrack: 'On track', approaching: 'Approaching', over: 'Over budget', none: 'No budget' };

  // Usage is processed in batches about every 6 hours, so show when the numbers are from, not "just now".
  const SYNC_HOURS = 6;
  function usageAsOf() {
    const d = new Date();
    d.setHours(Math.floor(d.getHours() / SYNC_HOURS) * SYNC_HOURS, 0, 0, 0);
    return 'Today, ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const FRESHNESS_HELP = `Credit usage is processed in batches, so new usage can take up to about ${SYNC_HOURS} hours to appear here.`;

  function UsageAsOf({ className = '' }) {
    return (
      <span className={'as-of ' + className}>
        <Icon name="clock" size={16} />
        Usage as of {usageAsOf()} · updates about every {SYNC_HOURS} hours
      </span>
    );
  }

  function Button({ variant = 'secondary', size, icon, children, className = '', ...rest }) {
    return (
      <button type="button" className={`btn btn-${variant} ${size ? 'btn-' + size : ''} ${className}`} {...rest}>
        {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
        {children}
      </button>
    );
  }

  function IconButton({ icon, label, onClick, className = '', size = 20 }) {
    return (
      <button type="button" className={'icon-btn ' + className} aria-label={label} title={label} onClick={onClick}>
        <Icon name={icon} size={size} />
      </button>
    );
  }

  // Every state gets a text badge so status never relies on colour alone.
  function StatusBadge({ status }) {
    if (status === 'none') return null;
    return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
  }

  // The bar stops at full; the numbers next to it never do.
  function UsageBar({ consumed, budget, status, thin }) {
    const width = budget ? Math.min(100, pctOf(consumed, budget)) : 0;
    return (
      <div className={'usage-bar' + (thin ? ' thin' : '')} role="presentation">
        <div className={`usage-fill fill-${status}`} style={{ width: width + '%' }} />
      </div>
    );
  }

  function VirtualTag() {
    return <span className="tag-virtual">Virtual</span>;
  }

  // Virtual teammates always show who they act for.
  function Principal({ user }) {
    if (user.type !== 'vt') return null;
    return <span className="principal">{user.principals.length > 1 ? 'Principals' : 'Principal'}: {user.principals.join(', ')}</span>;
  }

  function InfoTip({ text, label = 'More information' }) {
    const [open, setOpen] = useState(false);
    const id = useId();
    return (
      <span className="infotip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button
          type="button"
          className="infotip-trigger"
          aria-label={label}
          aria-describedby={open ? id : undefined}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <Icon name="info" size={16} />
        </button>
        {open && (
          <span role="tooltip" id={id} className="infotip-bubble">
            {text}
          </span>
        )}
      </span>
    );
  }

  // Pair with <TabPanel idBase=… id=…> so each tab points at the panel it controls.
  const tabId = (base, id) => `${base}-tab-${id}`;
  const panelId = (base, id) => `${base}-panel-${id}`;

  function Tabs({ tabs, value, onChange, variant = 'line', className = '', idBase, label }) {
    const refs = useRef({});
    const onKey = (e, i) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      onChange(next.id);
      refs.current[next.id]?.focus();
    };
    return (
      <div className={`tabs tabs-${variant} ${className}`} role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => (refs.current[t.id] = el)}
            type="button"
            role="tab"
            id={idBase ? tabId(idBase, t.id) : undefined}
            aria-controls={idBase ? panelId(idBase, t.id) : undefined}
            aria-selected={value === t.id}
            tabIndex={value === t.id ? 0 : -1}
            className={'tab' + (value === t.id ? ' is-active' : '')}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {t.count != null && <span className={'tab-count ' + (t.countTone || '')}>{t.count}</span>}
            {t.dirty && (
              <>
                <span className="tab-dot" aria-hidden="true" />
                <span className="sr-only">, unsaved changes</span>
              </>
            )}
          </button>
        ))}
      </div>
    );
  }

  function TabPanel({ idBase, id, className = '', children }) {
    return (
      <div role="tabpanel" id={panelId(idBase, id)} aria-labelledby={tabId(idBase, id)} className={className}>
        {children}
      </div>
    );
  }

  // On the flow board, modals render in place as static frames: no scrim, focus moves or key handling.
  // `overlay` dialogs still sit over the frame they belong to.
  const INLINE = !!window.FLOW_BOARD;
  let openModals = 0;

  // Modal shell with Escape handling and focus return. `drawer` docks it to the right edge instead.
  function Modal({ title, subtitle, onClose, children, footer, width = 640, labelledBy, className = '', initialFocus, overlay, drawer }) {
    const ref = useRef(null);
    const titleId = useId();
    useEffect(() => {
      if (INLINE) return;
      const prev = document.activeElement;
      const el = ref.current;
      const target = (initialFocus && el.querySelector(initialFocus)) || el.querySelector('input, textarea, button:not(.modal-close)');
      target?.focus();

      // Everything behind the dialog stops being reachable by keyboard, pointer and screen reader, and the page stops scrolling.
      // Toasts stay live so confirmations are still announced.
      const scrim = el.parentElement;
      const behind = [...(scrim.parentElement?.children || [])].filter(
        (n) => n !== scrim && !n.classList.contains('toasts') && !n.inert,
      );
      behind.forEach((n) => (n.inert = true));
      openModals += 1;
      document.body.style.overflow = 'hidden';

      return () => {
        behind.forEach((n) => (n.inert = false));
        openModals -= 1;
        if (openModals <= 0) document.body.style.overflow = '';
        prev && prev.focus && prev.focus();
      };
    }, []);
    useEffect(() => {
      if (INLINE) return;
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
        if (e.key === 'Tab') {
          const nodes = ref.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea, select, [tabindex="0"]');
          if (!nodes.length) return;
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      const el = ref.current;
      el.addEventListener('keydown', onKey);
      return () => el.removeEventListener('keydown', onKey);
    }, [onClose]);
    const box = (
      <div
        ref={ref}
        className={'modal ' + className + (drawer ? ' drawer' : '') + (INLINE ? ' modal-inline' : '')}
        role={INLINE ? 'group' : 'dialog'}
        aria-modal={INLINE ? undefined : 'true'}
        aria-labelledby={labelledBy || titleId}
        style={{ maxWidth: width }}
      >
        <div className="modal-head">
          <div className="modal-titles">
            <h2 id={titleId} className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <IconButton icon="x" label="Close" className="modal-close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    );
    if (INLINE && !overlay) return box;
    return (
      <div className={'scrim' + (drawer ? ' scrim-drawer' : '') + (INLINE ? ' scrim-inline' : '')} onMouseDown={(e) => !INLINE && e.target === e.currentTarget && onClose()}>
        {box}
      </div>
    );
  }

  // The cancel button is always the safe choice and takes first focus, so Esc or Enter never destroys work.
  // onDismiss covers Escape, the scrim and the close icon; it defaults to cancel.
  function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', onConfirm, onCancel, onDismiss }) {
    return (
      <Modal
        title={title}
        onClose={onDismiss || onCancel}
        width={480}
        className="dialog"
        overlay
        initialFocus=".btn-ghost"
        footer={
          <>
            <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
          </>
        }
      >
        <div className="dialog-text">{children}</div>
      </Modal>
    );
  }

  function Stepper({ steps, current }) {
    return (
      <ol className="stepper" aria-label="Progress">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li key={s} className={'step step-' + state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="step-dot">{state === 'done' && <Icon name="check" size={10} />}</span>
              <span className="step-label">{s}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  function SelectField({ label, value, onChange, options, className = '' }) {
    const id = useId();
    return (
      <label className={'select-field ' + className} htmlFor={id}>
        <span className="select-label">{label}</span>
        <span className="select-wrap">
          <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} />
        </span>
      </label>
    );
  }

  // Searchable single-choice list of people (ARIA 1.2 combobox). `value` is the chosen display name.
  // Escape closes the list first and only then reaches the surrounding dialog.
  function PersonCombobox({ id, users, value, onChange, exclude = [], placeholder = 'Search by name or email', clearLabel, resetOnSelect }) {
    const [open, setOpen] = useState(false);
    const [typing, setTyping] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    const listId = useId();
    const skip = new Set(exclude);

    const people = users.filter((u) => u.type === 'person' && !skip.has(fullName(u))).sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const q = query.trim().toLowerCase();
    const matches = people.filter((u) => !q || fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    const options = [
      ...(clearLabel && !q ? [{ key: '__none', label: clearLabel, value: '', muted: true }] : []),
      ...matches.slice(0, 50).map((u) => ({ key: u.id, label: fullName(u), sub: u.email, value: fullName(u) })),
    ];

    useEffect(() => {
      const el = inputRef.current;
      const onKey = (e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      };
      el.addEventListener('keydown', onKey);
      return () => el.removeEventListener('keydown', onKey);
    }, [open]);

    function close() {
      setOpen(false);
      setTyping(false);
      setQuery('');
    }
    const choose = (o) => {
      onChange(o.value);
      close();
    };
    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) return setOpen(true);
        const n = options.length || 1;
        setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
      } else if (e.key === 'Enter' && open && options[active]) {
        e.preventDefault();
        choose(options[active]);
      }
    };

    const shown = typing ? query : resetOnSelect ? '' : value;
    return (
      <span className="combo">
        <input
          ref={inputRef}
          id={id}
          className="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={value && !resetOnSelect ? value : placeholder}
          value={shown}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onChange={(e) => {
            setQuery(e.target.value);
            setTyping(true);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <Icon name="chevronDown" size={16} />
        {open && (
          <ul className="combo-list" role="listbox" id={listId} aria-label="People">
            {options.length === 0 && <li className="combo-empty" role="presentation">No one matches "{query}"</li>}
            {options.map((o, i) => (
              <li
                key={o.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === value}
                className={'combo-option' + (i === active ? ' is-active' : '') + (o.muted ? ' is-muted' : '')}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                <span>{o.label}</span>
                {o.sub && <span className="combo-sub">{o.sub}</span>}
              </li>
            ))}
          </ul>
        )}
      </span>
    );
  }

  function Toasts({ items, onDismiss }) {
    return (
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast">
            <Icon name="checkCircle" size={20} />
            <span>{t.text}</span>
            {t.action && (
              <button type="button" className="toast-action" onClick={() => { t.action.run(); onDismiss(t.id); }}>
                {t.action.label}
              </button>
            )}
            <IconButton icon="x" size={16} label="Dismiss" onClick={() => onDismiss(t.id)} />
          </div>
        ))}
      </div>
    );
  }

  function Pagination({ page, pages, onChange }) {
    if (pages <= 1) return null;
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return (
      <nav className="pagination" aria-label="Pages">
        <button type="button" className="page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={'e' + i} className="page-gap">…</span>
          ) : (
            <button
              key={n}
              type="button"
              className={'page-btn page-num' + (n === page ? ' is-active' : '')}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" className="page-btn" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button>
      </nav>
    );
  }

  // History entries carry display strings like "Jan 12, 2026 · 9:14 AM"; sort them by real time.
  const whenMs = (h) => Date.parse(h.when.replace(' · ', ' ')) || 0;
  const newestFirst = (list) => [...list].sort((a, b) => whenMs(b) - whenMs(a));

  // Credits a user consumed while in a department (null = Unallocated).
  const usageIn = (u, deptId) => (u.usage ? u.usage[deptId || 'none'] || 0 : 0);
  const deptUsage = (users, deptId) => users.reduce((a, u) => a + usageIn(u, deptId), 0);

  const fullName = (u) => (u.last ? `${u.first} ${u.last}` : u.first);

  Object.assign(window, {
    fmt, pctOf, fmtPct, statusOf, STATUS_LABEL, fullName, newestFirst, usageIn, deptUsage, usageAsOf, FRESHNESS_HELP,
    Button, IconButton, StatusBadge, UsageBar, VirtualTag, Principal, InfoTip, Tabs, TabPanel, Modal, ConfirmDialog, UsageAsOf,
    Stepper, SelectField, Toasts, Pagination, PersonCombobox,
  });
})();
