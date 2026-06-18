import { useNavigate } from 'react-router-dom';

/**
 * PromoCard — flexible promotional event card.
 *
 * Props:
 *   image       string   — background image URL (optional)
 *   tag         string   — small label above title e.g. "TOURNAMENT" / "LIMITED" (optional)
 *   tagColor    string   — css color for the tag, defaults to accent orange
 *   title       string   — main event name
 *   subtitle    string   — short description or date range (optional)
 *   badge       string   — pill text e.g. "FREE ENTRY" / "RM 20" (optional)
 *   ctaLabel    string   — button text, defaults to "View Event"
 *   ctaPath     string   — internal route to navigate to on click (optional)
 *   ctaHref     string   — external URL to open on click (optional, used if ctaPath not set)
 *   accent      string   — override the card's accent color (optional)
 *   dark        bool     — use a fully dark card instead of image overlay (optional)
 */
export default function PromoCard({
  image,
  tag,
  tagColor,
  title,
  subtitle,
  badge,
  ctaLabel = 'View Event',
  ctaPath,
  ctaHref,
  accent = '#F09D51',
  dark = false,
}) {
  const navigate = useNavigate();

  const handleCta = (e) => {
    e.stopPropagation();
    if (ctaPath) navigate(ctaPath);
    else if (ctaHref) window.open(ctaHref, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = () => {
    if (ctaPath) navigate(ctaPath);
    else if (ctaHref) window.open(ctaHref, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${accent}30`,
        background: dark ? 'var(--card)' : '#111',
        cursor: (ctaPath || ctaHref) ? 'pointer' : 'default',
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        transition: 'transform 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = `${accent}70`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = `${accent}30`;
      }}
    >
      {/* Background image */}
      {image && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      )}

      {/* Gradient overlay so text is always readable */}
      <div style={{
        position: 'absolute', inset: 0,
        background: image
          ? 'linear-gradient(to top, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 100%)'
          : `linear-gradient(135deg, ${accent}18 0%, transparent 70%)`,
      }} />

      {/* Badge pill — top right */}
      {badge && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: accent, color: '#fff',
          fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 1.5,
          borderRadius: 6, padding: '3px 10px',
          zIndex: 2,
        }}>
          {badge}
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: '20px 20px 18px' }}>
        {tag && (
          <div style={{
            fontFamily: "'Space Mono'", fontSize: 10, letterSpacing: 2,
            color: tagColor || accent, marginBottom: 6, fontWeight: 700,
          }}>
            {tag}
          </div>
        )}

        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 2,
          color: '#fff', lineHeight: 1.1, marginBottom: subtitle ? 6 : 14,
        }}>
          {title}
        </div>

        {subtitle && (
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.65)',
            fontFamily: "'DM Sans'", marginBottom: 14, lineHeight: 1.4,
          }}>
            {subtitle}
          </div>
        )}

        {(ctaPath || ctaHref) && (
          <button
            onClick={handleCta}
            style={{
              background: accent, color: '#fff',
              border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              fontFamily: "'DM Sans'", cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
