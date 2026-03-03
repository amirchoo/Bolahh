import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Hero Section */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(240,157,81,0.1) 0%, transparent 70%)',
        padding: '80px 24px 100px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>

        {/* Logo */}
        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, background: 'var(--accent)',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22
          }}>⚽</div>
          <span style={{
            fontFamily: "'Bebas Neue'", fontSize: 32,
            letterSpacing: 4, color: 'var(--accent)'
          }}>BOLAHH</span>
        </div>

        {/* Headline */}
        <h1 className="fade-up-2" style={{
          fontFamily: "'Bebas Neue'",
          fontSize: 'clamp(52px, 10vw, 96px)',
          lineHeight: 1, letterSpacing: 4, marginBottom: 20,
          color: 'var(--text)'
        }}>
          FIND YOUR<br />
          <span style={{ color: 'var(--accent)' }}>NEXT GAME</span>
        </h1>

        {/* Subtext */}
        <p className="fade-up-3" style={{
          color: 'var(--muted)', fontSize: 16,
          maxWidth: 480, lineHeight: 1.7, marginBottom: 40
        }}>
          Join futsal matches near you. Book a slot, show up, and play.
          Malaysia's fastest growing futsal community platform.
        </p>

        {/* CTA Buttons */}
        <div className="fade-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/signup')}
            style={{
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 10,
              padding: '14px 36px', fontSize: 15, fontWeight: 700,
              letterSpacing: 0.3
            }}>
            Get Started Free
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent', color: 'var(--accent)',
              border: '1.5px solid var(--accent)', borderRadius: 10,
              padding: '14px 36px', fontSize: 15, fontWeight: 600
            }}>
            Sign In
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, marginTop: 60, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            ['200+', 'Active Players'],
            ['15+', 'Fields'],
            ['5v5 & 6v6', 'Formats'],
          ].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Bebas Neue'", fontSize: 32,
                color: 'var(--accent)', letterSpacing: 2
              }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ padding: '60px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16
        }}>
          {[
            { icon: '📍', title: 'Find by Area', desc: 'Filter games by location — Subang, PJ, KL, Shah Alam and more.' },
            { icon: '⚡', title: 'Instant Booking', desc: 'See open slots and join with one tap. No group chats needed.' },
            { icon: '👤', title: 'Player Profile', desc: 'Set your position preference and track your game history.' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>{f.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 0 40px', color: 'var(--muted)', fontSize: 12 }}>
        © 2026 Bolahh · Built for players, by players
      </div>

    </div>
  );
}
