import { useState } from 'react';
import { MdDragIndicator } from 'react-icons/md';
import { BADGE_TYPE_LIST, BADGE_RARITY_COLORS, BADGE_RARITY_LABELS } from './FifaCard';

// Purely a reorder list — which badges are IN it is decided elsewhere
// (clicking a tile in the achievements gallery), so this component never
// adds or removes entries, only lets you drag them into a new order. The
// drag handle is the only interactive control on a row; there's no
// click-to-toggle here, unlike BadgeSlotEditor's free-choice admin rows.
export default function BadgeReorderList({ badges, onChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  if (badges.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Click a badge above to add it here.</p>;
  }

  const reorder = (from, to) => {
    if (from === to) return;
    const next = [...badges];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {badges.map((b, i) => {
        const typeInfo = BADGE_TYPE_LIST.find(t => t.key === b.type);
        return (
          <div
            key={b.type}
            draggable
            onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i); }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) reorder(dragIndex, i);
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--card2)',
              border: `1px dashed ${dragOverIndex === i && dragIndex !== null && dragIndex !== i ? 'var(--accent)' : 'transparent'}`,
              outline: '1px solid var(--border)', outlineOffset: -1,
            }}
          >
            <MdDragIndicator size={18} color="var(--accent)" style={{ flexShrink: 0, cursor: 'grab' }} />
            <span style={{
              flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
              background: 'var(--card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--muted)',
            }}>{i + 1}</span>
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
