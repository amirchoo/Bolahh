import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);
  const didSwipe = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data?.length) setBanners(data); });
  }, []);

  const startTimer = (count) => {
    clearInterval(timerRef.current);
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % count);
    }, 3000);
  };

  useEffect(() => {
    startTimer(banners.length);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  if (!banners.length) return null;

  const goTo = (idx) => {
    setCurrent((idx + banners.length) % banners.length);
    startTimer(banners.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    didSwipe.current = false;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      didSwipe.current = true;
      goTo(current + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  const handleDotClick = (e, idx) => {
    e.stopPropagation();
    goTo(idx);
  };

  const b = banners[current];
  const handleClick = () => {
    if (didSwipe.current || !b.link_url) return;
    if (b.link_url.startsWith('/')) navigate(b.link_url);
    else window.open(b.link_url, '_blank', 'noopener noreferrer');
  };

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        marginBottom: 28,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        aspectRatio: '16 / 4',
        background: 'var(--card)',
        cursor: b.link_url ? 'pointer' : 'default',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      {banners.map((banner, i) => (
        <div
          key={banner.id}
          style={{
            position: 'absolute', inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: i === current ? 'auto' : 'none',
          }}
        >
          <img
            src={banner.image_url}
            alt={banner.title || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {(banner.title || banner.subtitle) && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
              padding: 'clamp(16px, 6vw, 32px) 20px 14px',
            }}>
              {banner.title && (
                <div style={{
                  fontFamily: "'Bebas Neue'", fontSize: 'clamp(13px, 4.2vw, 22px)', letterSpacing: 2, color: '#fff', lineHeight: 1.1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {banner.title}
                </div>
              )}
              {banner.subtitle && (
                <div style={{
                  fontSize: 'clamp(9px, 2.6vw, 13px)', color: 'rgba(255,255,255,0.8)', marginTop: 3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {banner.subtitle}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 10, right: 14,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => handleDotClick(e, i)}
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                borderRadius: 3,
                border: 'none',
                background: i === current ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.3s',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
