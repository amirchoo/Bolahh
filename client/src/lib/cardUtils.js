// Each stat tap in the rating page increments that stat by 1.
// Card stat = clamp(30 + lifetime_taps, 30, 99) per stat.
// OVR = round average of 6 card stats.
// profiles.total_points stores the latest computed OVR.

export function calculateCardStats(gameRatings) {
  if (!gameRatings || gameRatings.length === 0) {
    return { pac: 30, sho: 30, pas: 30, dri: 30, def: 30, phy: 30, overall: 30 };
  }

  const taps = { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
  for (const r of gameRatings) {
    taps.pac += (r.good_chance        || 0);
    taps.sho += (r.goals              || 0);
    taps.pas += (r.assists            || 0);
    taps.dri += (r.successful_dribble || 0);
    taps.def += (r.good_defending     || 0);
    taps.phy += (r.good_keeping       || 0);
  }

  const s = {
    pac: Math.max(30, Math.min(99, 30 + taps.pac)),
    sho: Math.max(30, Math.min(99, 30 + taps.sho)),
    pas: Math.max(30, Math.min(99, 30 + taps.pas)),
    dri: Math.max(30, Math.min(99, 30 + taps.dri)),
    def: Math.max(30, Math.min(99, 30 + taps.def)),
    phy: Math.max(30, Math.min(99, 30 + taps.phy)),
  };
  s.overall = Math.round((s.pac + s.sho + s.pas + s.dri + s.def + s.phy) / 6);
  return s;
}
