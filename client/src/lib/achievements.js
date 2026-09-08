import { getRank, getRankTier } from './rankUtils';

// Requirement text + a `met` check per (achievement type, rarity). Types
// match BADGE_TYPES' keys in FifaCard.jsx (matches/mvp/ranked) exactly, so
// this can drive both the achievement gallery and (later) real unlocking
// wherever a badge's rarity is currently picked by hand.
//
// mvp_count: game_ratings' admin_bonus was flattened (see
// 20260831010000_flatten_game_award_ranking.sql) so every manager award
// pick counts equally — there's no persisted "the one true MVP" anymore,
// only "won an award N times". mvp_count is the closest real signal to
// "become MVP", so that's what these thresholds check against.
//
// ranked tiers check the player's CURRENT standing (today's total_points)
// for their CURRENT tier, but treat any tier they've already ranked past
// as automatically satisfied — once you're in Perak you've necessarily
// beaten every Gangsa player who stayed behind, so there's no need to have
// literally been top 3 while you were still there. This needs no history:
// "have I ranked past tier X" is derivable from today's total_points alone,
// unlike "was I ever top 3 of tier X specifically" which nothing persists.
const TIER_ORDER = ['novis', 'gangsa', 'perak', 'emas'];
function hasPassedTier(profile, tier) {
  const current = getRankTier(getRank(profile?.total_points || 0));
  return TIER_ORDER.indexOf(current) > TIER_ORDER.indexOf(tier);
}

export const ACHIEVEMENT_REQUIREMENTS = {
  matches: {
    common: { text: 'Play 3 matches', met: p => (p?.games_played || 0) >= 3 },
    rare: { text: 'Play 10 matches', met: p => (p?.games_played || 0) >= 10 },
    epic: { text: 'Play 25 matches', met: p => (p?.games_played || 0) >= 25 },
    legendary: { text: 'Play 50 matches', met: p => (p?.games_played || 0) >= 50 },
  },
  mvp: {
    common: { text: 'Become MVP 1 time', met: p => (p?.mvp_count || 0) >= 1 },
    rare: { text: 'Become MVP 5 times', met: p => (p?.mvp_count || 0) >= 5 },
    epic: { text: 'Become MVP 15 times', met: p => (p?.mvp_count || 0) >= 15 },
    legendary: { text: 'Become MVP 30 times', met: p => (p?.mvp_count || 0) >= 30 },
  },
  ranked: {
    common: { text: 'Joined Bolahh', met: () => true },
    rare: { text: 'Reach Top 3 in Gangsa tier or higher', met: (p, top3) => hasPassedTier(p, 'gangsa') || !!top3?.gangsa },
    epic: { text: 'Reach Top 3 in Perak tier or higher', met: (p, top3) => hasPassedTier(p, 'perak') || !!top3?.perak },
    // Emas is the top tier — there's nothing higher to qualify through, so
    // this stays a live check: only players currently top 3 in Emas unlock it.
    legendary: { text: 'Reach Top 3 in Emas tier', met: (p, top3) => !!top3?.emas },
  },
};

export const ACHIEVEMENT_RARITIES = ['legendary', 'epic', 'rare', 'common'];

// The highest tier `profile` currently qualifies for on `type`, or null if
// they haven't met even the common requirement yet — used to cap what a
// player is allowed to pick for a badge slot (they can display any tier up
// to this, never one they haven't earned).
export function highestEarnedRarity(type, profile, top3) {
  const reqs = ACHIEVEMENT_REQUIREMENTS[type];
  if (!reqs) return null;
  return ACHIEVEMENT_RARITIES.find(r => reqs[r].met(profile, top3)) || null;
}

// Whether `profile` currently sits top-3 in each competitive tier, given
// `allProfiles` (every profile with total_points > 0 — see
// LeaderboardPage.jsx's fetchLeaderboard for the same query/logic this
// mirrors). A player only ever belongs to one tier at a time (their
// current rank), so at most one of these three can ever be true.
export function computeTop3Tiers(profile, allProfiles) {
  const result = { gangsa: false, perak: false, emas: false };
  if (!profile) return result;
  const tier = getRankTier(getRank(profile.total_points || 0));
  if (!(tier in result)) return result;
  const tierPeers = allProfiles
    .filter(p => getRankTier(getRank(p.total_points || 0)) === tier)
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  const idx = tierPeers.findIndex(p => p.id === profile.id);
  if (idx > -1 && idx < 3) result[tier] = true;
  return result;
}
