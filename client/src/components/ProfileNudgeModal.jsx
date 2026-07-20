import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { IoClose } from 'react-icons/io5';

export default function ProfileNudgeModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!user) return;
    const sessionKey = `bolahh_profile_nudge_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: phoneRow }] = await Promise.all([
        supabase.from('profiles').select('name, gender, age, area').eq('id', user.id).maybeSingle(),
        supabase.from('player_phone_numbers').select('phone_number').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const gender = profile?.gender || user.user_metadata?.gender;
      const age = profile?.age || user.user_metadata?.age;
      const area = profile?.area || user.user_metadata?.area;
      const phone = phoneRow?.phone_number || user.user_metadata?.phone;

      sessionStorage.setItem(sessionKey, 'true');
      if (!gender || !age || !area || !phone) {
        setName(profile?.name || user.user_metadata?.username || '');
        setShow(true);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  if (!show) return null;

  const dismiss = () => setShow(false);

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div onClick={e => e.stopPropagation()} className="fade-up" style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 24px', maxWidth: 360, width: '100%',
        position: 'relative',
      }}>
        <button onClick={dismiss} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4,
          display: 'flex',
        }}><IoClose size={20} /></button>

        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 1.5, color: 'var(--text)', marginBottom: 10, paddingRight: 24 }}>
          {t('profileNudge.title', { name: name || t('profileNudge.fallbackName') })}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
          {t('profileNudge.message')}
        </p>
        <button onClick={() => { setShow(false); navigate('/profile'); }} style={{
          width: '100%', padding: '12px', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>{t('profileNudge.button')}</button>
      </div>
    </div>
  );
}
