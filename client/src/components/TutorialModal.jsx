import { useState } from 'react';
import { IoClose, IoChevronBack, IoChevronForward } from 'react-icons/io5';

// Reusable "game tutorial" style popup — a centered card over a blurred
// backdrop, used to explain a manager-flow mechanic in more depth than fits
// inline on the page itself. Built for ManagerWalkthroughPage.jsx's step
// tutorials, but generic enough for any step to reuse.
//
// Two modes:
//  - Single page: pass `title`/`badge`/`children` directly.
//  - Paginated:   pass `pages` — an array of { badge?, title, content } —
//    for a multi-slide tutorial with dot indicators and Back/Next nav.
export default function TutorialModal({ title, badge, onClose, children, pages, maxWidth = 640 }) {
  const isPaginated = Array.isArray(pages) && pages.length > 0;
  const [pageIdx, setPageIdx] = useState(0);
  const current = isPaginated ? pages[pageIdx] : null;
  const isLast = isPaginated && pageIdx === pages.length - 1;
  const isFirst = pageIdx === 0;

  const shownBadge = isPaginated ? current.badge ?? badge : badge;
  const shownTitle = isPaginated ? current.title : title;

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
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4,
          display: 'flex',
        }}><IoClose size={22} /></button>

        {shownBadge && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 12,
            background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.3)',
            borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#64a0ff',
            fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          }}>{shownBadge}</div>
        )}

        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 2,
          color: 'var(--text)', marginBottom: 16, paddingRight: 28,
        }}>{shownTitle}</div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {isPaginated ? current.content : children}
        </div>

        {isPaginated && pages.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setPageIdx(i => Math.max(0, i - 1))} disabled={isFirst} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--card2)', color: isFirst ? 'var(--border)' : 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px',
              fontSize: 13, fontWeight: 600, cursor: isFirst ? 'default' : 'pointer',
              opacity: isFirst ? 0.5 : 1,
            }}><IoChevronBack size={14} /> Back</button>

            <div style={{ display: 'flex', gap: 6 }}>
              {pages.map((_, i) => (
                <button key={i} type="button" onClick={() => setPageIdx(i)} aria-label={`Page ${i + 1}`} style={{
                  width: i === pageIdx ? 18 : 7, height: 7, borderRadius: 4,
                  background: i === pageIdx ? 'var(--accent)' : 'var(--border)',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'width 0.2s',
                }} />
              ))}
            </div>

            <button type="button" onClick={() => isLast ? onClose() : setPageIdx(i => Math.min(pages.length - 1, i + 1))} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>{isLast ? 'Got it' : 'Next'} {!isLast && <IoChevronForward size={14} />}</button>
          </div>
        )}
      </div>
    </div>
  );
}
