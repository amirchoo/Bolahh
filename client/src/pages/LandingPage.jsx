import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
  minHeight: '100vh',
  backgroundImage: "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('pitchpic.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
}}>

      {/* Hero Section */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(240,157,81,0.1) 0%, transparent 70%)',
        padding: '80px 24px 100px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>

        {/* Title */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
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
          PLAY YOUR<br />
          <span style={{ color: 'var(--accent)' }}>NEXT GAME</span>
        </h1>

        {/* Subtext */}
        <p className="fade-up-3" style={{
          color: 'var(--text)', fontSize: 16,
          maxWidth: 480, lineHeight: 1.7, marginBottom: 40
        }}>
          Everyone, Everywhere, Everytime
          <br />
          Join Malaysia's fastest growing football platform now
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
            Be a Player Now
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
            ['10+', 'Fields'],
            ['5v5,6v6', 'Formats'],
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

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 0 40px', color: 'var(--muted)', fontSize: 12 }}>
        © 2026 Bolahh · By Players, For Players
      </div>

    </div>
  );
}
