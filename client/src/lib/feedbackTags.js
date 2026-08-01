// Matches GameRatingPage.jsx's TEAM_COLORS exactly, so a bib badge looks the same
// wherever team A/B/C shows up (rating page, feedback page, manager view).
export const TEAM_COLORS = {
  A: { bg: 'rgba(240,157,81,0.15)', border: 'rgba(240,157,81,0.4)', text: '#F09D51' },
  B: { bg: 'rgba(100,160,255,0.15)', border: 'rgba(100,160,255,0.4)', text: '#64a0ff' },
  C: { bg: 'rgba(100,220,130,0.15)', border: 'rgba(100,220,130,0.4)', text: '#64dc82' },
};

export const VENUE_TAGS = [
  'Good Venue', 'Spacious', 'Well Maintained', 'Clean Facilities', 'Good Lighting', 'Convenient Parking',
];

export const POSITIVE_PLAYER_TAGS = [
  'Good Passing', 'Good Shooting', 'Good Dribbling', 'Good Defending',
  'Great Teammate', 'Good Manner', 'Likes to Communicate',
];

export const NEGATIVE_PLAYER_TAGS = [
  "Doesn't Communicate", 'Bad Manner', 'Rough Play', 'Ball Hog',
];

export const PLAYER_TAG_SET = new Set([...POSITIVE_PLAYER_TAGS, ...NEGATIVE_PLAYER_TAGS]);
export const isNegativePlayerTag = (tag) => NEGATIVE_PLAYER_TAGS.includes(tag);
