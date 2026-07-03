/**
 * Inline stat badge chips — shows earned stat increments (e.g. SHO+3, PAS+2).
 * Props: rating (object with stat keys), size ('sm' | 'md')
 *
 * Stat keys: goals, assists, successful_dribble, good_defending, good_keeping, good_chance
 */

const STAT_KEYS = [
  { key: 'goals',              label: 'SHO', color: '#f87171' },
  { key: 'assists',            label: 'PAS', color: '#4ade80' },
  { key: 'successful_dribble', label: 'DRI', color: '#F09D51' },
  { key: 'good_defending',     label: 'DEF', color: '#a78bfa' },
  { key: 'good_keeping',       label: 'PHY', color: '#34d399' },
  { key: 'good_chance',        label: 'PAC', color: '#64a0ff' },
];

export default function StatChips({ rating, size = 'md' }) {
  const active = STAT_KEYS.filter(({ key }) => (rating[key] || 0) !== 0);
  if (!active.length) return null;

  const pad = size === 'sm' ? '1px 5px' : '2px 7px';
  const fontSize = size === 'sm' ? 9 : 10;

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {active.map(({ key, label, color }) => {
        const val = rating[key] || 0;
        return (
          <span key={key} style={{
            background: `${color}15`, border: `1px solid ${color}38`,
            borderRadius: 5, padding: pad,
            fontSize, fontFamily: "'Space Mono'", color, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

export { STAT_KEYS };
