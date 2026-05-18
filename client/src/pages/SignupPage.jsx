import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { IoEye, IoEyeOff, IoMail } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

export default function SignupPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', position: '', gender: '', age: '', area: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignup = async () => {
    setError('');
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      setError(t('signup.errors.fillAll'));
      return;
    }
    if (form.username.length < 3) {
      setError(t('signup.errors.usernameShort'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('signup.errors.passwordMismatch'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('signup.errors.passwordShort'));
      return;
    }
    if (!form.gender) {
      setError(t('signup.errors.noGender'));
      return;
    }
    const age = parseInt(form.age);
    if (!form.age || isNaN(age) || age < 10 || age > 70) {
      setError(t('signup.errors.invalidAge'));
      return;
    }
    if (!form.area) {
      setError(t('signup.errors.noArea'));
      return;
    }
    setLoading(true);

    const { data: existingUser } = await supabase
      .from('profiles').select('name').ilike('name', form.username.trim()).single();
    if (existingUser) {
      setError(t('signup.errors.usernameTaken'));
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username.trim(), position: form.position, gender: form.gender, age: parseInt(form.age), area: form.area }
      }
    });

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes('already registered') ||
        signUpError.message.toLowerCase().includes('already been registered') ||
        signUpError.message.toLowerCase().includes('user already exists')
      ) {
        setError(t('signup.errors.emailRegistered'));
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  // DB values stay as English; display labels are translated
  const positions = ['Attacker', 'Midfielder', 'Defender', 'Goalkeeper'];
  const genders = ['Male', 'Female', 'Rather not say'];
  const areas = ['Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang', 'Ansan'];

  const cardStyle = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420
  };

  const labelStyle = {
    fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block'
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="fade-up" style={{ ...cardStyle, textAlign: 'center', padding: '48px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><IoMail size={56} color="var(--accent)" /></div>
          <h2 style={{
            fontFamily: "'Bebas Neue'", fontSize: 32,
            letterSpacing: 2, marginBottom: 10, color: 'var(--text)'
          }}>
            {t('signup.success.title')}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
            {t('signup.success.sent')}
          </p>
          <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
            {form.email}
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
            {t('signup.success.instructions')}
          </p>
          <button onClick={() => navigate('/login')} style={{
            width: '100%', padding: '14px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15
          }}>
            {t('signup.success.goToSignIn')}
          </button>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3 }}>
              <span style={{ color: '#e8e9eb' }}>B<span style={{ color: '#F09D51' }}>O</span>LAHH</span>
            </span>
          </div>
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ms' : 'en')}
            style={{
              background: 'transparent', color: 'var(--accent)',
              border: '1px solid rgba(240,157,81,0.3)',
              borderRadius: 8, padding: '4px 10px',
              fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono'",
              cursor: 'pointer', letterSpacing: 0.5,
            }}
          >
            {i18n.language === 'ms' ? 'EN' : 'BM'}
          </button>
        </div>

        <h2 style={{
          fontFamily: "'Bebas Neue'", fontSize: 36,
          letterSpacing: 2, marginBottom: 6, color: 'var(--text)'
        }}>
          {t('signup.title')}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          {t('signup.subtitle')}
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
            <label style={labelStyle}>{t('signup.usernameLabel')}</label>
            <input placeholder={t('signup.usernamePlaceholder')} value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} />
          </div>

          <div>
            <label style={labelStyle}>{t('signup.emailLabel')}</label>
            <input type="email" placeholder="player@email.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>

          <div>
            <label style={labelStyle}>{t('signup.passwordLabel')}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingRight: 44 }} />
              <button onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--muted)', fontSize: 16, padding: 0
              }}>
                {showPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('signup.confirmPasswordLabel')}</label>
            <div style={{ position: 'relative' }}>
              <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                style={{ paddingRight: 44 }}
                onKeyDown={e => e.key === 'Enter' && handleSignup()} />
              <button onClick={() => setShowConfirm(!showConfirm)} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--muted)', fontSize: 16, padding: 0
              }}>
                {showConfirm ? <IoEyeOff size={16} /> : <IoEye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>{t('signup.positionLabel')}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {positions.map(p => (
                <button key={p}
                  onClick={() => setForm({ ...form, position: form.position === p ? '' : p })}
                  style={{
                    background: form.position === p ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: form.position === p ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${form.position === p ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 16px',
                    fontSize: 13, fontWeight: 500, transition: 'all 0.15s'
                  }}
                >{t(`signup.positions.${p}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>{t('signup.genderLabel')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {genders.map(g => (
                <button key={g}
                  onClick={() => setForm({ ...form, gender: form.gender === g ? '' : g })}
                  style={{
                    flex: 1,
                    background: form.gender === g ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: form.gender === g ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${form.gender === g ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 16px',
                    fontSize: 13, fontWeight: 500, transition: 'all 0.15s'
                  }}
                >{t(`signup.genders.${g}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('signup.ageLabel')}</label>
            <input
              type="number" placeholder={t('signup.agePlaceholder')} min="10" max="70"
              value={form.age}
              onChange={e => setForm({ ...form, age: e.target.value })}
            />
          </div>

          <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>{t('signup.areaLabel')}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {areas.map(a => (
                <button key={a}
                  onClick={() => setForm({ ...form, area: form.area === a ? '' : a })}
                  style={{
                    background: form.area === a ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: form.area === a ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${form.area === a ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 16px',
                    fontSize: 13, fontWeight: 500, transition: 'all 0.15s'
                  }}
                >{a}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSignup} disabled={loading} style={{
          width: '100%', marginTop: 24, padding: '14px',
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 10,
          fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1
        }}>
          {loading ? t('signup.creating') : t('signup.createAccount')}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          {t('signup.hasAccount')}{' '}
          <span onClick={() => navigate('/login')}
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
            {t('signup.signIn')}
          </span>
        </p>
      </div>
    </div>
  );
}
