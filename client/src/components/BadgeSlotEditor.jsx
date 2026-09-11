import { useState } from 'react';
import { MdDragIndicator } from 'react-icons/md';
import { BADGE_TYPE_LIST, BADGE_RARITY_COLORS, BADGE_RARITY_LABELS } from './FifaCard';

// Achievement badges: a fixed set of 3 types (BADGE_TYPE_LIST), each with an
// enabled flag and a rarity. Array order is display order, so reordering is
// just swapping array positions. Shared between every place badges get
// edited — the Card Maker (a local mockup, no persistence), the admin
// Player Stats editor and an admin's own Profile page (both persist to a
// player's `achievement_badges` column).
export function badgesToSlots(stored) {
  const arr = Array.isArray(stored) ? stored : [];
  const slots = arr
    .filter(b => BADGE_TYPE_LIST.some(t => t.key === b.type))
    .map(b => ({ type: b.type, rarity: b.rarity || 'common', enabled: true }));
  BADGE_TYPE_LIST.forEach(({ key }) => {
    if (!slots.some(s => s.type === key)) slots.push({ type: key, rarity: 'common', enabled: false });
  });
  return slots;
}
export function slotsToBadges(slots) {
  return slots.filter(s => s.enabled).map(({ type, rarity }) => ({ type, rarity }));
}

// A small rounded, tinted-background label — rarity tiers (and the locked
// state) all read through this one shape so the row's right-hand side is
// visually consistent regardless of which case it's in.
function Pill({ color, children, as, style, ...rest }) {
  const As = as || 'span';
  return (
    <As style={{
      display: 'inline-block', flex: '0 0 auto',
      background: `${color}22`, color,
      border: `1px solid ${color}55`,
      borderRadius: 999, padding: '3px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap', fontFamily: 'inherit',
      ...style,
    }} {...rest}>{children}</As>
  );
}

// Free-choice rarity picker for the admin (unrestricted) path — a custom
// pill + popover rather than a native <select>, because the app's global
// stylesheet forces input/select colors with !important (for the plain
// dark form fields everywhere else), which silently overrode any inline
// color/background on a <select> here. `openIndex`/`onOpenIndex` are lifted
// to the parent list so opening one row's picker closes any other's,
// mirroring the achievement gallery's tooltip pattern.
function RarityPicker({ value, onChange, disabled, open, onToggle }) {
  return (
    <div style={{ position: 'relative' }}>
      <Pill as="button" type="button" color={BADGE_RARITY_COLORS[value]}
        onClick={() => !disabled && onToggle()}
        style={{ cursor: disabled ? 'default' : 'pointer' }}
      >
        {BADGE_RARITY_LABELS[value]}
      </Pill>
      {open && (
        <>
          {/* Invisible full-page backdrop so a click anywhere outside the
              popover closes it, without a real click-outside listener. */}
          <div onClick={onToggle} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 2,
            background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 6, display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {Object.keys(BADGE_RARITY_COLORS).map(r => (
              <Pill key={r} as="button" type="button" color={BADGE_RARITY_COLORS[r]}
                onClick={() => { onChange(r); onToggle(); }}
                style={{ cursor: 'pointer', textAlign: 'left' }}
              >
                {BADGE_RARITY_LABELS[r]}
              </Pill>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Edits build up in a local draft and only reach the caller (and therefore
// the FifaCard preview + the database) on "Apply changes" — not on every
// checkbox/reorder/rarity click. Applying every change live meant enabled
// badges each mounted onto the card at whatever moment their checkbox was
// clicked, so their float animation (synced to the wall clock, but only
// from the moment each one appears) started out of step with badges already
// showing. Committing the whole set in one state update makes every newly
// shown badge mount in the same render, so they all start in phase.
// `earnedRarities`, when given, is a { [type]: rarity | null } map — the
// highest tier that type's real stats currently qualify for (see
// highestEarnedRarity in lib/achievements.js), or null if none yet. With
// it, a slot can't be enabled until something's earned, and its rarity is
// a fixed read-only pill rather than a free-choice dropdown — the caller
// is expected to have already clamped `slots[i].rarity` to the earned
// value before handing them in. Omit the prop entirely (as the admin-only
// callers below do) to keep the original unrestricted picker.
export function BadgeSlotEditor({ slots, onChange, earnedRarities }) {
  const slotsKey = JSON.stringify(slots);
  const [draft, setDraft] = useState(slots);
  const [committedKey, setCommittedKey] = useState(slotsKey);
  // Resets the draft whenever the caller hands us a genuinely different
  // `slots` (a different player selected, a fresh profile load) — but not on
  // every render, since a new-but-identical array would otherwise wipe
  // in-progress edits. Adjusting state during render (React's documented
  // pattern for this) rather than in an effect, so the reset is visible in
  // the same render instead of causing an extra one.
  if (slotsKey !== committedKey) {
    setCommittedKey(slotsKey);
    setDraft(slots);
  }
  const dirty = JSON.stringify(draft) !== slotsKey;

  // Native HTML5 drag-and-drop rather than a library — only ever 3 rows,
  // so a full DnD dependency isn't worth pulling in. Both live in state
  // (not a ref) because the drop-target highlight below reads them during
  // render — reading a ref's `.current` during render is unsafe in React.
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [openRarityIndex, setOpenRarityIndex] = useState(null);

  const reorder = (from, to) => {
    if (from === to) return;
    const next = [...draft];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft(next);
  };
  const update = (index, patch) => {
    setDraft(draft.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {draft.map((slot, i) => {
        const typeInfo = BADGE_TYPE_LIST.find(t => t.key === slot.type);
        const earned = earnedRarities?.[slot.type];
        const locked = !!earnedRarities && !earned;
        // A row only joins the reorderable set once chosen — clicking it is
        // both "enable this" and "drag becomes available", there's no
        // separate checkbox. Picking the rarity pill (admin path) shouldn't
        // also toggle the row, so it stops propagation before this fires.
        const draggable = slot.enabled && !locked;
        const toggle = () => !locked && update(i, { enabled: !slot.enabled });
        return (
          <div
            key={slot.type}
            draggable={draggable}
            onClick={toggle}
            onDragStart={draggable ? (e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; } : undefined}
            onDragOver={draggable ? (e) => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i); } : undefined}
            onDrop={draggable ? (e) => {
              e.preventDefault();
              if (dragIndex !== null) reorder(dragIndex, i);
              setDragIndex(null);
              setDragOverIndex(null);
            } : undefined}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              // Chosen rows read as "greyed out" — a flatter, muted fill and
              // dimmed label — to read as settled/picked, while an unchosen
              // row stays at full contrast to invite the click that adds it.
              background: slot.enabled ? 'rgba(255,255,255,0.03)' : 'var(--card2)',
              border: `1px dashed ${dragOverIndex === i && dragIndex !== null && dragIndex !== i ? 'var(--accent)' : 'transparent'}`,
              outline: '1px solid var(--border)', outlineOffset: -1,
              opacity: locked ? 0.4 : 1,
              cursor: locked ? 'default' : 'pointer',
            }}
          >
            <MdDragIndicator
              size={18}
              color={draggable ? 'var(--accent)' : 'var(--border)'}
              style={{ flexShrink: 0, cursor: draggable ? 'grab' : 'inherit' }}
            />
            <span style={{
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 13, fontWeight: 600,
              color: slot.enabled ? 'var(--muted)' : 'var(--text)',
            }}>
              {typeInfo?.label || slot.type}
            </span>
            {earnedRarities ? (
              locked
                ? <Pill color="#9aa0a6">Not earned yet</Pill>
                : <Pill color={BADGE_RARITY_COLORS[earned]}>{BADGE_RARITY_LABELS[earned]}</Pill>
            ) : (
              <span onClick={e => e.stopPropagation()}>
                <RarityPicker
                  value={slot.rarity}
                  onChange={r => update(i, { rarity: r })}
                  disabled={!slot.enabled}
                  open={openRarityIndex === i}
                  onToggle={() => setOpenRarityIndex(o => (o === i ? null : i))}
                />
              </span>
            )}
          </div>
        );
      })}
      <button
        onClick={() => onChange(draft)}
        disabled={!dirty}
        style={{
          background: dirty ? 'var(--accent)' : 'var(--card2)',
          color: dirty ? '#fff' : 'var(--muted)',
          border: `1px solid ${dirty ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, padding: '8px 10px',
          fontSize: 13, fontWeight: 700,
          cursor: dirty ? 'pointer' : 'default',
        }}
      >
        Apply changes
      </button>
    </div>
  );
}
