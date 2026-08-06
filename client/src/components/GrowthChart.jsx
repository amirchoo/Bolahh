import { useState, useRef, useMemo, useId } from 'react';
import { IoTrendingUpOutline } from 'react-icons/io5';
import { RANKS, getRank, getRankColor, getRankIndex } from '../lib/rankUtils';

const VW = 320, VH = 190;
const WINDOW_SIZE = 3; // tiers visible at once — climbing off the top reveals the next one
const PAD_L = 58, PAD_R = 28, PAD_T = 10, PAD_B = 10;
const PLOT_W = VW - PAD_L - PAD_R;
const PLOT_H = VH - PAD_T - PAD_B;
const RECENT_COUNT = 8;

const formatDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// history: [{ date: isoString, overall: number }, ...] ascending by date
export default function GrowthChart({ history }) {
  const [range, setRange] = useState('all'); // 'recent' | 'all'
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);
  const clipId = useId();

  const points = useMemo(() => {
    if (!history || history.length === 0) return [];
    return range === 'recent' ? history.slice(-RECENT_COUNT) : history;
  }, [history, range]);

  if (!history || history.length < 2) {
    return (
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px', textAlign: 'center',
        maxWidth: 440, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <IoTrendingUpOutline size={28} color="var(--muted)" />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          Play a couple more games to start seeing your growth here.
        </p>
      </div>
    );
  }

  const n = points.length;
  const first = points[0].overall;
  const last = points[n - 1].overall;
  const delta = last - first;
  const firstRank = getRank(first), lastRank = getRank(last);
  const promoted = firstRank !== lastRank && delta > 0;

  // Only a 3-tier window around your CURRENT rank is visible — one tier below
  // (where you climbed from), your tier, and one above. Get promoted and the
  // window slides up, revealing the next tier that wasn't shown before.
  const currentIdx = getRankIndex(lastRank);
  const windowStart = Math.max(0, Math.min(currentIdx - 1, RANKS.length - WINDOW_SIZE));
  const windowEnd = Math.min(RANKS.length - 1, windowStart + WINDOW_SIZE - 1);
  const visibleTiers = RANKS.slice(windowStart, windowEnd + 1);
  const minV = visibleTiers[0].minOvr;
  const maxV = visibleTiers[visibleTiers.length - 1].maxOvr + 1;

  const xAt = (i) => PAD_L + (n === 1 ? 0 : (i / (n - 1)) * PLOT_W);
  const yAt = (v) => PAD_T + (1 - (v - minV) / (maxV - minV)) * PLOT_H;

  const linePath = points.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(h.overall)}`).join(' ');
  const areaPath = `${linePath} L ${xAt(n - 1)} ${PAD_T + PLOT_H} L ${xAt(0)} ${PAD_T + PLOT_H} Z`;

  const activeIdx = hoverIdx ?? n - 1;
  const active = points[activeIdx];

  const handleMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VW;
    const ratio = Math.max(0, Math.min(1, (relX - PAD_L) / PLOT_W));
    const idx = Math.round(ratio * (n - 1));
    setHoverIdx(idx);
  };

  const tooltipLeftPct = (xAt(activeIdx) / VW) * 100;
  const tooltipAboveTop = yAt(active.overall) < 34;

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '20px',
      maxWidth: 440, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)' }}>LEVEL PROGRESSION</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['recent', 'Recent'], ['all', 'All']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => { setRange(key); setHoverIdx(null); }} style={{
              background: range === key ? 'var(--accent)' : 'var(--card2)',
              color: range === key ? '#fff' : 'var(--muted)',
              border: `1px solid ${range === key ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
        {promoted
          ? <span style={{ color: '#4ade80' }}>Promoted {firstRank} → {lastRank} since {formatDate(points[0].date)}</span>
          : delta > 0
          ? <span style={{ color: '#4ade80' }}>+{delta} OVR since {formatDate(points[0].date)}</span>
          : delta < 0
          ? <span style={{ color: 'var(--muted)' }}>{delta} OVR since {formatDate(points[0].date)}</span>
          : <span style={{ color: 'var(--muted)' }}>Steady since {formatDate(points[0].date)}</span>}
      </div>

      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIdx(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          </defs>

          {visibleTiers.map(tier => {
            const bandTop = yAt(tier.maxOvr + 1);
            const bandBottom = yAt(tier.minOvr);
            const isCurrent = tier.name === lastRank;
            return (
              <g key={tier.name}>
                <rect x={PAD_L} y={bandTop} width={PLOT_W} height={bandBottom - bandTop} fill={getRankColor(tier.name)} opacity={isCurrent ? 0.12 : 0.035} />
                <line x1={PAD_L} y1={bandBottom} x2={VW - PAD_R} y2={bandBottom} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD_L - 6} y={bandBottom + 3} textAnchor="end" fontFamily="'Space Mono'" fontSize="9" fontWeight={isCurrent ? '700' : '400'} fill={isCurrent ? 'var(--text)' : 'var(--muted)'}>{tier.name}</text>
              </g>
            );
          })}

          <g clipPath={`url(#${clipId})`}>
            <path d={areaPath} fill="var(--accent)" opacity="0.1" stroke="none" />
            <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {hoverIdx !== null && (
              <line x1={xAt(hoverIdx)} y1={PAD_T} x2={xAt(hoverIdx)} y2={PAD_T + PLOT_H} stroke="var(--border)" strokeWidth="1" />
            )}

            <circle cx={xAt(activeIdx)} cy={yAt(active.overall)} r="5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
          </g>

          <text
            x={xAt(n - 1) + 7} y={yAt(last) + 4}
            fontFamily="'Space Mono'" fontSize="12" fontWeight="700" fill="var(--text)"
          >{last}</text>
        </svg>

        {hoverIdx !== null && (
          <div style={{
            position: 'absolute', left: `${tooltipLeftPct}%`, top: tooltipAboveTop ? '100%' : 0,
            transform: `translate(-50%, ${tooltipAboveTop ? '4px' : '-100%'})`,
            background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '5px 9px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 4,
          }}>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{active.overall} OVR · {getRank(active.overall)}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{formatDate(active.date)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
