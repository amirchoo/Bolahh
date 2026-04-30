// ─────────────────────────────────────────────
//  Bolahh Rank System
//  Points per game:
//    Attendance: +5 (automatic)
//    Goal:       +3
//    Assist:     +2
//    Defending:  +2
//    Keeping:    +2
//    Dribble:    +2
//    Chance:     +2
//    Manner:     +2
//    Admin Bonus: -5 to +5
// ─────────────────────────────────────────────

export const RANKS = [
  { name: 'Novis',      minPoints: 0,   maxPoints: 30            },
  { name: 'Gangsa III', minPoints: 31,  maxPoints: 130, minGames: 1 },
  { name: 'Gangsa II',  minPoints: 131, maxPoints: 230, minGames: 1 },
  { name: 'Gangsa I',   minPoints: 231, maxPoints: 330, minGames: 1 },
  { name: 'Perak III',  minPoints: 331, maxPoints: 430, minGames: 1 },
  { name: 'Perak II',   minPoints: 431, maxPoints: 530, minGames: 1 },
  { name: 'Perak I',    minPoints: 531, maxPoints: 630, minGames: 1 },
  { name: 'Emas III',   minPoints: 631, maxPoints: 730, minGames: 1 },
  { name: 'Emas II',    minPoints: 731, maxPoints: 830, minGames: 1 },
  { name: 'Emas I',     minPoints: 831, maxPoints: Infinity, minGames: 1 },
];

// Hard cap on total_points
export const MAX_POINTS = 930;

export function getRank(totalPoints, gamesPlayed) {
  if ((gamesPlayed || 0) < 1 || totalPoints <= 30) return 'Novis';
  if (totalPoints <= 130) return 'Gangsa III';
  if (totalPoints <= 230) return 'Gangsa II';
  if (totalPoints <= 330) return 'Gangsa I';
  if (totalPoints <= 430) return 'Perak III';
  if (totalPoints <= 530) return 'Perak II';
  if (totalPoints <= 630) return 'Perak I';
  if (totalPoints <= 730) return 'Emas III';
  if (totalPoints <= 830) return 'Emas II';
  return 'Emas I';
}

export function getRankColor(rank) {
  if (rank === 'Novis')          return '#888880';
  if (rank.startsWith('Gangsa')) return '#cd7f32';
  if (rank.startsWith('Perak'))  return '#a8a9ad';
  if (rank.startsWith('Emas'))   return '#FFD700';
  return '#888880';
}

export function getRankTier(rank) {
  if (rank === 'Novis')          return 'novis';
  if (rank.startsWith('Gangsa')) return 'gangsa';
  if (rank.startsWith('Perak'))  return 'perak';
  if (rank.startsWith('Emas'))   return 'emas';
  return 'novis';
}

// Card stat budget — Novis: 0 (grey locked), Gangsa III: 180 → Emas I: 594
export function getCardBudget(totalPoints, gamesPlayed) {
  if ((gamesPlayed || 0) < 1 || totalPoints <= 30) return 0;
  const pts = Math.min(totalPoints, MAX_POINTS);
  return Math.min(594, Math.round(180 + ((pts - 31) / (MAX_POINTS - 31)) * 414));
}
