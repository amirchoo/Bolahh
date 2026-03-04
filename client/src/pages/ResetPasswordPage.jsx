import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  const cardStyle = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420
  };

  const labelStyle = {
    fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block'
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'var(--bg)'
      }}>
        <div className="fade-up" style={{ ...cardStyle, textAlign: 'center', padding: '48px 36px' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
          <h2 style={{
            fontFamily: "'Bebas Neue'", fontSize: 32,
            letterSpacing: 2, marginBottom: 10, color: 'var(--text)'
          }}>
            PASSWORD UPDATED
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
            Your password has been changed successfully. You can now sign in with your new password.
          </p>
          <button onClick={() => navigate('/login')} style={{
            width: '100%', padding: '14px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15
          }}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'var(--bg)'
    }}>
      <div className="fade-up" style={cardStyle}>

        <div onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, cursor: 'pointer' }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent)',
            borderRadius: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16
          }}>⚽</div>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3, color: 'var(--accent)' }}>
            BOLAHH
          </span>
        </div>

        <h2 style={{
          fontFamily: "'Bebas Neue'", fontSize: 36,
          letterSpacing: 2, marginBottom: 6, color: 'var(--text)'
        }}>
          NEW PASSWORD
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Enter your new password below
        </p>

        {error && (
          <div style={{
            background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            color: 'var(--red)', fontSize: 13
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>NEW PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 44 }} />
              <button onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--muted)', fontSize: 16, padding: 0
              }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
            <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()} />
          </div>
        </div>

        <button onClick={handleReset} disabled={loading} style={{
          width: '100%', marginTop: 24, padding: '14px',
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 10,
          fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1
        }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}