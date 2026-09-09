import { BADGE_TYPE_LIST, BADGE_RARITY_COLORS, BADGE_RARITY_LABELS } from './FifaCard';

// Purely a reflection of what's been picked in the achievement gallery above
// — selecting a badge there adds a row here, deselecting it removes the row
// entirely, and the row order is just `badges`' own order (whatever order
// they were picked in), so there's nothing to separately sort. Tapping a
// row's number here is a shortcut for the same removal, in case going back
// up to the gallery is inconvenient — but adding only ever happens up there,
// since only the gallery knows which tier a given type is currently unlocked
// at.
export default function BadgeReorderList({ badges, onChange }) {
  if (badges.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Click a badge above to add it here.</p>;
  }

  const remove = (type) => {
    onChange(badges.filter(b => b.type !== type));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {badges.map((b, i) => {
        const typeInfo = BADGE_TYPE_LIST.find(t => t.key === b.type);
        return (
          <div key={b.type} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 10px', borderRadius: 8,
            background: 'var(--card2)',
            outline: '1px solid var(--border)', outlineOffset: -1,
          }}>
            <button
              type="button"
              onClick={() => remove(b.type)}
              aria-label={`Remove ${typeInfo?.label || b.type}`}
              style={{
                flexShrink: 0, width: 16, textAlign: 'center', padding: 0,
                background: 'transparent', border: 'none',
                color: 'var(--accent)', fontSize: 13, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", cursor: 'pointer',
              }}
            >
              {i + 1}
            </button>
            <span style={{
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
            }}>
              {typeInfo?.label || b.type}
            </span>
            <span style={{
              display: 'inline-block',
              background: `${BADGE_RARITY_COLORS[b.rarity]}22`, color: BADGE_RARITY_COLORS[b.rarity],
              border: `1px solid ${BADGE_RARITY_COLORS[b.rarity]}55`,
              borderRadius: 999, padding: '3px 10px',
              fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
            }}>{BADGE_RARITY_LABELS[b.rarity]}</span>
          </div>
        );
      })}
    </div>
  );
}
