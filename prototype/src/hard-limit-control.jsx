// Usage & Billing → Credits: the control to turn the org-level hard limit on or off, plus the rule
// that decides whether the introduction shows above it (first 30 days only).
(() => {
  const { useState, useEffect, useId } = React;

  const ALERTS = [50, 75, 90, 95, 100];
  const INTRO_DAYS = 30;
  const DAY = 24 * 60 * 60 * 1000;
  const KEY = 'opal-hard-limit-intro-first-seen';
  const HIDE_KEY = 'opal-hard-limit-intro-hidden';

  // The intro window starts the first time an admin sees this section. A prototype stand-in for
  // "first view after launch"; storage can be blocked, so fall back to the current visit.
  function readFirstSeen() {
    try {
      const v = Number(localStorage.getItem(KEY));
      if (v > 0) return v;
      const now = Date.now();
      localStorage.setItem(KEY, String(now));
      return now;
    } catch (e) {
      return Date.now();
    }
  }
  function readHidden() {
    try { return localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; }
  }
  function writeHidden(v) {
    try { v ? localStorage.setItem(HIDE_KEY, '1') : localStorage.removeItem(HIDE_KEY); } catch (e) { /* ignore */ }
  }
  function writeFirstSeen(ts) {
    try {
      ts === null ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, String(ts));
    } catch (e) { /* ignore */ }
  }

  function HardLimitControl({ enabled, onChange, used, pool, onRequest, onShowIntro }) {
    const [confirm, setConfirm] = useState(null); // 'on' | 'off'
    const [announce, setAnnounce] = useState('');
    const titleId = useId();
    const reached = enabled && used >= pool;
    const pct = pctOf(used, pool);
    const nextAlert = ALERTS.find((a) => pct < a);
    const state = !enabled ? 'off' : reached ? 'reached' : 'on';

    const apply = (next) => {
      onChange(next);
      setConfirm(null);
      setAnnounce(next ? 'Hard limit turned on.' : 'Hard limit turned off.');
    };
    // Turning on or off both change what Opal does for everyone, so both are confirmed.
    const ask = () => setConfirm(enabled ? 'off' : 'on');

    return (
      <section className="section hlc" aria-labelledby={titleId}>
        <div className="section-head">
          <h2 className="section-title" id={titleId}>Credit limit</h2>
          <button type="button" className="link-btn" onClick={onShowIntro}>How the hard limit works</button>
        </div>

        {reached && (
          <div className="hlc-banner" role="alert">
            <Icon name="alert" size={18} />
            <p>
              <strong>Credit limit reached.</strong> Chat, agents and workflows are paused for your whole organization.
              Add credits, or turn off the hard limit to continue with overage charges.
            </p>
            {onRequest && <Button variant="secondary" size="sm" onClick={onRequest}>Request credits</Button>}
          </div>
        )}

        <div className={'card hlc-card is-' + state}>
          <div className="hlc-row">
            <div className="hlc-copy">
              <p className="hlc-title">
                Enforce a hard limit
                {state !== 'off' && <span className={'hlc-badge is-' + state}>{reached ? 'Limit reached' : 'Hard limit active'}</span>}
              </p>
              <p className="hlc-text">
                {enabled
                  ? 'Opal stops for everyone, including automated workflows, once all credits are used.'
                  : 'Opal keeps running if you use more than your credits. Overage charges apply.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Enforce a hard limit"
              className={'hlc-switch' + (enabled ? ' is-on' : '')}
              onClick={ask}
            >
              <span className="hlc-switch-label" aria-hidden="true">{enabled ? 'On' : 'Off'}</span>
              <span className="hlc-track" aria-hidden="true"><span className="hlc-knob" /></span>
            </button>
          </div>

          {enabled && (
            <div className="hlc-meter">
              <p className="hlc-next">
                <Icon name={reached ? 'lock' : 'bell'} size={16} />
                {reached
                  ? `Opal stopped at ${fmt(pool)} credits. Admins were emailed.`
                  : `Opal stops at ${fmt(pool)} credits. Next alert at ${nextAlert}% (${fmt(Math.round((pool * nextAlert) / 100))} credits).`}
              </p>
            </div>
          )}
        </div>
        <span className="sr-only" role="status" aria-live="polite">{announce}</span>

        {confirm === 'on' && (
          <ConfirmDialog
            title="Turn on the hard limit?"
            confirmLabel="Turn on hard limit"
            onCancel={() => setConfirm(null)}
            onConfirm={() => apply(true)}
          >
            <p>
              When your organization reaches {fmt(pool)} credits, all Opal functionality stops for everyone, including
              scheduled and automated workflows. You'll get alerts at {ALERTS.join(', ')}% before that.
            </p>
          </ConfirmDialog>
        )}
        {confirm === 'off' && (
          <ConfirmDialog
            title="Turn off the hard limit?"
            confirmLabel="Turn off hard limit"
            onCancel={() => setConfirm(null)}
            onConfirm={() => apply(false)}
          >
            <p>
              {reached
                ? 'Opal starts working again right away. Usage past your credits is billed as overage.'
                : 'Opal will keep running if you use more than your credits, and overage charges apply.'}
            </p>
          </ConfirmDialog>
        )}
      </section>
    );
  }

  // Owns the hard limit state and the intro rule: the popup opens on its own during the first 30 days
  // unless the admin chose "Don't show this again". The link in the section reopens it any time.
  function HardLimitSection({ consumed, pool, onRequest }) {
    const [enabled, setEnabled] = useState(false);
    const [simulateReached, setSimulateReached] = useState(false);
    const [introOpen, setIntroOpen] = useState(() => Date.now() - readFirstSeen() < INTRO_DAYS * DAY && !readHidden());

    // Prototype scenarios from the Screens menu.
    useEffect(() => {
      const onScenario = (e) => {
        const id = e.detail;
        if (id === 'hl-intro') { writeHidden(false); writeFirstSeen(Date.now()); setIntroOpen(true); }
        else if (id === 'hl-after') { writeFirstSeen(Date.now() - (INTRO_DAYS + 1) * DAY); setIntroOpen(false); }
        else if (id === 'hl-reached') { setEnabled(true); setSimulateReached(true); }
        else if (id === 'hl-reset') { setEnabled(false); setSimulateReached(false); writeHidden(false); writeFirstSeen(Date.now()); setIntroOpen(true); }
      };
      window.addEventListener('hl-scenario', onScenario);
      return () => window.removeEventListener('hl-scenario', onScenario);
    }, []);

    const closeIntro = (dontShowAgain) => {
      if (dontShowAgain) writeHidden(true);
      setIntroOpen(false);
    };
    const used = simulateReached ? pool : consumed;
    return (
      <>
        <HardLimitControl
          enabled={enabled}
          onChange={(v) => { setEnabled(v); if (!v) setSimulateReached(false); }}
          used={used}
          pool={pool}
          onRequest={onRequest}
          onShowIntro={() => setIntroOpen(true)}
        />
        {introOpen && <HardLimitIntro consumed={consumed} pool={pool} onClose={closeIntro} />}
      </>
    );
  }

  window.HardLimitSection = HardLimitSection;
})();
