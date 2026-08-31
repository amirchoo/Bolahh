import { IoClose } from 'react-icons/io5';

// Reusable "game tutorial" style popup — a centered card over a blurred
// backdrop, used to explain a manager-flow mechanic in more depth than fits
// inline on the page itself. Built for ManagerWalkthroughPage.jsx's step
// tutorials, but generic enough for any step to reuse.
export default function TutorialModal({ title, badge, onClose, children, maxWidth = 640 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflowY: 'auto',
      }}
    >
      <div onClick={e => e.stopPropagation()} className="fade-up" style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 18, padding: '28px 24px', maxWidth, width: '100%',
        position: 'relative', maxHeight: '88vh', overflowY: 'auto',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4,
          display: 'flex',
        }}><IoClose size={22} /></button>

        {badge && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 12,
            background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.3)',
            borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#64a0ff',
            fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          }}>{badge}</div>
        )}

        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 2,
          color: 'var(--text)', marginBottom: 16, paddingRight: 28,
        }}>{title}</div>

        {children}
      </div>
    </div>
  );
}
