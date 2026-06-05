import { useState } from 'react';
import { GiSoccerBall } from 'react-icons/gi';

export default function ServerDownPage() {
  const [checking, setChecking] = useState(false);

  const handleRetry = () => {
    setChecking(true);
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Bebas Neue'", fontSize: 'clamp(100px, 20vw, 180px)',
        color: 'var(--accent)', lineHeight: 1, letterSpacing: 4,
        opacity: 0.08, userSelect: 'none', position: 'absolute',
        pointerEvents: 'none',
      }}>
        503
      </div>

      <div style={{ position: 'relative', maxWidth: 400 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(240,157,81,0.1)', border: '2px solid rgba(240,157,81,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <GiSoccerBall size={32} color="var(--accent)" />
        </div>

        <h1 style={{
          fontFamily: "'Bebas Neue'", fontSize: 'clamp(32px, 6vw, 52px)',
          letterSpacing: 4, color: 'var(--text)', marginBottom: 8,
        }}>
          SERVER IS DOWN
        </h1>

        <p style={{
          color: 'var(--muted)', fontSize: 15, marginBottom: 8,
          lineHeight: 1.6,
        }}>
          We're having trouble connecting to the server right now.
          The game will be back soon — hang tight.
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(240,96,67,0.1)', border: '1px solid rgba(240,96,67,0.25)',
          borderRadius: 8, padding: '6px 14px', fontSize: 12,
          color: '#f07060', marginBottom: 32, letterSpacing: 0.5,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#f07060', flexShrink: 0,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          Service unavailable
        </div>

        <button
          onClick={handleRetry}
          disabled={checking}
          style={{
            background: checking ? 'var(--card)' : 'var(--accent)',
            color: checking ? 'var(--muted)' : '#fff',
            border: 'none', borderRadius: 10,
            padding: '12px 32px', fontWeight: 700,
            cursor: checking ? 'not-allowed' : 'pointer',
            letterSpacing: 1, fontFamily: "'Bebas Neue'", fontSize: 16,
            transition: 'all 0.2s',
          }}
        >
          {checking ? 'RETRYING...' : 'TRY AGAIN'}
        </button>
      </div>
    </div>
  );
}
