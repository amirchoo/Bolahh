import { useEffect, useState } from 'react';
import { IoCameraOutline, IoCheckmark } from 'react-icons/io5';
import { fetchBorderCatalog, resolveBorderRender } from '../lib/borderCatalog';

export const CROWN_PATH = 'M2 19H22V21H2ZM4.5 17.5L2 9L6.5 13.5L12 3L17.5 13.5L22 9L19.5 17.5Z';

export const STATS = [
  { key: 'pac', label: 'PAC' },
  { key: 'sho', label: 'SHO' },
  { key: 'pas', label: 'PAS' },
  { key: 'dri', label: 'DRI' },
  { key: 'def', label: 'DEF' },
  { key: 'phy', label: 'PHY' },
];

export const POSITION_ABBR = { Attacker: 'AT', Midfielder: 'MF', Defender: 'DF', Goalkeeper: 'GK' };

export function getCardTheme(rank) {
  if (rank.startsWith('Emas'))   return { bg: 'linear-gradient(145deg, #b8860b, #ffd700, #b8860b)', border: '#ffd700', text: '#3a2a00', muted: '#6b4e00', statBg: 'rgba(0,0,0,0.2)' };
  if (rank.startsWith('Perak'))  return { bg: 'linear-gradient(145deg, #3a7a96, #aadaef, #3a7a96)', border: '#6ec8e8', text: '#0b1e2b', muted: '#1a3c50', statBg: 'rgba(0,0,0,0.15)' };
  if (rank.startsWith('Gangsa')) return { bg: 'linear-gradient(145deg, #7c4a1a, #cd7f32, #7c4a1a)', border: '#cd7f32', text: '#2a1400', muted: '#5a3010', statBg: 'rgba(0,0,0,0.2)' };
  return                                { bg: 'linear-gradient(145deg, #2a2d30, #3d4144, #2a2d30)', border: '#555',    text: '#e8e9eb', muted: '#aaa',    statBg: 'rgba(255,255,255,0.1)' };
}

export function calcOverall(stats) {
  return Math.round(STATS.map(s => stats[s.key] || 0).reduce((a, b) => a + b, 0) / 6);
}

export function buildCustomTheme(form) {
  const text   = form.textDark ? '#1a1200' : '#f0f0f0';
  const muted  = form.textDark ? '#5a4800' : '#999999';
  const statBg = form.textDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)';
  return {
    bg:          `linear-gradient(145deg, ${form.gradFrom}, ${form.gradMid}, ${form.gradTo})`,
    border:      form.borderColor,
    text,
    muted,
    statBg,
    glowColor:       form.glowColor,
    glowEnabled:     form.glowEnabled,
    foilEnabled:     form.foilEnabled,
    badgeColor:      form.badgeColor,
    textDark:        form.textDark,
    pattern:         form.pattern      || 'none',
    patternColor:    form.patternColor || '#ffffff',
    patternOpacity:  form.patternOpacity  ?? 0.15,
    elemCorners:      form.elemCorners      || false,
    elemSideBars:     form.elemSideBars     || false,
    elemCenterDiamond:form.elemCenterDiamond|| false,
    elemFrame:        form.elemFrame        || false,
    elemColor:        form.elemColor        || '#ffffff',
    elemOpacity:      form.elemOpacity      ?? 0.3,
    stickerIcon:      form.stickerIcon      || 'none',
    stickerPos:       form.stickerPos       || 'top-center',
    stickerSize:      form.stickerSize      ?? 36,
    stickerColor:     form.stickerColor     || '#ffffff',
    stickerOpacity:   form.stickerOpacity   ?? 0.9,
  };
}

export const STICKER_ICONS = [
  { key: 'star',    label: 'Star',    d: 'M12 2L14.3 8.9L21.7 9.1L16 13.2L18.1 20.2L12 16.1L5.9 20.2L8 13.2L2.3 9.1L9.7 8.9Z' },
  { key: 'burst',   label: 'Burst',   d: 'M22 12L16.6 13.9L19.1 19.1L13.9 16.6L12 22L10.1 16.6L4.9 19.1L7.4 13.9L2 12L7.4 10.1L4.9 4.9L10.1 7.4L12 2L13.9 7.4L19.1 4.9L16.6 10.1Z' },
  { key: 'diamond', label: 'Diamond', d: 'M12 2L22 12L12 22L2 12Z' },
  { key: 'shield',  label: 'Shield',  d: 'M12 2L4 5V12C4 17 7.6 21.5 12 23C16.4 21.5 20 17 20 12V5Z' },
  { key: 'bolt',    label: 'Bolt',    d: 'M13 2L4 14H11L10 22L19 10H12Z' },
  { key: 'crown',   label: 'Crown',   d: 'M2 19H22V21H2ZM4.5 17.5L2 9L6.5 13.5L12 3L17.5 13.5L22 9L19.5 17.5Z' },
  { key: 'heart',   label: 'Heart',   d: 'M12 21C12 21 2.5 15 2.5 8.5C2.5 5.5 5 3 8 3C9.8 3 11.4 4 12 5.5C12.6 4 14.2 3 16 3C19 3 21.5 5.5 21.5 8.5C21.5 15 12 21 12 21Z' },
  { key: 'fire',    label: 'Fire',    d: 'M12 2C9.5 6 8 9 9.5 13C8 11 8.5 8 10 9C8.5 13 10.5 17 12 19.5C13.5 17 15.5 13 14 9C15.5 8 16 11 14.5 13C16 9 14.5 6 12 2ZM9.5 18.5C9.5 20.4 10.6 22 12 22C13.4 22 14.5 20.4 14.5 18.5C14.5 16.8 13 15 12 13C11 15 9.5 16.8 9.5 18.5Z' },
];

export function getStickerPos(posKey, w, h) {
  switch (posKey) {
    case 'top-left':      return { x: w * 0.18, y: h * 0.08 };
    case 'top-right':     return { x: w * 0.82, y: h * 0.08 };
    case 'center':        return { x: w * 0.5,  y: h * 0.45 };
    case 'bottom-left':   return { x: w * 0.18, y: h * 0.9  };
    case 'bottom-right':  return { x: w * 0.82, y: h * 0.9  };
    case 'bottom-center': return { x: w * 0.5,  y: h * 0.9  };
    case 'top-center':
    default:              return { x: w * 0.5,  y: h * 0.08 };
  }
}

// Bakes the pattern + opacity directly into the card's background layers so it
// is structurally behind all positioned children and can never overlap content.
function patternBgStyle(pattern, hexColor, opacity, gradientBg) {
  const aa = Math.round((opacity ?? 0.15) * 255).toString(16).padStart(2, '0');
  const c  = `${hexColor || '#ffffff'}${aa}`;
  switch (pattern) {
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${c} 1.5px, transparent 1.5px), ${gradientBg}`, backgroundSize: '12px 12px, 100% 100%' };
    case 'diagonal':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 9px), ${gradientBg}` };
    case 'grid':
      return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px), ${gradientBg}`, backgroundSize: '16px 16px, 16px 16px, 100% 100%' };
    case 'crosshatch':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 9px), repeating-linear-gradient(-45deg, ${c} 0, ${c} 1px, transparent 0, transparent 9px), ${gradientBg}` };
    case 'carbon':
      return { backgroundImage: `repeating-linear-gradient(0deg, ${c} 0, ${c} 1px, transparent 0, transparent 8px), repeating-linear-gradient(90deg, ${c} 0, ${c} 1px, transparent 0, transparent 8px), ${gradientBg}`, backgroundSize: '8px 8px, 8px 8px, 100% 100%' };
    default:
      return null;
  }
}

// Renders an equipped cosmetic border as an SVG overlay, composed from the
// small set of primitives a procedural border descriptor can turn on (frame /
// corners / ticks / badgeIcon / laurel / animated) rather than bespoke path
// data per border — cardCanvas.js draws the same descriptor with Canvas2D
// for PNG export.
function renderCardBorder(border, w, h, isSmall) {
  const pad = isSmall ? 7 : 11;
  const arm = isSmall ? 10 : 16;
  const sw = isSmall ? 1.3 : 2;
  const rx = isSmall ? 8 : 13;
  const innerGap = isSmall ? 3 : 5;
  const c = border.color;
  const ac = border.accentColor || border.color;

  const outerRect = { x: pad, y: pad, width: w - pad * 2, height: h - pad * 2 };
  const innerRect = { x: pad + innerGap, y: pad + innerGap, width: w - (pad + innerGap) * 2, height: h - (pad + innerGap) * 2 };

  const tickSpots = border.ticks
    ? Array.from({ length: border.ticks }, (_, i) => pad + ((w - pad * 2) / (border.ticks + 1)) * (i + 1))
    : [];

  const laurelAt = (cx, cy, flip) => {
    const s = flip ? -1 : 1;
    return [0, 1, 2].map(i => {
      const lx = cx + s * (6 + i * 5);
      const ly = cy - i * 2;
      return <ellipse key={i} cx={lx} cy={ly} rx={4} ry={2} transform={`rotate(${s * (18 + i * 9)} ${lx} ${ly})`} />;
    });
  };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 6, pointerEvents: 'none' }}
      fill="none"
    >
      {border.animated && (
        <style>{`
          @keyframes borderTrace { to { stroke-dashoffset: -100; } }
        `}</style>
      )}

      <rect {...outerRect} rx={rx} stroke={c} strokeWidth={sw}
        strokeDasharray={border.frameDash ? (isSmall ? '2 3' : '3 4') : undefined}
        pathLength={border.animated ? 100 : undefined}
        style={border.animated ? { strokeDasharray: '18 82', animation: 'borderTrace 3.5s linear infinite' } : undefined}
      />
      {border.frame === 'double' && (
        <rect {...innerRect} rx={Math.max(rx - innerGap, 2)} stroke={ac} strokeWidth={sw * 0.7} />
      )}

      {border.corners && (
        <g stroke={c} strokeWidth={sw} strokeLinecap="round">
          <path d={`M ${pad + arm} ${pad} H ${pad} V ${pad + arm}`} />
          <path d={`M ${w - pad - arm} ${pad} H ${w - pad} V ${pad + arm}`} />
          <path d={`M ${pad + arm} ${h - pad} H ${pad} V ${h - pad - arm}`} />
          <path d={`M ${w - pad - arm} ${h - pad} H ${w - pad} V ${h - pad - arm}`} />
        </g>
      )}

      {tickSpots.map((x, i) => (
        <line key={i} x1={x} y1={h - pad} x2={x} y2={h - pad - (isSmall ? 5 : 8)} stroke={c} strokeWidth={sw} strokeLinecap="round" />
      ))}

      {border.badgeIcon === 'crown' && (() => {
        const size = isSmall ? 14 : 20;
        return (
          <g transform={`translate(${w / 2 - size / 2}, ${pad - size * 0.55}) scale(${size / 24})`}>
            <path d={CROWN_PATH} fill={ac} />
          </g>
        );
      })()}

      {border.laurel && (
        <g fill={ac} opacity={0.85}>
          {laurelAt(pad + (isSmall ? 4 : 6), h - pad - (isSmall ? 10 : 16), false)}
          {laurelAt(w - pad - (isSmall ? 4 : 6), h - pad - (isSmall ? 10 : 16), true)}
        </g>
      )}
    </svg>
  );
}

export default function FifaCard({ profile, cardStats, rank, size = 'normal', onAvatarClick, customTheme, badge, equippedBorder }) {
  const [borderRender, setBorderRender] = useState(null);

  useEffect(() => {
    if (!equippedBorder) { setBorderRender(null); return; }
    let cancelled = false;
    fetchBorderCatalog().then(rows => {
      if (cancelled) return;
      const row = rows.find(r => r.key === equippedBorder);
      setBorderRender(resolveBorderRender(row, 'card'));
    });
    return () => { cancelled = true; };
  }, [equippedBorder]);

  const rankTheme = getCardTheme(rank);
  const theme = customTheme
    ? { bg: customTheme.bg, border: customTheme.border, text: customTheme.text, muted: customTheme.muted, statBg: customTheme.statBg }
    : rankTheme;

  const isSmall = size === 'small';
  const w = isSmall ? 140 : 220;
  const h = isSmall ? 210 : 330;
  const isSubscribed = profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();

  const glowEnabled = customTheme?.glowEnabled;
  const glowColor   = customTheme?.glowColor || theme.border;
  const foilEnabled = customTheme?.foilEnabled;
  const badgeColor  = customTheme?.badgeColor || theme.border;

  const boxShadow = glowEnabled
    ? `0 0 ${isSmall ? 14 : 28}px ${glowColor}cc, 0 0 ${isSmall ? 32 : 64}px ${glowColor}55, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`
    : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)';

  const patternStyle = customTheme?.pattern && customTheme.pattern !== 'none'
    ? patternBgStyle(customTheme.pattern, customTheme.patternColor, customTheme.patternOpacity, theme.bg)
    : null;

  return (
    <div style={{ width: w, height: h, position: 'relative', flexShrink: 0 }}>
    <div style={{
      width: '100%', height: '100%', borderRadius: isSmall ? 10 : 16,
      ...(patternStyle || { background: theme.bg }),
      border: `2px solid ${theme.border}`,
      boxShadow,
      position: 'relative', overflow: 'hidden',
      fontFamily: "'DM Sans'",
    }}>

      {/* Foil shimmer */}
      {foilEnabled && (
        <>
          <style>{`
            @keyframes foilShimmer {
              0%   { background-position: 0% 50%;   }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0% 50%;   }
            }
          `}</style>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit', zIndex: 5,
            background: 'linear-gradient(135deg, rgba(255,0,0,0.12), rgba(255,150,0,0.12), rgba(255,255,0,0.12), rgba(0,255,100,0.12), rgba(0,150,255,0.12), rgba(150,0,255,0.12), rgba(255,0,150,0.12))',
            backgroundSize: '300% 300%',
            animation: 'foilShimmer 4s ease infinite',
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
          }} />
        </>
      )}

      {/* Decorative element overlay — topmost layer */}
      {customTheme && (customTheme.elemCorners || customTheme.elemSideBars || customTheme.elemCenterDiamond || customTheme.elemFrame) && (() => {
        const c   = customTheme.elemColor   || '#ffffff';
        const op  = customTheme.elemOpacity ?? 0.3;
        const arm = isSmall ? 10 : 16;
        const pad = isSmall ?  7 : 11;
        const sw  = isSmall ?  1 :  1.5;
        const ds  = isSmall ?  3 :  5;
        const divY = h * 0.552;
        return (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 6, pointerEvents: 'none', opacity: op }}
            fill="none" strokeLinecap="round"
          >
            {customTheme.elemCorners && (
              <g stroke={c} strokeWidth={sw}>
                <path d={`M ${pad + arm} ${pad} H ${pad} V ${pad + arm}`} />
                <path d={`M ${w - pad - arm} ${pad} H ${w - pad} V ${pad + arm}`} />
                <path d={`M ${pad + arm} ${h - pad} H ${pad} V ${h - pad - arm}`} />
                <path d={`M ${w - pad - arm} ${h - pad} H ${w - pad} V ${h - pad - arm}`} />
              </g>
            )}
            {customTheme.elemSideBars && (
              <g stroke={c} strokeWidth={sw * 0.7} strokeDasharray={isSmall ? '3 5' : '4 7'}>
                <line x1={pad - 2} y1={h * 0.22} x2={pad - 2} y2={h * 0.78} />
                <line x1={w - pad + 2} y1={h * 0.22} x2={w - pad + 2} y2={h * 0.78} />
              </g>
            )}
            {customTheme.elemCenterDiamond && (
              <polygon
                fill={c}
                points={`${w/2},${divY - ds} ${w/2 + ds},${divY} ${w/2},${divY + ds} ${w/2 - ds},${divY}`}
              />
            )}
            {customTheme.elemFrame && (
              <rect x={6} y={6} width={w - 12} height={h - 12} rx={isSmall ? 6 : 10} stroke={c} strokeWidth={sw * 0.7} />
            )}
          </svg>
        );
      })()}

      {/* Icon sticker */}
      {customTheme?.stickerIcon && customTheme.stickerIcon !== 'none' && (() => {
        const icon = STICKER_ICONS.find(i => i.key === customTheme.stickerIcon);
        if (!icon) return null;
        const pos  = getStickerPos(customTheme.stickerPos, w, h);
        const size = customTheme.stickerSize ?? 36;
        const col  = customTheme.stickerColor || '#ffffff';
        const op   = customTheme.stickerOpacity ?? 0.9;
        return (
          <svg
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: pos.x - size / 2,
              top:  pos.y - size / 2,
              width: size, height: size,
              zIndex: 7, pointerEvents: 'none',
              opacity: op,
              filter: `drop-shadow(0 1px ${Math.round(size * 0.18)}px ${col}77)`,
              overflow: 'visible',
            }}
            fill={col}
          >
            <path d={icon.d} />
          </svg>
        );
      })()}

      {/* Shine overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Overall + position — top left */}
      <div style={{ position: 'absolute', top: isSmall ? 8 : 12, left: isSmall ? 8 : 14, zIndex: 3 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 28 : 44, color: theme.text, lineHeight: 1, letterSpacing: 1 }}>
          {calcOverall(cardStats)}
        </div>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 7 : 11, color: theme.text, fontWeight: 700, letterSpacing: 1, marginTop: isSmall ? 1 : 2 }}>
          {POSITION_ABBR[profile?.position] || profile?.position || 'POS'}
        </div>
      </div>

      {/* Top right — badge label + rank, or rank alone */}
      <div style={{ position: 'absolute', top: isSmall ? 8 : 12, right: isSmall ? 8 : 12, zIndex: 3, textAlign: 'right' }}>
        {badge ? (
          <div>
            <div style={{
              fontFamily: "'Bebas Neue'",
              fontSize: isSmall ? 9 : 14,
              letterSpacing: 1.5,
              color: badgeColor,
              background: `${badgeColor}22`,
              border: `1px solid ${badgeColor}70`,
              borderRadius: 3,
              padding: isSmall ? '1px 4px' : '2px 8px',
              marginBottom: isSmall ? 1 : 3,
              lineHeight: 1.2,
              display: 'inline-block',
            }}>{badge}</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 6 : 9, color: theme.muted, letterSpacing: 1 }}>
              {rank}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 7 : 10, color: theme.muted, letterSpacing: 1 }}>
            {rank}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div
        onClick={!isSmall && onAvatarClick ? (e) => { e.stopPropagation(); onAvatarClick(e); } : undefined}
        style={{
          position: 'absolute',
          top: isSmall ? 28 : 44,
          left: '50%', transform: 'translateX(-50%)',
          width: isSmall ? 68 : 108, height: isSmall ? 68 : 108,
          borderRadius: '50%', overflow: 'hidden',
          border: `${isSmall ? 2 : 3}px solid ${theme.border}`,
          background: theme.statBg, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: !isSmall && onAvatarClick ? 'pointer' : 'default',
        }}
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <span style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 18 : 28, fontWeight: 700, color: theme.text }}>
              {(profile?.name?.[0] || '?').toUpperCase()}
            </span>
        }
        {!isSmall && onAvatarClick && (
          <div className="avatar-hover-overlay" style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            opacity: 0, transition: 'opacity 0.2s',
          }}>
            <IoCameraOutline size={20} />
            {isSubscribed && (
              <span style={{ fontSize: 8, fontFamily: "'Space Mono'", fontWeight: 700, letterSpacing: 1, background: '#4a9eff', color: '#fff', borderRadius: 3, padding: '2px 5px' }}>GIF</span>
            )}
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        position: 'absolute', top: isSmall ? 102 : 160,
        left: 0, right: 0, zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: isSmall ? 2 : 4, padding: `0 ${isSmall ? 4 : 8}px`,
      }}>
        <span style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 11 : 17, color: theme.text, letterSpacing: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile?.name || 'PLAYER'}
        </span>
        {isSubscribed && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isSmall ? 9 : 14, height: isSmall ? 9 : 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, color: '#fff', lineHeight: 1 }}>
            <IoCheckmark size={isSmall ? 5 : 9} />
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ position: 'absolute', top: isSmall ? 116 : 182, left: isSmall ? 10 : 16, right: isSmall ? 10 : 16, height: 1, background: `${theme.border}55`, zIndex: 3 }} />

      {/* Stats 3×2 grid */}
      <div style={{
        position: 'absolute', top: isSmall ? 120 : 190,
        left: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: isSmall ? 2 : 4, zIndex: 3,
      }}>
        {STATS.map(s => (
          <div key={s.key} style={{ background: theme.statBg, borderRadius: isSmall ? 3 : 5, padding: isSmall ? '2px' : '4px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 9 : 14, fontWeight: 700, color: theme.text, lineHeight: 1 }}>
              {cardStats[s.key] || 0}
            </div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted, letterSpacing: 0.5, marginTop: 1 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{
        position: 'absolute', bottom: isSmall ? 5 : 8,
        left: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
        display: 'flex', justifyContent: 'space-between', zIndex: 3,
        borderTop: `1px solid ${theme.border}55`, paddingTop: isSmall ? 3 : 5,
      }}>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted }}>
          <span style={{ fontWeight: 700, color: theme.text }}>{profile?.games_played || 0}</span> GAMES PLAYED
        </div>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted }}>
          <span style={{ fontWeight: 700, color: theme.text }}>{calcOverall(cardStats)}</span> OVR
        </div>
      </div>
    </div>

    {/* Equipped cosmetic border — a sibling overlay, not clipped by the
        card's own rounded rect, so it renders its full shape uncropped and
        can genuinely overlap the card's edge like a frame around a photo. */}
    {borderRender?.type === 'procedural' && renderCardBorder(borderRender, w, h, isSmall)}
    {borderRender?.type === 'image' && (
      <img
        src={borderRender.imageUrl}
        alt=""
        style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%', objectFit: 'contain', zIndex: 10, pointerEvents: 'none' }}
      />
    )}
    </div>
  );
}
