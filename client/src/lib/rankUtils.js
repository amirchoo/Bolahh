// ─────────────────────────────────────────────
//  Bolahh Rank System
//  Max points: 594 (Emas I)
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
  { name: 'Novis',      minPoints: 0,   maxPoints: 30  },
  { name: 'Gangsa III', minPoints: 31,  maxPoints: 89,       minGames: 2  },
  { name: 'Gangsa II',  minPoints: 90,  maxPoints: 149,      minGames: 2  },
  { name: 'Gangsa I',   minPoints: 150, maxPoints: 209,      minGames: 2  },
  { name: 'Perak V',    minPoints: 210, maxPoints: 269,      minGames: 2  },
  { name: 'Perak IV',   minPoints: 270, maxPoints: 329,      minGames: 2  },
  { name: 'Perak III',  minPoints: 330, maxPoints: 389,      minGames: 2  },
  { name: 'Perak II',   minPoints: 390, maxPoints: 449,      minGames: 2  },
  { name: 'Perak I',    minPoints: 450, maxPoints: 509,      minGames: 2  },
  { name: 'Emas III',   minPoints: 510, maxPoints: 539,      minGames: 2  },
  { name: 'Emas II',    minPoints: 540, maxPoints: 569,      minGames: 2  },
  { name: 'Emas I',     minPoints: 570, maxPoints: Infinity, minGames: 2  },
];

// Hard cap on total_points
export const MAX_POINTS = 594;

export function getRank(totalPoints, gamesPlayed) {
  const pts = Math.min(totalPoints, MAX_POINTS);
  if (pts <= 30)  return 'Novis';
  if (pts <= 90)  return 'Gangsa III';
  if (pts <= 150) return 'Gangsa II';
  if (pts <= 210) return 'Gangsa I';
  if (pts <= 270) return 'Perak V';
  if (pts <= 330) return 'Perak IV';
  if (pts <= 390) return 'Perak III';
  if (pts <= 450) return 'Perak II';
  if (pts <= 510) return 'Perak I';
  if (pts <= 540) return 'Emas III';
  if (pts <= 570) return 'Emas II';
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

// Card stat budget — scales from 180 (Gangsa III) to 594 (Emas I)
// Novis gets 0 budget — grey locked card
export function getCardBudget(totalPoints) {
  const pts = Math.min(totalPoints, MAX_POINTS);
  if (pts < 30) return 0;
  return Math.min(594, Math.round(180 + (pts / MAX_POINTS) * 414));
}
