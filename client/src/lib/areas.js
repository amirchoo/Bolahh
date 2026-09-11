export const AREAS = [
  'Kuala Lumpur',
  'Petaling Jaya',
  'Subang',
  'Shah Alam',
  'Klang',
  'Setapak',
  'Wangsa Maju',
  'Kepong',
  'Cheras',
  'Ampang',
  'Puchong',
  'Kajang',
  'Ansan',
];

// A player's home Area (profile, signup, leaderboard, friends) is picked as
// state + district, but fields/games still use the flat town list above.
export const PLAYER_AREAS = ['Kuala Lumpur', 'Selangor'];

export const PLAYER_DISTRICTS = {
  'Kuala Lumpur': [
    'KL City Centre (KLCC)',
    'Bukit Bintang',
    'Cheras',
    'Setapak',
    'Wangsa Maju',
    'Bangsar',
    'Mont Kiara',
    'Sri Hartamas',
    'Kepong',
    'Titiwangsa',
    'Seputeh',
    'Brickfields',
  ],
  'Selangor': [
    'Shah Alam',
    'Petaling Jaya',
    'Subang Jaya',
    'Puchong',
    'Klang',
    'Cyberjaya',
    'Kajang',
    'Bangi',
    'Ampang',
    'Gombak',
    'Rawang',
    'Sepang',
    'Serdang',
    'Sungai Buloh',
  ],
};

// A stored player area can be a state (legacy profiles) or a district
// (new profiles) — resolve either back to its parent state for grouping.
export function stateForPlayerArea(area) {
  if (!area) return '';
  if (PLAYER_AREAS.includes(area)) return area;
  return PLAYER_AREAS.find(state => PLAYER_DISTRICTS[state].includes(area)) || '';
}
