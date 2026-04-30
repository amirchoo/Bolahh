// ─────────────────────────────────────────────
//  Bolahh Card Stats
//
//  Overall rating = directly from total_points (30 at 0 pts → 99 at 900 pts)
//
//  Individual stats = overall ± modifier based on in-game performance:
//    PAC → good_chance      (pace / runs into space)
//    SHO → goals
//    PAS → assists
//    DRI → successful_dribble
//    DEF → good_defending
//    PHY → good_keeping
//
//  Stat formula:
//    perfRatio   = (avgPerGame / excellent_benchmark), capped at 1.5
//    confidence  = n / (n + 10)   — grows with rated games, 50% at 10 games
//    modifier    = round(confidence × (perfRatio × 20 − 10))   — range −10 to +20
//    stat        = clamp(overall + modifier, 30, 99)
//
//  With no game history, all stats equal the overall (rank-derived baseline).
// ─────────────────────────────────────────────

const EXCELLENT = {
  pac: 1.5,  // ~1.5 good chances per rated game
  sho: 0.8,  // ~0.8 goals per rated game
  pas: 1.5,  // ~1.5 assists per rated game
  dri: 1.5,  // ~1.5 dribbles per rated game
  def: 2.0,  // ~2 defends per rated game
  phy: 0.8,  // ~0.8 keeps per rated game
};

const BAYESIAN_C = 10;

// Converts total_points (0–900) to an overall card rating (30–99)
export function getOverallFromPoints(totalPoints) {
  if (!totalPoints || totalPoints <= 0) return 30;
  return 30 + Math.round((Math.min(totalPoints, 900) / 900) * 69);
}

function calcStat(totalRaw, n, excellent, baseOverall) {
  if (n === 0) return baseOverall;
  const perfRatio = Math.min(1.5, (totalRaw / n) / excellent);
  const confidence = n / (n + BAYESIAN_C);
  // perfRatio 0 → −10, 0.5 → 0 (neutral), 1.0 → +10, 1.5 → +20
  const modifier = Math.round(confidence * (perfRatio * 20 - 10));
  return Math.min(99, Math.max(30, baseOverall + modifier));
}

export function calculateCardStats(gameRatings, totalPoints = 0) {
  const baseOverall = getOverallFromPoints(totalPoints);
  const n = gameRatings.length;

  if (n === 0) {
    return { pac: baseOverall, sho: baseOverall, pas: baseOverall, dri: baseOverall, def: baseOverall, phy: baseOverall, overall: baseOverall };
  }

  const t = { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
  for (const r of gameRatings) {
    t.pac += (r.good_chance         || 0);
    t.sho += (r.goals               || 0);
    t.pas += (r.assists             || 0);
    t.dri += (r.successful_dribble  || 0);
    t.def += (r.good_defending      || 0);
    t.phy += (r.good_keeping        || 0);
  }

  const s = {
    pac: calcStat(t.pac, n, EXCELLENT.pac, baseOverall),
    sho: calcStat(t.sho, n, EXCELLENT.sho, baseOverall),
    pas: calcStat(t.pas, n, EXCELLENT.pas, baseOverall),
    dri: calcStat(t.dri, n, EXCELLENT.dri, baseOverall),
    def: calcStat(t.def, n, EXCELLENT.def, baseOverall),
    phy: calcStat(t.phy, n, EXCELLENT.phy, baseOverall),
  };
  s.overall = Math.round((s.pac + s.sho + s.pas + s.dri + s.def + s.phy) / 6);
  return s;
}
