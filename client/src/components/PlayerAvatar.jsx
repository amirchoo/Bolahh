/**
 * Circular player avatar with initials fallback.
 * Props: profile { name, avatar_url }, size (px number), borderColor (css string),
 * background (css string, defaults to var(--card)).
 */
export default function PlayerAvatar({ profile, size = 40, borderColor = 'var(--accent)', background = 'var(--card)' }) {
  const name = profile?.name || '?';

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${borderColor}`,
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background, position: 'relative', flexShrink: 0,
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Space Mono'", fontSize: Math.round(size * 0.3), fontWeight: 700, color: borderColor }}>
            {name.slice(0, 2).toUpperCase()}
          </span>
      }
    </div>
  );
}
