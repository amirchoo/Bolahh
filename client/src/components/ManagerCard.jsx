import { IoStar, IoCalendarOutline, IoChatbubbleEllipsesOutline } from 'react-icons/io5';

// Business-card style profile for a game's manager — distinct from the
// FIFA-style player card. Shows the manager's own card avatar (separate
// from their player avatar), games managed, and a 0-10 satisfaction score
// averaged from post-game "how was your manager?" ratings.
export default function ManagerCard({ name, avatarUrl, gamesManaged = 0, satisfactionScore = 10, reviewCount = 0 }) {
  return (
    <div style={{
      width: 320, borderRadius: 20, overflow: 'hidden',
      background: 'linear-gradient(135deg, #1c1e21, #27292d)',
      border: '1px solid rgba(240,157,81,0.25)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      position: 'relative',
    }}>
      {/* Decorative accent shapes, echoing the reference business-card style */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 160, height: 160,
        borderRadius: '50%', background: 'rgba(240,157,81,0.08)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -50, left: -30, width: 120, height: 120,
        borderRadius: '50%', background: 'rgba(240,157,81,0.05)', pointerEvents: 'none',
      }} />

      <div style={{ padding: '28px 24px', position: 'relative' }}>
        <div style={{
          fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, letterSpacing: 3,
          color: 'var(--accent)', marginBottom: 18,
        }}>
          BOLAHH · GAME MANAGER
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'var(--accent)', border: '2px solid rgba(240,157,81,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Bebas Neue'", fontSize: 26, color: '#fff',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (name?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 1.5, color: '#fff',
              lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name || 'Manager'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Session Organiser</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 18 }} />

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              <IoCalendarOutline size={12} /> GAMES MANAGED
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: '#fff', letterSpacing: 1 }}>
              {gamesManaged}
            </div>
          </div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              <IoStar size={12} color="var(--accent)" /> SATISFACTION
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: 'var(--accent)', letterSpacing: 1 }}>
                {Number(satisfactionScore).toFixed(1)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>/10</span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, marginTop: 14,
          fontSize: 11, color: 'var(--muted)',
        }}>
          <IoChatbubbleEllipsesOutline size={12} />
          {reviewCount > 0
            ? `Based on ${reviewCount} player review${reviewCount !== 1 ? 's' : ''}`
            : 'No reviews yet — starting score'}
        </div>
      </div>
    </div>
  );
}
