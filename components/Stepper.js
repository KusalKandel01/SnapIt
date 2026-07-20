export default function Stepper({ label, value, onChange, min, max, step = 1, unit = '' }) {
  // Guards against float drift (e.g. 1.2 - 0.1 → 1.0999999999999999) for
  // decimal steps like line-height (0.1) — rounds to the step's own precision.
  const decimals = (step.toString().split('.')[1] || '').length;
  const round = (n) => decimals ? Math.round(n * 10 ** decimals) / 10 ** decimals : n;
  const dec = () => onChange(round(Math.max(min, value - step)));
  const inc = () => onChange(round(Math.min(max, value + step)));
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <button type="button" onClick={dec} className="stepper-btn" aria-label={`Decrease ${label}`}>−</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => {
            const v = +e.target.value;
            if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          style={{
            flex: 1, textAlign: 'center', background: 'var(--ink)', color: 'var(--ink-text)',
            border: 'none', borderLeft: '1px solid var(--rule)', borderRight: '1px solid var(--rule)',
            fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 4px', outline: 'none'
          }}
        />
        <button type="button" onClick={inc} className="stepper-btn" aria-label={`Increase ${label}`}>+</button>
      </div>
      {unit && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--rule-light)', marginTop: 3 }}>{value}{unit}</div>}
    </div>
  );
}
