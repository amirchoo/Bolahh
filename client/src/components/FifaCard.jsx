import { IoCameraOutline, IoCheckmark } from 'react-icons/io5';

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
  if (rank.startsWith('Perak'))  return { bg: 'linear-gradient(145deg, #6e7275, #c0c0c0, #6e7275)', border: '#c0c0c0', text: '#1a1a1a', muted: '#444',    statBg: 'rgba(0,0,0,0.2)' };
  if (rank.startsWith('Gangsa')) return { bg: 'linear-gradient(145deg, #7c4a1a, #cd7f32, #7c4a1a)', border: '#cd7f32', text: '#2a1400', muted: '#5a3010', statBg: 'rgba(0,0,0,0.2)' };
  return                                { bg: 'linear-gradient(145deg, #2a2d30, #3d4144, #2a2d30)', border: '#555',    text: '#e8e9eb', muted: '#aaa',    statBg: 'rgba(255,255,255,0.1)' };
}

export function calcOverall(stats) {
  return Math.round(STATS.map(s => stats[s.key] || 0).reduce((a, b) => a + b, 0) / 6);
}

export default function FifaCard({ profile, cardStats, rank, size = 'normal', onAvatarClick }) {
  const theme = getCardTheme(rank);
  const overall = calcOverall(cardStats);
  const isSmall = size === 'small';
  const w = isSmall ? 140 : 220;
  const h = isSmall ? 210 : 330;
  const isSubscribed = profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();

  return (
    <div style={{
      width: w, height: h, borderRadius: isSmall ? 10 : 16,
      background: theme.bg,
      border: `2px solid ${theme.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      fontFamily: "'DM Sans'",
    }}>
      {/* Shine overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Overall + position — top left */}
      <div style={{ position: 'absolute', top: isSmall ? 8 : 12, left: isSmall ? 8 : 14, zIndex: 3 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 28 : 44, color: theme.text, lineHeight: 1, letterSpacing: 1 }}>
          {overall}
        </div>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 7 : 11, color: theme.text, fontWeight: 700, letterSpacing: 1, marginTop: isSmall ? 1 : 2 }}>
          {POSITION_ABBR[profile?.position] || profile?.position || 'POS'}
        </div>
      </div>

      {/* Rank — top right */}
      <div style={{ position: 'absolute', top: isSmall ? 8 : 12, right: isSmall ? 8 : 12, zIndex: 3 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 7 : 10, color: theme.muted, letterSpacing: 1, textAlign: 'right' }}>
          {rank}
        </div>
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
          ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isSmall ? 9 : 14, height: isSmall ? 9 : 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, fontSize: isSmall ? 5 : 9, color: '#fff', lineHeight: 1 }}><IoCheckmark size={isSmall ? 5 : 9} /></span>
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
          <div key={s.key} style={{ background: theme.statBg, borderRadius: isSmall ? 3 : 5, padding: isSmall ? '2px 2px' : '4px 4px', textAlign: 'center' }}>
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
          <span style={{ fontWeight: 700, color: theme.text }}>{profile?.total_points || 30}</span> OVR
        </div>
      </div>
    </div>
  );
}
