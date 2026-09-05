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

function TrendChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);
  const clipId = useId();

  const maxAmount = Math.max(...data.map(point => point.amount), 1);
  const yMax = Math.ceil(maxAmount / 50) * 50 || 50;
  const xAt = (index) => PAD_L + (data.length === 1 ? PLOT_W / 2 : (index / (data.length - 1)) * PLOT_W);
  const yAt = (amount) => PAD_T + (1 - amount / yMax) * PLOT_H;
  const linePath = data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(point.amount)}`).join(' ');
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
      <defs><clipPath id={clipId}><rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} /></clipPath></defs>
      {[0, 0.5, 1].map(ratio => {
        const y = PAD_T + ratio * PLOT_H;
        return <g key={ratio}><line x1={PAD_L} y1={y} x2={VW - PAD_R} y2={y} stroke="var(--border)" strokeWidth="1" /><text x={PAD_L - 8} y={y + 4} textAnchor="end" fontFamily="'Space Mono'" fontSize="10" fill="var(--muted)">{formatAmount(yMax * (1 - ratio))}</text></g>;
      })}
      <g clipPath={`url(#${clipId})`}>
        <path d={areaPath} fill="var(--accent)" opacity="0.12" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {hoverIdx !== null && <line x1={xAt(hoverIdx)} y1={PAD_T} x2={xAt(hoverIdx)} y2={PAD_T + PLOT_H} stroke="var(--border)" strokeWidth="1" />}
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
        {rows.map(row => (
          <div key={row.managerId}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>
              <span>{row.managerName}</span>
              <span style={{ fontFamily: "'Space Mono'", fontWeight: 700 }}>{formatAmount(row.amount)}</span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(row.amount / maxAmount) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
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
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{isManagerMode ? 'No manager payouts recorded yet.' : 'No paid income recorded yet.'}</p>
    </div>;
  }

  const totalAmount = isManagerMode
    ? data.filter(row => row.month === activeMonth).reduce((sum, row) => sum + row.amount, 0)
    : data.reduce((sum, row) => sum + row.amount, 0);

  return <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>PAY</div>
      <div style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{formatAmount(totalAmount)}</div>
    </div>
    {isManagerMode
      ? <ManagerBreakdown data={data} selectedMonth={activeMonth} onSelectMonth={setSelectedMonth} months={months} />
      : <>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Collected from paid player bookings</div>
        <TrendChart data={data} />
      </>}
  </div>;
}
