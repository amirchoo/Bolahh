import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProgressionPanel from '../components/ProgressionPanel';

export default function ProgressionPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' }}>

        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}
        >← Back to Profile</button>

        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
          MY PROGRESSION
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
          Every rated game, tracked. See how far you've climbed and what's next.
        </p>

        <ProgressionPanel />
      </div>
    </div>
  );
}
