import { supabase } from './supabaseClient';
import { getRank, getRankTier } from './rankUtils';

// mvp_count: game_ratings' admin_bonus was flattened (see
// 20260831010000_flatten_game_award_ranking.sql) so every manager award
// pick counts equally — there's no persisted "the one true MVP" anymore,
// only "won an award N times". mvp_count is the closest real signal to
// "become MVP", so that's what the 'mvp' type's thresholds check against.
//
// 'ranked' tiers check the player's CURRENT standing (today's total_points)
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

// Which profile column each non-ranked type's threshold checks against.
const STAT_FIELD = { matches: 'games_played', mvp: 'mvp_count' };

export const ACHIEVEMENT_RARITIES = ['legendary', 'epic', 'rare', 'common'];

// Requirement text + a `met` check per (achievement type, rarity), loaded
// from the admin-editable `badge_requirements` table (see the admin Badges
// tab and 20260912000000_add_badge_requirements_table.sql) instead of being
// hardcoded here, so thresholds/tiers/copy can be retuned without a deploy.
// Types match BADGE_TYPES' keys in FifaCard.jsx (matches/mvp/ranked).
//
// For 'ranked' rows, `tier` is the tier a player must have passed or be
// currently top-3 in — this single column reproduces the same rule for
// every rarity, common (tier: null) included: hasPassedTier(p, 'emas') is
// never true (nothing ranks above emas), so 'legendary' correctly reduces
// to "must be top-3 in Emas right now", exactly like 'rare'/'epic' reduce
// to "passed the tier, or currently top-3 in it".
export async function fetchAchievementRequirements() {
  const { data } = await supabase.from('badge_requirements').select('*');
  const reqs = {};
  (data || []).forEach(row => {
    reqs[row.type] = reqs[row.type] || {};
    reqs[row.type][row.rarity] = {
      text: row.label,
      met: row.type === 'ranked'
        ? (p, top3) => !row.tier || hasPassedTier(p, row.tier) || !!top3?.[row.tier]
        : p => (p?.[STAT_FIELD[row.type]] || 0) >= (row.threshold || 0),
    };
  });
  return reqs;
}

// The highest tier `profile` currently qualifies for on `type`, or null if
// they haven't met even the common requirement yet — used to cap what a
// player is allowed to pick for a badge slot (they can display any tier up
// to this, never one they haven't earned). `reqs` is a fetchAchievementRequirements() result.
export function highestEarnedRarity(type, profile, top3, reqs) {
  const typeReqs = reqs?.[type];
  if (!typeReqs) return null;
  return ACHIEVEMENT_RARITIES.find(r => typeReqs[r]?.met(profile, top3)) || null;
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
