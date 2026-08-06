export const RANKS = [
  { name: 'Novis',      minOvr: 0,  maxOvr: 30 },
  { name: 'Gangsa III', minOvr: 31, maxOvr: 39 },
  { name: 'Gangsa II',  minOvr: 40, maxOvr: 49 },
  { name: 'Gangsa I',   minOvr: 50, maxOvr: 60 },
  { name: 'Perak III',  minOvr: 61, maxOvr: 69 },
  { name: 'Perak II',   minOvr: 70, maxOvr: 74 },
  { name: 'Perak I',    minOvr: 75, maxOvr: 79 },
  { name: 'Emas III',   minOvr: 80, maxOvr: 85 },
  { name: 'Emas II',    minOvr: 86, maxOvr: 94 },
  { name: 'Emas I',     minOvr: 95, maxOvr: 99 },
];

export function getRank(ovr) {
  if (!ovr || ovr <= 30) return 'Novis';
  if (ovr <= 39) return 'Gangsa III';
  if (ovr <= 49) return 'Gangsa II';
  if (ovr <= 60) return 'Gangsa I';
  if (ovr <= 69) return 'Perak III';
  if (ovr <= 74) return 'Perak II';
  if (ovr <= 79) return 'Perak I';
  if (ovr <= 85) return 'Emas III';
  if (ovr <= 94) return 'Emas II';
  return 'Emas I';
}

export function getRankColor(rank) {
  if (rank === 'Novis')          return '#7088a0';
  if (rank.startsWith('Gangsa')) return '#cd7f32';
  if (rank.startsWith('Perak'))  return '#6ec8e8';
  if (rank.startsWith('Emas'))   return '#FFD700';
  return '#7088a0';
}

export function getRankTier(rank) {
  if (rank === 'Novis')          return 'novis';
  if (rank.startsWith('Gangsa')) return 'gangsa';
  if (rank.startsWith('Perak'))  return 'perak';
  if (rank.startsWith('Emas'))   return 'emas';
  return 'novis';
}

// RANKS is ordered lowest-to-highest, so index comparison tells you promotion vs demotion.
export function getRankIndex(rank) {
  return RANKS.findIndex(r => r.name === rank);
}
