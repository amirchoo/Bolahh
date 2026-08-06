import { getRankColor, getRankTier } from '../lib/rankUtils';
import { getCardTheme } from './FifaCard';

const formatDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').reverse().join('.');

// rank: e.g. "Gangsa II" — updatedDate: ISO string of the most recent rated game
export default function RankBadge({ rank, updatedDate }) {
  const theme = getCardTheme(rank);
  const color = getRankColor(rank);
  const [tierName, numeral] = rank.includes(' ') ? rank.split(' ') : [rank, null];

  return (
    <div style={{
      background: theme.bg, border: `2px solid ${theme.border}`, borderRadius: 20,
      padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', minHeight: 220,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
    }}>
      <svg viewBox="0 0 100 118" width="92" height="108" style={{ marginBottom: 14 }}>
        <path
          d="M50 4 L92 16 V56 C92 88 74 106 50 114 C26 106 8 88 8 56 V16 Z"
          fill="rgba(0,0,0,0.15)" stroke={theme.border} strokeWidth="3"
        />
        <text x="50" y={numeral ? "58" : "68"} textAnchor="middle" fontFamily="'Bebas Neue'" fontSize={numeral ? 40 : 26} fill={theme.text} letterSpacing="1">
          {numeral || getRankTier(rank).toUpperCase()}
        </text>
        {numeral && (
          <text x="50" y="86" textAnchor="middle" fontFamily="'Space Mono'" fontSize="10" fontWeight="700" fill={theme.muted} letterSpacing="1">
            {tierName.toUpperCase()}
          </text>
        )}
      </svg>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 2, color: theme.text, marginBottom: 6 }}>
        {rank.toUpperCase()}
      </div>
      {updatedDate && (
        <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: theme.muted }}>
          Updated: {formatDate(updatedDate)}
        </div>
      )}
    </div>
  );
}
