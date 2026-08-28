// Card border cosmetics: an overlay layer drawn on top of a FIFA-style card
// that never touches the rank-based gradient/colors. The catalog itself
// (label, rarity, unlock condition, optional custom image) lives in the
// `card_border_catalog` DB table so admin-uploaded borders show up with no
// code deploy — see supabase/migrations/20260821000000_add_border_catalog_table.sql
// and the grant_card_borders() trigger that auto-unlocks them.
//
// The 7 original borders are drawn in code rather than from an image (their
// catalog row has image_url = null); their render parameters stay here as a
// small declarative descriptor — frame / corners / ticks / badgeIcon / laurel
// / animated — so FifaCard.jsx (SVG) and cardCanvas.js (Canvas2D) can share
// one interpretation instead of bespoke path data per border.
import { supabase } from './supabaseClient';

const PROCEDURAL_BORDERS = {
  'rookie-stitch':  { color: '#c9cdd1', frame: 'thin', frameDash: true },
  'silver-corners': { color: '#9fb4c7', accentColor: '#e8f1f9', frame: 'thin', corners: true },
  'podium-trim':    { color: '#c98a4b', accentColor: '#f0c896', frame: 'thin', ticks: 5 },
  'gold-frame':     { color: '#e8b923', accentColor: '#fff2c2', frame: 'double', corners: true },
  'mvp-crown':      { color: '#d9a441', accentColor: '#ffe27a', frame: 'thin', corners: true, badgeIcon: 'crown' },
  'legend-laurel':  { color: '#e9edf2', accentColor: '#7fd0ff', frame: 'double', laurel: true, animated: true },
  'mvp-royal':      { color: '#f0c419', accentColor: '#ff5d5d', frame: 'double', corners: true, badgeIcon: 'crown', laurel: true, animated: true },
};

export const RARITY_COLORS = {
  common: '#9aa0a6',
  rare: '#4a9eff',
  epic: '#b34aff',
  legendary: '#ffb020',
};

let catalogPromise = null;

// Caches the in-flight promise (not just the resolved rows) so many
// simultaneous callers — e.g. every small FifaCard preview in the Borders
// picker mounting at once — share one request instead of firing duplicates.
export function fetchBorderCatalog() {
  if (!catalogPromise) {
    catalogPromise = supabase
      .from('card_border_catalog')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => data || []);
  }
  return catalogPromise;
}

const IMAGE_FIELD_BY_CONTEXT = {
  card: 'card_image_url',
  leaderboard: 'leaderboard_image_url',
  roster: 'roster_image_url',
};

// Given a card_border_catalog row, returns what to draw for the given render
// context: an image overlay if that context's art has been uploaded,
// otherwise (card context only) the matching procedural descriptor. The
// leaderboard/roster contexts have no procedural fallback — a border with
// only card art simply shows nothing extra there until that variant exists.
export function resolveBorderRender(row, context = 'card') {
  if (!row) return null;
  const imageUrl = row[IMAGE_FIELD_BY_CONTEXT[context]];
  if (imageUrl) return { type: 'image', imageUrl };
  if (context !== 'card') return null;
  const procedural = PROCEDURAL_BORDERS[row.key];
  return procedural ? { type: 'procedural', ...procedural } : null;
}
