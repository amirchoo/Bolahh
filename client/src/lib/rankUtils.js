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
  { name: 'Novis',      minPoints: 0,   maxPoints: 0             },
  { name: 'Gangsa III', minPoints: 1,   maxPoints: 100           },
  { name: 'Gangsa II',  minPoints: 101, maxPoints: 200           },
  { name: 'Gangsa I',   minPoints: 201, maxPoints: 300           },
  { name: 'Perak III',  minPoints: 301, maxPoints: 400           },
  { name: 'Perak II',   minPoints: 401, maxPoints: 500           },
  { name: 'Perak I',    minPoints: 501, maxPoints: 600           },
  { name: 'Emas III',   minPoints: 601, maxPoints: 700           },
  { name: 'Emas II',    minPoints: 701, maxPoints: 800           },
  { name: 'Emas I',     minPoints: 801, maxPoints: Infinity      },
];

// Hard cap on total_points
export const MAX_POINTS = 900;

export function getRank(totalPoints, gamesPlayed) {
  if (!totalPoints || totalPoints === 0) return 'Novis';
  if (totalPoints <= 100) return 'Gangsa III';
  if (totalPoints <= 200) return 'Gangsa II';
  if (totalPoints <= 300) return 'Gangsa I';
  if (totalPoints <= 400) return 'Perak III';
  if (totalPoints <= 500) return 'Perak II';
  if (totalPoints <= 600) return 'Perak I';
  if (totalPoints <= 700) return 'Emas III';
  if (totalPoints <= 800) return 'Emas II';
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
