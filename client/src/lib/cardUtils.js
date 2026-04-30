// ─────────────────────────────────────────────
//  Bolahh Card Stats — auto-calculated from game_ratings
//
//  Each FIFA card stat maps 1:1 to one game_ratings column:
//    PAC → good_chance      (pace: runs into space, getting chances)
//    SHO → goals
//    PAS → assists
//    DRI → successful_dribble
//    DEF → good_defending
//    PHY → good_keeping
//
//  Formula: stat = 30 + clamp(69 × confidence × perfRatio, 0, 69)
//    confidence  = n / (n + 10)  — Bayesian smoothing, 50% trust at 10 rated games
//    perfRatio   = (totalRaw / n) / EXCELLENT_BENCHMARK
//    base 30 = Novis floor; cap 99
// ─────────────────────────────────────────────

const EXCELLENT = {
  pac: 1.5,  // ~1.5 good chances per rated game
  sho: 0.8,  // ~0.8 goals per rated game (goals are rarer)
  pas: 1.5,  // ~1.5 assists per rated game
  dri: 1.5,  // ~1.5 dribbles per rated game
  def: 2.0,  // ~2 defends per rated game (defenders are most active)
  phy: 0.8,  // ~0.8 keeps per rated game (keeping is a specialist role)
};

const BAYESIAN_C = 10;

function calcStat(totalRaw, n, excellent) {
  if (n === 0) return 30;
  const perfRatio = (totalRaw / n) / excellent;
  const confidence = n / (n + BAYESIAN_C);
  return Math.min(99, 30 + Math.round(69 * confidence * perfRatio));
}

export function calculateCardStats(gameRatings) {
  const n = gameRatings.length;
  if (n === 0) return { pac: 30, sho: 30, pas: 30, dri: 30, def: 30, phy: 30, overall: 30 };

  const t = { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
  for (const r of gameRatings) {
    t.pac += (r.good_chance || 0);
    t.sho += (r.goals || 0);
    t.pas += (r.assists || 0);
    t.dri += (r.successful_dribble || 0);
    t.def += (r.good_defending || 0);
    t.phy += (r.good_keeping || 0);
  }

  const s = {
    pac: calcStat(t.pac, n, EXCELLENT.pac),
    sho: calcStat(t.sho, n, EXCELLENT.sho),
    pas: calcStat(t.pas, n, EXCELLENT.pas),
    dri: calcStat(t.dri, n, EXCELLENT.dri),
    def: calcStat(t.def, n, EXCELLENT.def),
    phy: calcStat(t.phy, n, EXCELLENT.phy),
  };
  s.overall = Math.round((s.pac + s.sho + s.pas + s.dri + s.def + s.phy) / 6);
  return s;
}
