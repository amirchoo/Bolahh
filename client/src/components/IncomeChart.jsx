import { useId, useMemo, useRef, useState } from 'react';

const VW = 640, VH = 250;
const PAD_L = 44, PAD_R = 18, PAD_T = 18, PAD_B = 42;
const PLOT_W = VW - PAD_L - PAD_R;
const PLOT_H = VH - PAD_T - PAD_B;

const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-MY', {
  day: 'numeric', month: 'short', year: 'numeric',
});

const formatAmount = (amount) => `RM ${Math.round(Number(amount))}`;

const formatMonth = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
};

const selectStyle = {
  fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--text)', background: 'var(--card2)',
  border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px',
};

// Cardinal-spline smoothing so the line reads as a gentle curve rather than
// straight segments joining every point.
function smoothPath(points) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  if (points.length < 2) return d;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function TrendChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);
  const clipId = useId();
  const gradientId = useId();
  const glowId = useId();
  const animName = `income-draw-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const maxAmount = Math.max(...data.map(point => point.amount), 1);
  const yMax = Math.ceil(maxAmount / 50) * 50 || 50;
  const xAt = (index) => PAD_L + (data.length === 1 ? PLOT_W / 2 : (index / (data.length - 1)) * PLOT_W);
  const yAt = (amount) => PAD_T + (1 - amount / yMax) * PLOT_H;
  const points = data.map((point, index) => ({ x: xAt(index), y: yAt(point.amount) }));
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${xAt(data.length - 1)} ${PAD_T + PLOT_H} L ${xAt(0)} ${PAD_T + PLOT_H} Z`;
  const activeIdx = hoverIdx ?? data.length - 1;
  const active = data[activeIdx];
  const handleMove = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * VW;
    const ratio = Math.max(0, Math.min(1, (relativeX - PAD_L) / PLOT_W));
    setHoverIdx(Math.round(ratio * (data.length - 1)));
  };

  return <div style={{ position: 'relative' }}>
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }} onPointerMove={handleMove} onPointerLeave={() => setHoverIdx(null)}>
      <defs>
        <clipPath id={clipId}><rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} /></clipPath>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[0, 0.5, 1].map(ratio => {
        const y = PAD_T + ratio * PLOT_H;
        return <g key={ratio}><line x1={PAD_L} y1={y} x2={VW - PAD_R} y2={y} stroke="var(--border)" strokeWidth="1" /><text x={PAD_L - 8} y={y + 4} textAnchor="end" fontFamily="'Space Mono'" fontSize="10" fill="var(--muted)">{formatAmount(yMax * (1 - ratio))}</text></g>;
      })}
      <style>{`@keyframes ${animName} { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }`}</style>
      <g clipPath={`url(#${clipId})`}>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
          filter={`url(#${glowId})`} pathLength="1" strokeDasharray="1"
          style={{ animation: `${animName} 900ms ease-out forwards` }}
        />
        {points.map((point, index) => index !== activeIdx && (
          <circle key={data[index].date} cx={point.x} cy={point.y} r="3" fill="var(--card)" stroke="var(--accent)" strokeWidth="2" />
        ))}
        {hoverIdx !== null && <line x1={xAt(hoverIdx)} y1={PAD_T} x2={xAt(hoverIdx)} y2={PAD_T + PLOT_H} stroke="var(--border)" strokeWidth="1" />}
        <circle cx={xAt(activeIdx)} cy={yAt(active.amount)} r="9" fill="var(--accent)" opacity="0.25" />
        <circle cx={xAt(activeIdx)} cy={yAt(active.amount)} r="5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
      </g>
      {data.map((point, index) => (index === 0 || index === data.length - 1 || data.length <= 6) && <text key={point.date} x={xAt(index)} y={VH - 14} textAnchor="middle" fontSize="10" fill="var(--muted)">{new Date(`${point.date}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</text>)}
    </svg>
    {hoverIdx !== null && <div style={{ position: 'absolute', left: `${(xAt(activeIdx) / VW) * 100}%`, top: `${(yAt(active.amount) / VH) * 100}%`, transform: 'translate(-50%, -115%)', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2 }}>
      <div style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{formatAmount(active.amount)}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{formatDate(active.date)}</div>
    </div>}
  </div>;
}

function ManagerBreakdown({ data, selectedMonth, onSelectMonth, months }) {
  const [expandedId, setExpandedId] = useState(null);
  const rows = data.filter(row => row.month === selectedMonth).sort((a, b) => b.amount - a.amount);
  const maxAmount = Math.max(...rows.map(row => row.amount), 1);
  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Owed to each manager</div>
      <select value={selectedMonth} onChange={(event) => onSelectMonth(event.target.value)} style={selectStyle}>
        {months.map(month => <option key={month} value={month}>{formatMonth(month)}</option>)}
      </select>
    </div>
    {rows.length === 0
      ? <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No payouts for this month.</p>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(row => {
          const isOpen = expandedId === row.managerId;
          return <div key={row.managerId}>
            <button
              onClick={() => setExpandedId(isOpen ? null : row.managerId)}
              style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>
                <span>{isOpen ? '▾' : '▸'} {row.managerName} <span style={{ color: 'var(--muted)' }}>({row.sessions.length})</span></span>
                <span style={{ fontFamily: "'Space Mono'", fontWeight: 700 }}>{formatAmount(row.amount)}</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(row.amount / maxAmount) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
              </div>
            </button>
            {isOpen && <div style={{ marginTop: 8, paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {row.sessions.map(session => (
                <div key={session.id} style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {session.label}{session.fieldName ? ` · ${session.fieldName}` : ''}
                </div>
              ))}
            </div>}
          </div>;
        })}
      </div>}
  </>;
}

export default function IncomeChart({ data, mode = 'trend' }) {
  const isManagerMode = mode === 'manager';
  const months = useMemo(
    () => isManagerMode ? [...new Set((data || []).map(row => row.month))].sort().reverse() : [],
    [data, isManagerMode]
  );
  const [selectedMonth, setSelectedMonth] = useState(null);
  const activeMonth = selectedMonth && months.includes(selectedMonth) ? selectedMonth : months[0];

  if (!data || data.length === 0) {
    return <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>PAY</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{isManagerMode ? 'No manager payouts recorded yet.' : 'No sessions held yet.'}</p>
    </div>;
  }

  const totalAmount = isManagerMode
    ? data.filter(row => row.month === activeMonth).reduce((sum, row) => sum + row.amount, 0)
    : data[data.length - 1].amount;

  return <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>PAY</div>
      <div style={{ fontFamily: "'Space Mono'", fontSize: 28, fontWeight: 800, color: '#fff' }}>{formatAmount(totalAmount)}</div>
    </div>
    {isManagerMode
      ? <ManagerBreakdown data={data} selectedMonth={activeMonth} onSelectMonth={setSelectedMonth} months={months} />
      : <>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Total earned so far · RM22 per session</div>
        <TrendChart data={data} />
      </>}
  </div>;
}
