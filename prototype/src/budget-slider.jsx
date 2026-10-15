// Budget entry in credits or as a % share of the org pool, with a slider that shows what's still free.
// The value is a credits string; credits lead because that's the number finance agrees on.
(() => {
  const { useId, useState } = React;

  const parseCredits = (v) => {
    if (v === '' || v == null) return NaN;
    return Number(String(v).replace(/,/g, ''));
  };
  const creditsFromPct = (pct, pool) => String(Math.round((Number(pct) / 100) * pool));

  function budgetError(value, available) {
    const c = parseCredits(value);
    if (Number.isNaN(c) || c <= 0) return 'Enter a budget above 0 credits.';
    if (c > available) return `Only ${fmt(available)} credits are available to allocate.`;
    return null;
  }

  function BudgetSlider({ value, onChange, pool, available, showError = true, onRequestCredits, current, own }) {
    const creditsId = useId();
    const pctId = useId();
    const errId = useId();
    const helpId = useId();
    const [creditsFocus, setCreditsFocus] = useState(false);
    const [pctDraft, setPctDraft] = useState(null); // text while the % field is being typed in

    const availablePct = pctOf(available, pool);
    const c = parseCredits(value);
    const valid = !Number.isNaN(c);
    const credits = valid ? c : 0;
    const p = pctOf(credits, pool);
    const nearStart = availablePct < 22;
    const nearEnd = availablePct > 78;
    const error = budgetError(value, available);
    const thumbPct = Math.max(0, Math.min(p, 100));
    const fillPct = Math.min(thumbPct, availablePct);
    const leftAfter = available - credits;
    const shownError = showError && error;

    const onCredits = (e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 7));
    const onPct = (e) => {
      const v = e.target.value.replace(/[^\d.]/g, '');
      if ((v.match(/\./g) || []).length > 1) return;
      if (v.includes('.') && v.split('.')[1].length > 1) return;
      setPctDraft(v);
      onChange(v === '' ? '' : creditsFromPct(v, pool));
    };

    return (
      <div className="budget">
        <div className="budget-entry">
          <div className="field budget-credits">
            <label className="field-label" htmlFor={creditsId}>
              Budget in credits <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id={creditsId}
              className={'input input-credits' + (shownError ? ' has-error' : '')}
              inputMode="numeric"
              value={creditsFocus || !valid ? value : fmt(c)}
              onChange={onCredits}
              onFocus={() => setCreditsFocus(true)}
              onBlur={() => setCreditsFocus(false)}
              aria-invalid={!!shownError}
              aria-describedby={[helpId, shownError ? errId : null].filter(Boolean).join(' ')}
            />
          </div>
          <span className="budget-eq" aria-hidden="true">=</span>
          <div className="field budget-pct">
            <label className="field-label" htmlFor={pctId}>Share of {fmt(pool)}</label>
            <span className="input-suffix">
              <input
                id={pctId}
                className="input input-pct"
                inputMode="decimal"
                value={pctDraft ?? (valid ? String(Math.round(p * 10) / 10) : '')}
                onChange={onPct}
                onBlur={() => setPctDraft(null)}
              />
              <span aria-hidden="true">%</span>
            </span>
          </div>
        </div>
        <p className="field-help budget-help" id={helpId}>
          {current != null && valid && credits !== current ? (
            <span className="budget-diff tabular">
              {fmt(current)} <Icon name="arrowRight" size={14} /> <strong>{fmt(credits)}</strong> credits
              <span className={credits > current ? 'diff-up' : 'diff-down'}>
                {credits > current ? '+' : '−'}
                {fmt(Math.abs(credits - current))}
              </span>
            </span>
          ) : (
            own != null ? (
              <span className="tabular">
                Up to {fmt(available)} credits ({fmtPct(availablePct)}) for this department: {fmt(available - own)} available to
                allocate plus its current {fmt(own)}
              </span>
            ) : (
              <span className="tabular">{fmt(available)} credits ({fmtPct(availablePct)}) available to allocate</span>
            )
          )}
        </p>
        {shownError && (
          <p className="field-error" id={errId} role="alert">
            <Icon name="alert" size={16} />
            <span>
              {error}{' '}
              {valid && c > 0 && (
                <>
                  Lower the budget, reduce another department's budget, or{' '}
                  {onRequestCredits ? (
                    <button type="button" className="link-btn inline-link" onClick={onRequestCredits}>request more credits</button>
                  ) : (
                    'request more credits'
                  )}
                  .
                </>
              )}
            </span>
          </p>
        )}

        <div className="slider">
          <div className="slider-track" aria-hidden="true">
            <div className="slider-free" style={{ width: availablePct + '%' }} />
            <div className="slider-taken" style={{ left: availablePct + '%' }} />
            <div className={'slider-fill' + (error && valid && c > 0 ? ' is-over' : '')} style={{ width: fillPct + '%' }} />
            <div className="slider-limit" style={{ left: availablePct + '%' }} />
          </div>
          <input
            type="range"
            className="slider-input"
            min="0"
            max="100"
            step="1"
            value={thumbPct}
            onChange={(e) => {
              setPctDraft(null);
              onChange(String(Math.min(Math.round((Number(e.target.value) / 100) * pool), available)));
            }}
            aria-label="Budget as a share of organization credits"
            aria-valuetext={`${fmt(credits)} credits, ${fmtPct(thumbPct)}`}
          />
          <span className="slider-bubble" style={{ left: thumbPct + '%' }} aria-hidden="true">
            {fmtPct(thumbPct)}
          </span>
          <div className="slider-scale" aria-hidden="true">
            <span style={{ visibility: nearStart ? 'hidden' : 'visible' }}>0%</span>
            <span
              className="slider-scale-limit"
              style={{
                left: availablePct + '%',
                transform: nearStart ? 'translateX(-4px)' : nearEnd ? 'translateX(calc(-100% + 4px))' : undefined,
              }}
            >
              {fmt(available)} ({fmtPct(availablePct)}) {own != null ? 'maximum' : 'available'}
            </span>
            <span style={{ visibility: nearEnd ? 'hidden' : 'visible' }}>100%</span>
          </div>
        </div>

        <div className="budget-foot">
          <span className={'tabular' + (leftAfter < 0 ? ' text-danger' : '')}>
            {leftAfter >= 0
              ? `${fmt(leftAfter)} credits left to allocate after this`
              : `${fmt(-leftAfter)} credits more than is available`}
          </span>
          <span className="legend">
            <span className="legend-swatch" /> Allocated to other departments
          </span>
        </div>
      </div>
    );
  }

  Object.assign(window, { BudgetSlider, budgetError, parseCredits, creditsFromPct });
})();
