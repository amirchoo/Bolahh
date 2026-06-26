import FifaCard from './FifaCard';

/**
 * Special edition player card unlocked by games_played milestones.
 * Wraps FifaCard with preset themes — no manual customTheme needed.
 *
 * Tiers:
 *   10  games → RISING     (teal glow, corner brackets)
 *   25  games → CONTENDER  (blue carbon pattern, side bars)
 *   50  games → VETERAN    (purple foil, frame element)
 *   100 games → CENTURY    (red-gold foil + glow + crown sticker)
 *   200 games → LEGEND     (dark holographic foil + full decoration)
 *   500 games → ICON       (full rainbow foil, all effects)
 *
 * Usage:
 *   <MilestoneCard profile={profile} cardStats={cardStats} rank={rank} />
 *
 * Returns null if the player hasn't reached 10 games yet.
 */

export const MILESTONE_TIERS = [
  {
    minGames: 500,
    badge: 'ICON',
    customTheme: {
      gradFrom: '#0d0d0d', gradMid: '#1a0a2e', gradTo: '#0d0d0d',
      borderColor: '#c084fc',
      textDark: false,
      glowEnabled: true,  glowColor: '#c084fc',
      foilEnabled: true,
      pattern: 'dots', patternColor: '#c084fc', patternOpacity: 0.12,
      elemCorners: true, elemSideBars: true, elemCenterDiamond: true, elemFrame: true,
      elemColor: '#c084fc', elemOpacity: 0.5,
      stickerIcon: 'burst', stickerPos: 'top-center', stickerSize: 40, stickerColor: '#c084fc', stickerOpacity: 1,
      badgeColor: '#c084fc',
    },
  },
  {
    minGames: 200,
    badge: 'LEGEND',
    customTheme: {
      gradFrom: '#0a0012', gradMid: '#1a003a', gradTo: '#0a0012',
      borderColor: '#818cf8',
      textDark: false,
      glowEnabled: true,  glowColor: '#818cf8',
      foilEnabled: true,
      pattern: 'crosshatch', patternColor: '#818cf8', patternOpacity: 0.1,
      elemCorners: true, elemSideBars: true, elemCenterDiamond: true, elemFrame: false,
      elemColor: '#818cf8', elemOpacity: 0.45,
      stickerIcon: 'crown', stickerPos: 'top-center', stickerSize: 36, stickerColor: '#818cf8', stickerOpacity: 0.95,
      badgeColor: '#818cf8',
    },
  },
  {
    minGames: 100,
    badge: 'CENTURY',
    customTheme: {
      gradFrom: '#3a0a00', gradMid: '#b8200a', gradTo: '#7a1800',
      borderColor: '#F09D51',
      textDark: false,
      glowEnabled: true,  glowColor: '#F09D51',
      foilEnabled: true,
      pattern: 'diagonal', patternColor: '#F09D51', patternOpacity: 0.1,
      elemCorners: true, elemSideBars: false, elemCenterDiamond: true, elemFrame: false,
      elemColor: '#F09D51', elemOpacity: 0.45,
      stickerIcon: 'crown', stickerPos: 'top-center', stickerSize: 34, stickerColor: '#FFD700', stickerOpacity: 1,
      badgeColor: '#F09D51',
    },
  },
  {
    minGames: 50,
    badge: 'VETERAN',
    customTheme: {
      gradFrom: '#150a2e', gradMid: '#2d1060', gradTo: '#150a2e',
      borderColor: '#a78bfa',
      textDark: false,
      glowEnabled: false,
      foilEnabled: true,
      pattern: 'grid', patternColor: '#a78bfa', patternOpacity: 0.1,
      elemCorners: false, elemSideBars: false, elemCenterDiamond: false, elemFrame: true,
      elemColor: '#a78bfa', elemOpacity: 0.35,
      stickerIcon: 'shield', stickerPos: 'top-center', stickerSize: 30, stickerColor: '#a78bfa', stickerOpacity: 0.9,
      badgeColor: '#a78bfa',
    },
  },
  {
    minGames: 25,
    badge: 'CONTENDER',
    customTheme: {
      gradFrom: '#051826', gradMid: '#0a3050', gradTo: '#051826',
      borderColor: '#38bdf8',
      textDark: false,
      glowEnabled: false,
      foilEnabled: false,
      pattern: 'carbon', patternColor: '#38bdf8', patternOpacity: 0.1,
      elemCorners: true, elemSideBars: true, elemCenterDiamond: false, elemFrame: false,
      elemColor: '#38bdf8', elemOpacity: 0.4,
      stickerIcon: 'bolt', stickerPos: 'top-center', stickerSize: 28, stickerColor: '#38bdf8', stickerOpacity: 0.85,
      badgeColor: '#38bdf8',
    },
  },
  {
    minGames: 10,
    badge: 'RISING',
    customTheme: {
      gradFrom: '#061a14', gradMid: '#0d3328', gradTo: '#061a14',
      borderColor: '#34d399',
      textDark: false,
      glowEnabled: false,
      foilEnabled: false,
      pattern: 'dots', patternColor: '#34d399', patternOpacity: 0.08,
      elemCorners: true, elemSideBars: false, elemCenterDiamond: false, elemFrame: false,
      elemColor: '#34d399', elemOpacity: 0.35,
      stickerIcon: 'star', stickerPos: 'top-center', stickerSize: 26, stickerColor: '#34d399', stickerOpacity: 0.8,
      badgeColor: '#34d399',
    },
  },
];

export function getMilestoneTier(gamesPlayed) {
  return MILESTONE_TIERS.find(t => gamesPlayed >= t.minGames) ?? null;
}

export default function MilestoneCard({ profile, cardStats, rank, size = 'normal' }) {
  const tier = getMilestoneTier(profile?.games_played ?? 0);
  if (!tier) return null;

  return (
    <FifaCard
      profile={profile}
      cardStats={cardStats}
      rank={rank}
      size={size}
      customTheme={tier.customTheme}
      badge={tier.badge}
    />
  );
}
