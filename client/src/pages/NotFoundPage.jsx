import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { GiSoccerBall } from 'react-icons/gi';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 'calc(100vh - 64px)',
        padding: '0 24px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 'clamp(100px, 20vw, 180px)',
          color: 'var(--accent)', lineHeight: 1, letterSpacing: 4,
          opacity: 0.15, userSelect: 'none', position: 'absolute',
          pointerEvents: 'none',
        }}>
          404
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(240,157,81,0.1)', border: '2px solid rgba(240,157,81,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <GiSoccerBall size={32} color="var(--accent)" />
          </div>

          <h1 style={{
            fontFamily: "'Bebas Neue'", fontSize: 'clamp(36px, 6vw, 56px)',
            letterSpacing: 4, color: 'var(--text)', marginBottom: 8,
          }}>
            PAGE NOT FOUND
          </h1>

          <p style={{
            color: 'var(--muted)', fontSize: 15, marginBottom: 36,
            maxWidth: 340, lineHeight: 1.6,
          }}>
            Looks like this page went out of bounds. Let's get you back on the pitch.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'var(--card)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 10,
                padding: '11px 24px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', letterSpacing: 0.5,
              }}
            >
              ← Go Back
            </button>
            <button
              onClick={() => navigate('/home')}
              style={{
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10,
                padding: '11px 24px', fontWeight: 700,
                cursor: 'pointer', letterSpacing: 1,
                fontFamily: "'Bebas Neue'", fontSize: 16,
              }}
            >
              BACK TO HOME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
