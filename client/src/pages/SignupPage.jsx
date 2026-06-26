import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { IoEye, IoEyeOff, IoMail } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

const ZONE_CONFIG = [
  { id: 'Attacker',   labelKey: 'Attacker',   svgLabel: 'ATTACKER',   y: 15,  h: 90, color: '#F09D51' },
  { id: 'Midfielder', labelKey: 'Midfielder', svgLabel: 'MIDFIELDER', y: 105, h: 90, color: '#F09D51' },
  { id: 'Defender',   labelKey: 'Defender',   svgLabel: 'DEFENDER',   y: 195, h: 90, color: '#F09D51' },
  { id: 'Goalkeeper', labelKey: 'Goalkeeper', svgLabel: 'GOALKEEPER', y: 285, h: 90, color: '#F09D51' },
];

// Accent orange at varying opacities for the tactical lines
const LINE  = 'rgba(240,157,81,0.45)';
const LINE2 = 'rgba(240,157,81,0.28)';
const DOT   = 'rgba(240,157,81,0.6)';

function FutsalPitch({ position, onSelect }) {
  const [hover, setHover] = useState(null);

  return (
    <svg
      viewBox="0 0 280 390"
      style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }}
    >
      <defs>
        <clipPath id="pitchClip">
          <rect x="15" y="15" width="250" height="360" rx="5" />
        </clipPath>
      </defs>

      {/* Field background — dark, matches card palette */}
      <rect x="15" y="15" width="250" height="360" rx="5" fill="#0e0f10" />

      {/* Subtle alternating lane stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="15" y={15 + i * 45} width="250" height="45"
          fill={i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
          clipPath="url(#pitchClip)"
        />
      ))}

      {/* Zone fill highlights */}
      {ZONE_CONFIG.map(z => (
        <rect
          key={z.id}
          x="15" y={z.y} width="250" height={z.h}
          fill={z.color}
          fillOpacity={position === z.id ? 0.18 : hover === z.id ? 0.07 : 0}
          clipPath="url(#pitchClip)"
          style={{ transition: 'fill-opacity 0.15s' }}
        />
      ))}

      {/* Inner boundary */}
      <rect x="23" y="23" width="234" height="344"
        fill="none" stroke={LINE} strokeWidth="1.5"
        clipPath="url(#pitchClip)" />

      {/* Goals — accent tinted */}
      <rect x="100" y="4" width="80" height="13" rx="2"
        fill="rgba(240,157,81,0.08)" stroke={LINE} strokeWidth="1.5" />
      <rect x="100" y="373" width="80" height="13" rx="2"
        fill="rgba(240,157,81,0.08)" stroke={LINE} strokeWidth="1.5" />

      {/* Penalty areas */}
      <rect x="65" y="23" width="150" height="55"
        fill="none" stroke={LINE2} strokeWidth="1.2"
        clipPath="url(#pitchClip)" />
      <rect x="65" y="312" width="150" height="55"
        fill="none" stroke={LINE2} strokeWidth="1.2"
        clipPath="url(#pitchClip)" />

      {/* Center line */}
      <line x1="23" y1="195" x2="257" y2="195"
        stroke={LINE} strokeWidth="1.5"
        clipPath="url(#pitchClip)" />

      {/* Center circle + dot */}
      <circle cx="140" cy="195" r="38"
        fill="none" stroke={LINE} strokeWidth="1.5"
        clipPath="url(#pitchClip)" />
      <circle cx="140" cy="195" r="2.5" fill={DOT} clipPath="url(#pitchClip)" />

      {/* Penalty spots */}
      <circle cx="140" cy="78"  r="2.5" fill={DOT} clipPath="url(#pitchClip)" />
      <circle cx="140" cy="312" r="2.5" fill={DOT} clipPath="url(#pitchClip)" />

      {/* Selected zone border glow */}
      {ZONE_CONFIG.map(z => position === z.id && (
        <rect key={`sel-${z.id}`}
          x="15" y={z.y} width="250" height={z.h}
          fill="none" stroke="#F09D51" strokeWidth="2" strokeOpacity="0.7"
          clipPath="url(#pitchClip)" />
      ))}

      {/* Clickable zones + labels */}
      {ZONE_CONFIG.map(z => (
        <g
          key={z.id}
          onClick={() => onSelect(z.id)}
          onMouseEnter={() => setHover(z.id)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: 'pointer' }}
        >
          <rect x="15" y={z.y} width="250" height={z.h}
            fill="transparent" clipPath="url(#pitchClip)" />
          <text
            x="140" y={z.y + 50}
            textAnchor="middle"
            fill={
              position === z.id
                ? '#F09D51'
                : hover === z.id
                ? 'rgba(240,157,81,0.55)'
                : 'rgba(240,157,81,0.22)'
            }
            fontSize="11"
            fontFamily="'Bebas Neue', sans-serif"
            letterSpacing="3"
            style={{ userSelect: 'none', transition: 'fill 0.15s' }}
          >
            {z.svgLabel}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [stepDir, setStepDir] = useState('forward');
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    position: '', gender: '', age: '', area: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const genders = ['Male', 'Female', 'Rather not say'];
  const areas = ['Kuala Lumpur', 'Petaling Jaya', 'Subang', 'Shah Alam', 'Ansan'];

  const advance = () => { setStepDir('forward'); setStep(s => s + 1); };
  const goBack  = () => { setError(''); setStepDir('back'); setStep(s => s - 1); };;

  const handleStep1 = async () => {
    setError('');
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      setError(t('signup.errors.fillAll')); return;
    }
    if (form.username.length < 3) { setError(t('signup.errors.usernameShort')); return; }
    if (form.password !== form.confirmPassword) { setError(t('signup.errors.passwordMismatch')); return; }
    if (form.password.length < 6) { setError(t('signup.errors.passwordShort')); return; }

    setLoading(true);
    const { data: existing } = await supabase
      .from('profiles').select('name').ilike('name', form.username.trim()).single();
    setLoading(false);

    if (existing) { setError(t('signup.errors.usernameTaken')); return; }
    advance();
  };

  const handleSignup = async () => {
    setError('');
    if (!form.gender) { setError(t('signup.errors.noGender')); return; }
    const age = parseInt(form.age);
    if (!form.age || isNaN(age) || age < 10 || age > 70) { setError(t('signup.errors.invalidAge')); return; }
    if (!form.area) { setError(t('signup.errors.noArea')); return; }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username.trim(),
          position: form.position,
          gender: form.gender,
          age: parseInt(form.age),
          area: form.area
        }
      }
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
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

  const cardStyle = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420
  };

  const labelStyle = {
    fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block'
  };

  const chipBtn = (active) => ({
    background: active ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
    color: active ? 'var(--accent)' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8, padding: '8px 16px',
    fontSize: 13, fontWeight: 500, transition: 'all 0.15s', cursor: 'pointer'
  });

  const ErrorBlock = () => error ? (
    <div style={{
      background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)',
      borderRadius: 8, padding: '10px 14px', marginBottom: 16,
      color: 'var(--red)', fontSize: 13
    }}>
      {error}
    </div>
  ) : null;

  const Logo = () => (
    <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 28 }}>
      <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3 }}>
        <span style={{ color: '#e8e9eb' }}>B<span style={{ color: '#F09D51' }}>O</span>LAHH</span>
      </span>
    </div>
  );

  const StepBar = () => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: step >= s ? 'var(--accent)' : 'var(--border)',
          transition: 'background 0.3s'
        }} />
      ))}
    </div>
  );

  const BackTitle = ({ title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <button onClick={goBack} style={{
        background: 'none', border: 'none', color: 'var(--muted)',
        cursor: 'pointer', padding: 0, fontSize: 20, lineHeight: 1, marginTop: 2
      }}>←</button>
      <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>
        {title}
      </h2>
    </div>
  );

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="fade-up" style={{ ...cardStyle, textAlign: 'center', padding: '48px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <IoMail size={56} color="var(--accent)" />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, marginBottom: 10, color: 'var(--text)' }}>
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
            width: '100%', padding: '14px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer'
          }}>
            {t('signup.success.goToSignIn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="fade-up" style={cardStyle}>
        <Logo />
        <StepBar />

        <div key={step} className={stepDir === 'forward' ? 'step-forward' : 'step-back'}
          style={{ overflow: 'hidden' }}>

          {/* ── Step 1: Account credentials ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 2, marginBottom: 6, color: 'var(--text)' }}>
                {t('signup.title')}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
                {t('signup.subtitle')}
              </p>
              <ErrorBlock />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>{t('signup.usernameLabel')}</label>
                  <input
                    placeholder={t('signup.usernamePlaceholder')}
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('signup.emailLabel')}</label>
                  <input
                    type="email" placeholder="player@email.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('signup.passwordLabel')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      style={{ paddingRight: 44 }}
                    />
                    <button onClick={() => setShowPassword(!showPassword)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, padding: 0, cursor: 'pointer'
                    }}>
                      {showPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t('signup.confirmPasswordLabel')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      style={{ paddingRight: 44 }}
                      onKeyDown={e => e.key === 'Enter' && handleStep1()}
                    />
                    <button onClick={() => setShowConfirm(!showConfirm)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, padding: 0, cursor: 'pointer'
                    }}>
                      {showConfirm ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={handleStep1} disabled={loading} style={{
                width: '100%', marginTop: 24, padding: '14px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1, cursor: 'pointer'
              }}>
                {loading ? t('signup.checking') : `${t('signup.continueButton')} →`}
              </button>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
                {t('signup.hasAccount')}{' '}
                <span onClick={() => navigate('/login')}
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  {t('signup.signIn')}
                </span>
              </p>
            </>
          )}

          {/* ── Step 2: Position picker ── */}
          {step === 2 && (
            <>
              <BackTitle title={t('signup.positionTitle')} />
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
                {t('signup.positionSubtitle')}
              </p>

              <FutsalPitch
                position={form.position}
                onSelect={pos => setForm({ ...form, position: form.position === pos ? '' : pos })}
              />

              <div style={{ minHeight: 36, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                {form.position ? (
                  <span style={{
                    background: 'rgba(240,157,81,0.15)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(240,157,81,0.4)',
                    borderRadius: 20, padding: '4px 20px',
                    fontSize: 13, fontWeight: 600, letterSpacing: 0.5
                  }}>
                    {form.position}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>No position selected</span>
                )}
              </div>

              <button onClick={() => { setError(''); advance(); }} style={{
                width: '100%', marginTop: 16, padding: '14px',
                background: form.position ? 'var(--accent)' : 'var(--card2)',
                color: form.position ? '#fff' : 'var(--muted)',
                border: `1px solid ${form.position ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                {form.position ? `${t('signup.continueButton')} →` : `${t('signup.positionSkip')} →`}
              </button>
            </>
          )}

          {/* ── Step 3: About you ── */}
          {step === 3 && (
            <>
              <BackTitle title={t('signup.aboutTitle')} />
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
                {t('signup.aboutSubtitle')}
              </p>
              <ErrorBlock />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 10 }}>{t('signup.genderLabel')}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {genders.map(g => (
                      <button key={g}
                        onClick={() => setForm({ ...form, gender: form.gender === g ? '' : g })}
                        style={{ ...chipBtn(form.gender === g), flex: 1, padding: '8px 10px', fontSize: 12 }}
                      >
                        {t(`signup.genders.${g}`)}
                      </button>
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
                        style={chipBtn(form.area === a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleSignup} disabled={loading} style={{
                width: '100%', marginTop: 24, padding: '14px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1, cursor: 'pointer'
              }}>
                {loading ? t('signup.creating') : t('signup.createAccount')}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
