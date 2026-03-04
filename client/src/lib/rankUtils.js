export const RANKS = [
  { name: 'Novis',      minPoints: -Infinity, minGames: 0,  maxGames: 1  },
  { name: 'Gangsa III', minPoints: -Infinity, minGames: 2,  maxPoints: 59  },
  { name: 'Gangsa II',  minPoints: 60,        minGames: 2,  maxPoints: 119 },
  { name: 'Gangsa I',   minPoints: 120,       minGames: 2,  maxPoints: 179 },
  { name: 'Perak V',    minPoints: 180,       minGames: 2,  maxPoints: 239 },
  { name: 'Perak IV',   minPoints: 240,       minGames: 2,  maxPoints: 299 },
  { name: 'Perak III',  minPoints: 300,       minGames: 2,  maxPoints: 359 },
  { name: 'Perak II',   minPoints: 360,       minGames: 2,  maxPoints: 419 },
  { name: 'Perak I',    minPoints: 420,       minGames: 2,  maxPoints: 479 },
  { name: 'Emas III',   minPoints: 480,       minGames: 2,  maxPoints: 559 },
  { name: 'Emas II',    minPoints: 560,       minGames: 2,  maxPoints: 639 },
  { name: 'Emas I',     minPoints: 640,       minGames: 2,  maxPoints: Infinity },
];

export function getRank(totalPoints, gamesPlayed) {
  if (gamesPlayed < 2) return 'Novis';
  if (totalPoints < 60)  return 'Gangsa III';
  if (totalPoints < 120) return 'Gangsa II';
  if (totalPoints < 180) return 'Gangsa I';
  if (totalPoints < 240) return 'Perak V';
  if (totalPoints < 300) return 'Perak IV';
  if (totalPoints < 360) return 'Perak III';
  if (totalPoints < 420) return 'Perak II';
  if (totalPoints < 480) return 'Perak I';
  if (totalPoints < 560) return 'Emas III';
  if (totalPoints < 640) return 'Emas II';
  return 'Emas I';
}

export function getRankColor(rank) {
  if (rank === 'Novis') return '#888880';
  if (rank.startsWith('Gangsa')) return '#cd7f32';
  if (rank.startsWith('Perak')) return '#a8a9ad';
  if (rank.startsWith('Emas')) return '#FFD700';
  return '#888880';
}

export function getRankTier(rank) {
  if (rank === 'Novis') return 'novis';
  if (rank.startsWith('Gangsa')) return 'gangsa';
  if (rank.startsWith('Perak')) return 'perak';
  if (rank.startsWith('Emas')) return 'emas';
  return 'novis';
}
