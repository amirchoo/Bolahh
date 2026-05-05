// ─────────────────────────────────────────────
//  Bolahh Icon Set — Football Themed
//  Clean, bold, Lucide-style with football twists
//  All icons: 24x24 grid, 2px stroke, round caps
//
//  Usage:
//  import { IconGames, IconProfile } from '../components/Icons';
//  <IconGames size={18} />
//  <IconGames size={18} color="var(--accent)" />
// ─────────────────────────────────────────────

const base = {
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

// ── GAMES (football with pentagon pattern) ───


// ── PROFILE (player silhouette + ball at feet) ───
export function IconProfile({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Head */}
      <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
      {/* Body */}
      <path d="M5 21 C5 17 8 14 12 14 C16 14 19 17 19 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Small ball near bottom right of body */}
      <circle cx="17" cy="20" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="17" y1="18.8" x2="17" y2="21.2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="15.8" y1="20" x2="18.2" y2="20" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

// ── MANAGER (clipboard with ball on it) ───
export function IconManager({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Clipboard board */}
      <rect x="5" y="4" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      {/* Clip at top */}
      <path d="M9 4 C9 2.9 10.3 2 12 2 C13.7 2 15 2.9 15 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Small football on clipboard */}
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9 L13.2 10.4 L12.7 12 L11.3 12 L10.8 10.4 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Line below ball */}
      <line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ── LOGOUT (arrow out of box, angled like a kick) ───
export function IconLogout({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Door/box */}
      <path d="M10 3 H4 C3.4 3 3 3.4 3 4 V20 C3 20.6 3.4 21 4 21 H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arrow pointing out (kick style - slightly angled) */}
      <path d="M15 8 L21 12 L15 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arrow shaft */}
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Small ball on arrow tip */}
      <circle cx="21" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.5" fill="var(--bg, #E8E9EB)" />
    </svg>
  );
}

// ── FRIENDS (two players, ball in the middle) ───
export function IconFriends({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Left player head */}
      <circle cx="7.5" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      {/* Left player body */}
      <path d="M2 21 C2 18 4.5 16 7.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Right player head */}
      <circle cx="16.5" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      {/* Right player body */}
      <path d="M22 21 C22 18 19.5 16 16.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Ball in the middle */}
      <circle cx="12" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 15 L12.9 15.9 L12.6 17.1 L11.4 17.1 L11.1 15.9 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// ── CALENDAR / UPCOMING (calendar with ball replacing a date) ───
export function IconUpcoming({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Calendar outline */}
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      {/* Header line */}
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
      {/* Binding pegs */}
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Date dots */}
      <circle cx="7" cy="13" r="1" fill="currentColor" />
      <circle cx="12" cy="13" r="1" fill="currentColor" />
      {/* Ball replacing bottom-right date */}
      <circle cx="17" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17 14.8 L17.8 15.6 L17.5 16.8 L16.5 16.8 L16.2 15.6 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      {/* Extra dots */}
      <circle cx="7" cy="18" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

// ── LOADING (spinning ball) ───
export function IconLoading({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', animation: 'bolahh-spin 0.9s linear infinite', ...style }}>
      <style>{`@keyframes bolahh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* Ball circle - faded */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      {/* Spinning arc */}
      <path d="M12 3 A9 9 0 0 1 21 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Pentagon hint */}
      <path d="M12 7 L13.5 9 L12.9 11 L11.1 11 L10.5 9 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

// ── SEARCH (magnifying glass — ball as the lens) ───
export function IconSearch({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Lens = football */}
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="2" />
      {/* Pentagon inside lens */}
      <path d="M10 7 L11.4 8.3 L10.9 10.1 L9.1 10.1 L8.6 8.3 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Handle */}
      <line x1="14.9" y1="14.9" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── LOCATION (map pin — ball inside the pin) ───
export function IconLocation({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Pin shape */}
      <path d="M12 2 C8.1 2 5 5.1 5 9 C5 14.2 12 22 12 22 C12 22 19 14.2 19 9 C19 5.1 15.9 2 12 2 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Ball inside pin */}
      <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 6.5 L12.9 7.6 L12.5 8.9 L11.5 8.9 L11.1 7.6 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// ── DATE / TIME TAG ───
export function IconDate({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12.6 L12.8 13.5 L12.5 14.6 L11.5 14.6 L11.2 13.5 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// ── CLOCK / TIME ───
export function IconTime({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="7" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="15.5" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Small ball at center */}
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

// ── STADIUM / FIELD ───
export function IconStadium({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Field outline */}
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      {/* Center circle */}
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      {/* Center line */}
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.8" />
      {/* Goal boxes */}
      <path d="M2 9.5 L5 9.5 L5 14.5 L2 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 9.5 L19 9.5 L19 14.5 L22 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── SHOE ───
export function IconShoe({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {/* Shoe sole */}
      <path d="M2 18 C2 18 4 20 8 20 L18 20 C20 20 22 19 22 17 C22 16 21 15 20 15 L14 15 L12 11 C11 9 9 8 7 8 L5 8 C3.3 8 2 9.3 2 11 L2 18 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Lace lines */}
      <line x1="8" y1="12" x2="12" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="14.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

import { IoMail, IoCameraOutline, IoCamera, IoEye, IoEyeOff, IoCheckmarkCircle, IoCloseCircle, IoBarChart, IoFlash, IoEllipse } from 'react-icons/io5';
import { MdSave } from 'react-icons/md';
import { LuMedal, LuToilet, LuPartyPopper } from 'react-icons/lu';
import { FaSquareParking } from 'react-icons/fa6';
import { CiShop } from 'react-icons/ci';
import { GiSoccerBall } from 'react-icons/gi';

export const IconEmail    = ({ size = 18, color = 'currentColor' }) => <IoMail size={size} color={color} />;
export const IconCamera   = ({ size = 18, color = 'currentColor' }) => <IoCameraOutline size={size} color={color} />;
export const IconPhoto    = ({ size = 18, color = 'currentColor' }) => <IoCamera size={size} color={color} />;
export const IconEyeShow  = ({ size = 18, color = 'currentColor' }) => <IoEye size={size} color={color} />;
export const IconEyeHide  = ({ size = 18, color = 'currentColor' }) => <IoEyeOff size={size} color={color} />;
export const IconSuccess  = ({ size = 18, color = '#4ade80' })       => <IoCheckmarkCircle size={size} color={color} />;
export const IconError    = ({ size = 18, color = 'var(--red)' })    => <IoCloseCircle size={size} color={color} />;
export const IconSave     = ({ size = 18, color = 'currentColor' }) => <MdSave size={size} color={color} />;
export const IconRating   = ({ size = 18, color = 'currentColor' }) => <LuMedal size={size} color={color} />;
export const IconToilet   = ({ size = 18, color = 'currentColor' }) => <LuToilet size={size} color={color} />;
export const IconParking  = ({ size = 18, color = 'currentColor' }) => <FaSquareParking size={size} color={color} />;
export const IconShop     = ({ size = 18, color = 'currentColor' }) => <CiShop size={size} color={color} />;
export const IconStat     = ({ size = 18, color = 'currentColor' }) => <IoBarChart size={size} color={color} />;
export const IconFlash    = ({ size = 18, color = 'currentColor' }) => <IoFlash size={size} color={color} />;
export const IconParty    = ({ size = 18, color = 'currentColor' }) => <LuPartyPopper size={size} color={color} />;
export const IconGreen    = ({ size = 18 }) => <IoEllipse size={size} color="#22c55e" />;
export const IconRed      = ({ size = 18 }) => <IoEllipse size={size} color="#ef4444" />;
export const IconBall     = ({ size = 18, color = 'currentColor' }) => <GiSoccerBall size={size} color={color} />;
