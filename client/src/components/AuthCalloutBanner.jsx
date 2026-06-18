import { useNavigate } from 'react-router-dom';

/**
 * Orange banner prompting guests to sign up or log in.
 * Only render this when the user is not authenticated.
 */
export default function AuthCalloutBanner() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
      background: 'rgba(240,157,81,0.08)', border: '1px solid rgba(240,157,81,0.25)',
      borderRadius: 12, padding: '14px 20px', marginBottom: 24,
    }}>
      <div>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>Want to join a game? </span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Create an account to book your spot.</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'transparent', color: 'var(--accent)',
            border: '1px solid rgba(240,157,81,0.4)', borderRadius: 8,
            padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >Login</button>
        <button
          onClick={() => navigate('/signup')}
          style={{
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 8,
            padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >Sign Up Free</button>
      </div>
    </div>
  );
}
