import { useEffect, useState, useRef } from 'react';
import { IoCloudUploadOutline, IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';
import { supabase } from '../lib/supabaseClient';

export async function fetchAvatarPresets() {
  const { data } = await supabase.from('avatar_presets').select('image_url').order('created_at', { ascending: true });
  return (data || []).map(r => r.image_url);
}

export default function AvatarPicker({ value, onSelect, size = 64, onUploadClick, uploadLabel = 'Upload' }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const scrollTimeout = useRef(null);

  useEffect(() => {
    fetchAvatarPresets().then(opts => { setOptions(opts); setLoading(false); });
  }, []);

  const slides = [
    ...options.map(url => ({ type: 'preset', url })),
    ...(onUploadClick ? [{ type: 'upload' }] : []),
  ];

  const peekSize = Math.round(size * 0.7);

  const scrollToIndex = (index, behavior = 'smooth') => {
    const track = trackRef.current;
    const child = track?.children[index];
    if (!track || !child) return;
    const targetLeft = child.offsetLeft - (track.clientWidth - child.clientWidth) / 2;
    track.scrollTo({ left: targetLeft, behavior });
  };

  // Center on the currently-selected preset (or the first slide) once loaded.
  // Scrolling (rather than setting state directly) lets the scroll handler below
  // pick up and confirm the resulting activeIndex once the browser settles.
  useEffect(() => {
    if (loading || slides.length === 0) return;
    const initialIndex = Math.max(0, options.findIndex(u => u === value));
    scrollToIndex(initialIndex, 'auto');
    // Only run when loading finishes — this is a one-time initial-position effect
  }, [loading]);

  const handleScroll = () => {
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const center = track.scrollLeft + track.clientWidth / 2;
      let closest = 0, closestDist = Infinity;
      Array.from(track.children).forEach((child, i) => {
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(childCenter - center);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      // Swiping only previews — it moves the highlighted/centered slide but does
      // not commit a selection. Only an explicit tap (see goTo) confirms a pick,
      // since committing on scroll-settle would fire on every swipe-past, which
      // in the profile modal immediately saves and closes.
      setActiveIndex(closest);
    }, 120);
  };

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    scrollToIndex(clamped);
    setActiveIndex(clamped);
    const slide = slides[clamped];
    if (slide.type === 'preset') onSelect(slide.url);
  };

  if (loading) {
    return <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>Loading avatars...</p>;
  }
  if (!slides.length) {
    return <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>No avatars available yet.</p>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="hide-scrollbar"
        style={{
          display: 'flex', alignItems: 'center', overflowX: 'auto', scrollSnapType: 'x mandatory',
          gap: 16, padding: `10px calc(50% - ${size / 2}px)`, WebkitOverflowScrolling: 'touch',
        }}
      >
        {slides.map((slide, i) => {
          const isActive = i === activeIndex;
          const dim = isActive ? size : peekSize;
          const key = slide.type === 'upload' ? 'upload' : slide.url;

          if (slide.type === 'upload') {
            return (
              <button
                key={key}
                type="button"
                onClick={() => (isActive ? onUploadClick() : goTo(i))}
                style={{
                  width: dim, height: dim, borderRadius: '50%', padding: 0, flexShrink: 0,
                  scrollSnapAlign: 'center',
                  border: `2px dashed ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--card2)', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  opacity: isActive ? 1 : 0.55,
                  transition: 'width 0.25s, height 0.25s, opacity 0.25s, border-color 0.25s',
                }}
              >
                <IoCloudUploadOutline size={Math.round(dim * 0.3)} />
                <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.2, textAlign: 'center', lineHeight: 1.15, padding: '0 5px', whiteSpace: 'normal' }}>{uploadLabel}</span>
              </button>
            );
          }

          const selected = value === slide.url;
          return (
            <button
              key={key}
              type="button"
              onClick={() => goTo(i)}
              style={{
                width: dim, height: dim, borderRadius: '50%', padding: 0, flexShrink: 0,
                scrollSnapAlign: 'center',
                border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: isActive && selected ? '0 0 0 4px rgba(240,157,81,0.25)' : 'none',
                overflow: 'hidden', background: 'var(--card2)',
                opacity: isActive ? 1 : 0.55,
                transition: 'width 0.25s, height 0.25s, opacity 0.25s, box-shadow 0.25s',
              }}
            >
              <img src={slide.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0}
            style={{
              position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
              width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--text)', display: 'flex', padding: 0,
              alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              opacity: activeIndex === 0 ? 0.3 : 1, cursor: activeIndex === 0 ? 'default' : 'pointer',
            }}
          ><IoChevronBackOutline size={16} /></button>
          <button
            type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === slides.length - 1}
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
              width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--text)', display: 'flex', padding: 0,
              alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              opacity: activeIndex === slides.length - 1 ? 0.3 : 1, cursor: activeIndex === slides.length - 1 ? 'default' : 'pointer',
            }}
          ><IoChevronForwardOutline size={16} /></button>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {slides.map((_, i) => (
          <div
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === activeIndex ? 16 : 6, height: 6, borderRadius: 3,
              background: i === activeIndex ? 'var(--accent)' : 'var(--border)',
              cursor: 'pointer', transition: 'width 0.2s, background 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
