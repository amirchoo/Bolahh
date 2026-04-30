import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { AiFillEyeInvisible as IconEyeHide, AiFillEye as IconEyeShow } from 'react-icons/ai';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async () => {
    setError('');
    const identifier = form.identifier.trim();
    if (!identifier || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);

    let email = identifier;
    if (!identifier.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .ilike('name', identifier)
        .single();
      if (!profile) {
        setError('No account found with that username.');
        setLoading(false);
        return;
      }
      email = profile.email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        setError('Incorrect email/username or password. Please try again.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate(identifier.toLowerCase() === 'bolahhadmin' ? '/admin' : '/home');
    }
  };

  const handleForgotPassword = async () => {
    setForgotError('');
    if (!forgotEmail) {
      setForgotError('Please enter your email.');
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSent(true);
    }
    setForgotLoading(false);
  };

  const cardStyle = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420
  };

  const labelStyle = {
    fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block'
  };

  const errorBox = {
    background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)',
    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
    color: 'var(--red)', fontSize: 13
  };

  if (forgotMode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="fade-up" style={cardStyle}>
          {forgotSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>📧</div>
              <h2 style={{
                fontFamily: "'Bebas Neue'", fontSize: 32,
                letterSpacing: 2, marginBottom: 10, color: 'var(--text)'
              }}>
                CHECK YOUR EMAIL
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                We sent a password reset link to
              </p>
              <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15, marginBottom: 24 }}>
                {forgotEmail}
              </p>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15
                }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div onClick={() => navigate('/')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, cursor: 'pointer' }}>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3, color: 'var(--accent)' }}>
                  BOLAHH
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Bebas Neue'", fontSize: 36,
                letterSpacing: 2, marginBottom: 6, color: 'var(--text)'
              }}>
                RESET PASSWORD
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
                Enter your email and we'll send you a reset link
              </p>

              {forgotError && <div style={errorBox}>{forgotError}</div>}

              <label style={labelStyle}>EMAIL</label>
              <input type="email" placeholder="player@email.com" value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />

              <button onClick={handleForgotPassword} disabled={forgotLoading} style={{
                width: '100%', marginTop: 20, padding: '14px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15, opacity: forgotLoading ? 0.6 : 1
              }}>
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
                <span onClick={() => setForgotMode(false)}
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Back to Sign In
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      <div className="fade-up" style={cardStyle}>

        <div onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, cursor: 'pointer' }}>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3, color: 'var(--accent)' }}>
            BOLAHH
          </span>
        </div>

        <h2 style={{
          fontFamily: "'Bebas Neue'", fontSize: 36,
          letterSpacing: 2, marginBottom: 6, color: 'var(--text)'
        }}>
          WELCOME BACK
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Sign in to find your next game
        </p>

        {error && <div style={errorBox}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>EMAIL OR USERNAME</label>
            <input placeholder="player@email.com or username" value={form.identifier}
              onChange={e => setForm({ ...form, identifier: e.target.value })} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1 }}>PASSWORD</label>
              <span onClick={() => setForgotMode(true)}
                style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                Forgot password?
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ paddingRight: 44 }}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--muted)', fontSize: 16, padding: 0
              }}>
                {showPassword ? <IconEyeHide size={16}/> : <IconEyeShow size ={16}/>}
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', marginTop: 24, padding: '14px',
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 10,
          fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1
        }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <span onClick={() => navigate('/signup')}
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
