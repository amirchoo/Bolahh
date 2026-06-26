import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { AiFillEyeInvisible as IconEyeHide, AiFillEye as IconEyeShow } from 'react-icons/ai';
import { IoMail } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const { t } = useTranslation();
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
      setError(t('login.errors.fillAll'));
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
        setError(t('login.errors.noAccount'));
        setLoading(false);
        return;
      }
      email = profile.email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        setError(t('login.errors.invalid'));
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate(identifier.toLowerCase() === 'bolahhadmin' ? '/admin' : (from || '/home'));
    }
  };

  const handleForgotPassword = async () => {
    setForgotError('');
    if (!forgotEmail) {
      setForgotError(t('login.forgot.errorEmail'));
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><IoMail size={56} color="var(--accent)" /></div>
              <h2 style={{
                fontFamily: "'Bebas Neue'", fontSize: 32,
                letterSpacing: 2, marginBottom: 10, color: 'var(--text)'
              }}>
                {t('login.checkEmail.title')}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                {t('login.checkEmail.sent')}
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
                {t('login.checkEmail.backToSignIn')}
              </button>
            </div>
          ) : (
            <>
              <div onClick={() => navigate('/')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, cursor: 'pointer' }}>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3 }}>
                  <span style={{ color: '#e8e9eb' }}>B<span style={{ color: '#F09D51' }}>O</span>LAHH</span>
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Bebas Neue'", fontSize: 36,
                letterSpacing: 2, marginBottom: 6, color: 'var(--text)'
              }}>
                {t('login.forgot.title')}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
                {t('login.forgot.subtitle')}
              </p>

              {forgotError && <div style={errorBox}>{forgotError}</div>}

              <label style={labelStyle}>{t('login.forgot.emailLabel')}</label>
              <input type="email" placeholder="player@email.com" value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />

              <button onClick={handleForgotPassword} disabled={forgotLoading} style={{
                width: '100%', marginTop: 20, padding: '14px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15, opacity: forgotLoading ? 0.6 : 1
              }}>
                {forgotLoading ? t('login.forgot.sending') : t('login.forgot.sendLink')}
              </button>

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
                <span onClick={() => setForgotMode(false)}
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  {t('login.forgot.backToSignIn')}
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
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3 }}>
            <span style={{ color: '#e8e9eb' }}>B<span style={{ color: '#F09D51' }}>O</span>LAHH</span>
          </span>
        </div>

        <h2 style={{
          fontFamily: "'Bebas Neue'", fontSize: 36,
          letterSpacing: 2, marginBottom: 6, color: 'var(--text)'
        }}>
          {t('login.welcomeBack')}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          {t('login.subtitle')}
        </p>

        {error && <div style={errorBox}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>{t('login.emailLabel')}</label>
            <input placeholder={t('login.emailPlaceholder')} value={form.identifier}
              onChange={e => setForm({ ...form, identifier: e.target.value })} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1 }}>{t('login.passwordLabel')}</label>
              <span onClick={() => setForgotMode(true)}
                style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                {t('login.forgotPassword')}
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
                {showPassword ? <IconEyeHide size={16}/> : <IconEyeShow size={16}/>}
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
          {loading ? t('login.signingIn') : t('login.signIn')}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          {t('login.noAccount')}{' '}
          <span onClick={() => navigate('/signup')}
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
            {t('login.signUp')}
          </span>
        </p>
      </div>
    </div>
  );
}
