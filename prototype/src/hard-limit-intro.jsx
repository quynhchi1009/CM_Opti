// Usage & Billing → Credits: introduces the org-level hard limit and what each state looks like.
(() => {
  const { useState, useId } = React;
  const THRESHOLDS = [50, 75, 90, 95, 100];

  // Inert miniature of the credit limit card, one per state. The text beside it carries the meaning.
  function LimitPreview({ state, consumed, pool }) {
    const isOn = state !== 'off';
    const reached = state === 'reached';
    const used = reached ? pool : consumed;
    const pct = Math.min(100, pctOf(used, pool));
    const label = reached ? 'Limit reached' : 'Hard limit active';
    return (
      <div className={'hl-preview is-' + state} role="img" aria-label={previewLabel(state, used, pool)}>
        {reached && (
          <div className="hl-banner">
            <Icon name="alert" size={14} />
            <span>Credit limit reached. Opal is paused for your whole organization.</span>
          </div>
        )}
        <div className="hl-card">
          <div className="hl-card-head">
            <span className="hl-card-title">Credit limit</span>
            {isOn && <span className="hl-chip">{label}</span>}
            {!isOn && <span className="hl-off">Off</span>}
          </div>
          <div className="hl-row">
            <span className="hl-row-text">
              <span className="hl-row-title">Enforce a hard limit</span>
              <span className="hl-row-sub">
                {isOn ? 'Opal stops once every credit is used.' : 'Opal keeps running past your credits; overage charges apply.'}
              </span>
            </span>
            <span className={'hl-switch' + (isOn ? ' is-on' : '')} aria-hidden="true">
              <span className="hl-knob" />
            </span>
          </div>
          {isOn && (
            <div className="hl-meter">
              <div className="hl-track"><div className="hl-fill" style={{ width: pct + '%' }} /></div>
              <div className="hl-meter-text tabular">
                <span>{fmt(used)} of {fmt(pool)} credits used</span>
                <span>{reached ? '0 left' : fmt(pool - used) + ' left'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function previewLabel(state, used, pool) {
    if (state === 'off') return 'Credit limit card with the hard limit switched off';
    if (state === 'on') return `Credit limit card with the hard limit on and ${fmt(used)} of ${fmt(pool)} credits used`;
    return `Credit limit card showing the limit reached at ${fmt(pool)} credits, with a banner saying Opal is paused`;
  }

  // Popup version. "Got it" closes it; ticking "Don't show this again" also stops it opening on its own.
  function HardLimitIntro({ consumed, pool, onClose }) {
    const [hide, setHide] = useState(false);
    const checkId = useId();
    const states = [
      {
        id: 'off',
        step: '1',
        name: 'Off',
        title: 'You choose',
        text: 'Hard limits are off by default. Opal keeps running if you go past your credits, and overage is billed.',
      },
      {
        id: 'on',
        step: '2',
        name: 'On',
        title: 'The limit is active',
        text: 'Your credits become a ceiling for the whole organization. You get an email and an in-app alert as usage climbs.',
      },
      {
        id: 'reached',
        step: '3',
        name: 'Limit reached',
        title: 'Opal pauses',
        text: 'Chat, agents and workflows stop for everyone. Add credits or turn the limit off to start them again.',
      },
    ];

    return (
      <Modal
        title="Set a hard limit on Opal credits"
        width={960}
        className="hl-modal"
        overlay
        initialFocus=".hl-got-it"
        onClose={() => onClose(false)}
        footer={
          <>
            <label className="hl-hide" htmlFor={checkId}>
              <input id={checkId} type="checkbox" className="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
              Don't show this again
            </label>
            <Button variant="primary" className="hl-got-it" onClick={() => onClose(hide)}>Got it</Button>
          </>
        }
      >
        <p className="hl-lead-text">
          Procurement can approve Opal knowing spend has a ceiling. Switch the limit on and your organization can never use more than the credits you bought.
        </p>
        <ul className="hl-facts">
          <li>
            <Icon name="users" size={18} />
            <span><strong>One limit for the whole organization.</strong> It doesn't matter how many people or instances use Opal.</span>
          </li>
          <li>
            <Icon name="lock" size={18} />
            <span><strong>Everything stops at the limit.</strong> That includes automated workflows, so plan before you switch it on.</span>
          </li>
          <li>
            <Icon name="bell" size={18} />
            <span>
              <strong>You hear about it early.</strong> Alerts at
              <span className="hl-thresholds">
                {THRESHOLDS.map((t) => <span key={t} className="hl-threshold tabular">{t}%</span>)}
              </span>
              of your credits.
            </span>
          </li>
        </ul>

        <ol className="hl-states">
          {states.map((s) => (
            <li key={s.id} className={'hl-state is-' + s.id}>
              <LimitPreview state={s.id} consumed={consumed} pool={pool} />
              <div className="hl-state-copy">
                <p className="hl-state-name"><span className="hl-step tabular">{s.step}</span> {s.name}</p>
                <h3 className="hl-state-title">{s.title}</h3>
                <p className="hl-state-text">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Modal>
    );
  }

  window.HardLimitIntro = HardLimitIntro;
})();
