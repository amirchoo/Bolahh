import { useEffect, useState } from 'react';
import { fetchBorderCatalog, resolveBorderRender } from '../lib/borderCatalog';

/**
 * Frames a row/card with a player's equipped border art using CSS
 * border-image, sliced per-edge (top/right/bottom/left) rather than one
 * uniform value: uploaded border art (e.g. a 498×110 canvas with a status
 * plate baked across the top edge, transparent middle) has a taller top
 * band than its sides, so the top slice needs more source height than the
 * plain side/bottom frame. border-image-slice numbers are unitless
 * (source-image px, not %) and border-width is a fixed px value, so the
 * frame's rendered thickness never scales with the row's own size.
 *
 * The default `thickness` is capped at (not matching) the row's own
 * padding — 12px 14px in every caller today — because this is a
 * decorative overlay with zero layout footprint (position:absolute,
 * inset:0): whatever it paints beyond the row's padding lands directly on
 * top of real content (name, stats) with no way to push that content
 * aside. Keeping thickness a couple px under padding leaves a safety
 * margin against rounding. If a caller's row uses different padding, pass
 * `thickness` sized to it.
 *
 * Place as the last child of a position:relative row so it paints above
 * row content; it never blocks clicks (pointer-events: none).
 */
export default function EquippedBorderFrame({
  equippedBorder, context = 'roster', borderRadius = 12,
  slice = '32 16 16 16', thickness = '11px 13px 11px 13px',
}) {
  const [borderRender, setBorderRender] = useState(null);

  useEffect(() => {
    if (!equippedBorder) return;
    let cancelled = false;
    fetchBorderCatalog().then(rows => {
      if (cancelled) return;
      const row = rows.find(r => r.key === equippedBorder);
      setBorderRender(resolveBorderRender(row, context));
    });
    return () => { cancelled = true; };
  }, [equippedBorder, context]);

  // Guard against stale state from a previously-equipped border rather than
  // clearing it synchronously in the effect above (which would trip
  // react-hooks/set-state-in-effect).
  const effectiveRender = equippedBorder ? borderRender : null;
  if (effectiveRender?.type !== 'image') return null;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, borderRadius,
        pointerEvents: 'none', zIndex: 2,
        borderStyle: 'solid', borderWidth: thickness, borderColor: 'transparent',
        borderImageSource: `url(${effectiveRender.imageUrl})`,
        borderImageSlice: slice,
        borderImageRepeat: 'stretch',
      }}
    />
  );
}
