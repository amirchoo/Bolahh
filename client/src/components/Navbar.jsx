import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(30,33,35,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>

      {/* Logo */}
      <div
        onClick={() => navigate('/home')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <div style={{
          width: 30, height: 30, background: 'var(--accent)',
          borderRadius: 7, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16
        }}>⚽</div>
        <span style={{
          fontFamily: "'Bebas Neue'", fontSize: 24,
          letterSpacing: 3, color: 'var(--accent)'
        }}>BOLAHH</span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {[
          { path: '/home', label: 'Games' },
          { path: '/profile', label: 'Profile' },
        ].map(({ path, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              background: isActive(path) ? 'rgba(240,157,81,0.12)' : 'transparent',
              color: isActive(path) ? 'var(--accent)' : 'var(--muted)',
              border: isActive(path) ? '1px solid rgba(240,157,81,0.25)' : '1px solid transparent',
              borderRadius: 8, padding: '7px 16px',
              fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s'
            }}
          >
            {label}
          </button>
        ))}

        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 16px',
            fontSize: 13, fontWeight: 500,
            marginLeft: 4,
            transition: 'all 0.15s'
          }}
        >
          Logout
        </button>
      </div>

    </nav>
  );
}
