import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaLocationDot } from 'react-icons/fa6';
import { MdDateRange, MdAccessTime } from 'react-icons/md';
import { useTranslation } from 'react-i18next';

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday}, ${day} ${month}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${timeStr}${ampm}`;
};

export default function GameCard({ game }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const playerCount = game._playerCount ?? 0;
  const full = playerCount >= game.slots;
  const pct = Math.round((playerCount / game.slots) * 100);
  const open = game.slots - playerCount;
  // Below this fill level, showing the raw headcount reads as "nobody wants this game"
  // and discourages joining — lead with opportunity framing instead until it fills up more.
  const showCount = full || pct >= 40;
  const images = game.fields?.images;
  const coverImage = useMemo(() => {
    if (!Array.isArray(images) || images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
  }, [images, game.id]);

  const now = new Date();
  const [gy, gm, gd] = game.date.split('-').map(Number);
  const [gh, gmin] = (game.time || '00:00').split(':').map(Number);
  const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
  const lockoutStart = new Date(gameStart.getTime() - 10 * 60 * 1000);
  const gameEnd = new Date(gameStart.getTime() + 2 * 60 * 60 * 1000);

  const timedOut = now >= lockoutStart && now < gameStart;
  const ongoing  = now >= gameStart && now < gameEnd;
  const ended    = now >= gameEnd;

  // Cards are clickable once game has started (ongoing/ended); blocked only during 10-min window or if full+not started
  const clickable = (ongoing || ended) || (!timedOut && !full);

  const handleClick = () => {
    if (!clickable) return;
    if (!user) { navigate('/login', { state: { from: `/game/${game.id}` } }); return; }
    navigate(`/game/${game.id}`);
  };

  // Overlay shown on cover image
  let overlayText = null;
  let overlayColor = 'var(--red)';
  if (timedOut) { overlayText = t('home.timeOut'); overlayColor = 'var(--red)'; }
  else if (ongoing) { overlayText = t('home.ongoing'); overlayColor = '#4ade80'; }
  else if (ended) { overlayText = t('home.gameEnded'); overlayColor = 'var(--accent)'; }
  else if (full) { overlayText = t('home.full'); overlayColor = 'var(--red)'; }

  // Bottom status dot + label
  let statusLabel, statusColor, statusDot;
  if (timedOut) {
    statusLabel = t('home.timeOutLabel'); statusColor = 'var(--red)'; statusDot = 'var(--red)';
  } else if (ongoing) {
    statusLabel = t('home.ongoingLabel'); statusColor = '#4ade80'; statusDot = '#4ade80';
  } else if (ended) {
    statusLabel = t('home.gameEndedLabel'); statusColor = 'var(--accent)'; statusDot = 'var(--accent)';
  } else if (full) {
    statusLabel = t('home.gameFullLabel'); statusColor = 'var(--red)'; statusDot = 'var(--red)';
  } else {
    statusColor = open <= 5 ? 'var(--red)' : open <= 10 ? 'var(--accent)' : 'var(--text)';
    statusDot = open <= 5 ? 'var(--red)' : open <= 10 ? 'var(--accent)' : '#ffffff';
    statusLabel = t('home.slotsLeft', { count: open });
  }

  const dimmed = timedOut || (full && !ongoing && !ended);

  return (
    <div
      onClick={handleClick}
      style={{
        background: dimmed ? 'var(--card2)' : 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        opacity: dimmed ? 0.65 : 1,
        transition: 'border-color 0.2s, transform 0.15s',
        cursor: clickable ? 'pointer' : 'not-allowed',
      }}
      onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {coverImage && (
        <div style={{ width: '100%', height: 140, overflow: 'hidden', position: 'relative' }}>
          <img src={coverImage} alt={game.fields?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {overlayText && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 3,
              color: overlayColor,
            }}>
              {overlayText}
            </div>
          )}
        </div>
      )}

      {/* No-image fallback overlay */}
      {!coverImage && overlayText && (
        <div style={{
          background: 'var(--card2)', borderBottom: '1px solid var(--border)',
          padding: '8px 0', textAlign: 'center',
          fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 3,
          color: overlayColor,
        }}>
          {overlayText}
        </div>
      )}

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, color: 'var(--text)' }}>{game.fields?.name}</div>
            {game.court && (
              <div style={{ color: 'var(--accent)', fontSize: 12, fontFamily: "'Space Mono'", marginBottom: 2 }}>{t('home.court', { court: game.court })}</div>
            )}
            <div style={{ color: 'var(--text)', fontSize: 13, opacity: 0.6 }}>{game.title}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: 'rgba(240,157,81,0.12)', color: 'var(--accent)',
              border: '1px solid rgba(240,157,81,0.25)',
              borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", fontWeight: 700,
            }}>{game.format}</span>
            <div style={{ marginTop: 6, fontFamily: "'Space Mono'", fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
              RM {game.price}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { icon: <FaLocationDot />, label: game.area },
            { icon: <MdDateRange />, label: formatDate(game.date) },
            { icon: <MdAccessTime />, label: formatTime(game.time) },
          ].map(({ icon, label }) => (
            <span key={label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'",
            }}>{icon}{label}</span>
          ))}
        </div>

        {/* Slot progress bar — only when game hasn't started */}
        {!timedOut && !ongoing && !ended && (
          <div style={{ marginBottom: 14 }}>
            {showCount ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>
                  <span>{playerCount}/{game.slots} {t('home.players')}</span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--red)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                {t('home.earlySpot')}
              </div>
            )}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 12, borderTop: '1px solid var(--border)',
        }}>
          <span style={{
            fontSize: 12, fontWeight: (timedOut || ongoing || ended || full) ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: 6,
            color: statusColor,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: statusDot,
              ...(ongoing ? { animation: 'pulse 1.8s ease-in-out infinite' } : {}),
            }} />
            {statusLabel}
          </span>

          {(ongoing || ended) && (
            <span style={{ fontSize: 13, color: ongoing ? '#4ade80' : 'var(--accent)', fontWeight: 600 }}>
              {ended ? t('home.viewSummary') : t('home.viewMatch')}
            </span>
          )}
          {!timedOut && !ongoing && !ended && !full && (
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
              {t('home.viewDetails')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
