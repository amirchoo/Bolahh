import { useId, useRef, useState } from 'react';

const VW = 640, VH = 250;
const PAD_L = 44, PAD_R = 18, PAD_T = 18, PAD_B = 42;
const PLOT_W = VW - PAD_L - PAD_R;
const PLOT_H = VH - PAD_T - PAD_B;

const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-MY', {
  day: 'numeric', month: 'short', year: 'numeric',
});

const formatAmount = (amount) => `RM ${Math.round(Number(amount))}`;

export default function IncomeChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);
  const clipId = useId();

  if (!data || data.length === 0) {
    return <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>PAY</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No paid income recorded yet.</p>
    </div>;
  }

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

  return <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>PAY</div>
      <div style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{formatAmount(data.reduce((sum, point) => sum + point.amount, 0))}</div>
    </div>
    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Collected from paid player bookings</div>
    <div style={{ position: 'relative' }}>
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
    </div>
  </div>;
}
