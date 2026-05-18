import { useState, useEffect } from 'react';
import { IoConstructOutline, IoClose } from 'react-icons/io5';

const STORAGE_KEY = 'wip_dismissed_date';

export default function WIPBanner() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (dismissed !== today) setVisible(true);
  }, []);

  const dismiss = () => {
    if (checked) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(STORAGE_KEY, today);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      onClick={e => e.target === e.currentTarget && dismiss()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '28px 24px',
        maxWidth: 360,
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>
        {/* close X */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'transparent', border: 'none',
            color: 'var(--muted)', cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center',
          }}
        >
          <IoClose size={18} />
        </button>

        {/* icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(240,157,81,0.12)',
          border: '1.5px solid rgba(240,157,81,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <IoConstructOutline size={26} color="var(--accent)" />
        </div>

        {/* heading */}
        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 22,
          letterSpacing: 2, color: 'var(--text)',
          textAlign: 'center', marginBottom: 10,
        }}>
          WORK IN PROGRESS
        </div>

        {/* message */}
        <p style={{
          color: 'var(--muted)', fontSize: 13, lineHeight: 1.75,
          textAlign: 'center', marginBottom: 22,
        }}>
          This website is still a work in progress.Please note that there will be bugs!
          <br />
          <span style={{ color: 'var(--accent)', fontFamily: "'Space Mono'", fontSize: 12 }}>— cho</span>
        </p>

        {/* dont show today checkbox */}
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: 'pointer', marginBottom: 18,
          fontSize: 12, color: 'var(--muted)', userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
          />
          Don't show this again today
        </label>

        {/* got it button */}
        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '12px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10,
            fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 2,
            cursor: 'pointer',
          }}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
