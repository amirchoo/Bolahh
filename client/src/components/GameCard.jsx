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
  const coverImage = Array.isArray(game.fields?.images) ? game.fields.images[0] : null;

  const now = new Date();
  const [gy, gm, gd] = game.date.split('-').map(Number);
  const [gh, gmin] = (game.time || '00:00').split(':').map(Number);
  const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
  const locked = now >= new Date(gameStart.getTime() - 10 * 60 * 1000);

  const disabled = full || locked;

  const handleClick = () => {
    if (full) return;
    if (!user) { navigate('/login', { state: { from: `/game/${game.id}` } }); return; }
    navigate(`/game/${game.id}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: disabled ? 'var(--card2)' : 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        opacity: disabled ? 0.65 : 1,
        transition: 'border-color 0.2s, transform 0.15s',
        cursor: full ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => { if (!full) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {coverImage && (
        <div style={{ width: '100%', height: 140, overflow: 'hidden', position: 'relative' }}>
          <img src={coverImage} alt={game.fields?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {disabled && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 3, color: 'var(--red)',
            }}>
              {locked ? t('home.timeOut') : t('home.full')}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, color: 'var(--text)' }}>{game.fields?.name}</div>
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

        {!locked && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>
              <span>{playerCount}/{game.slots} {t('home.players')}</span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--red)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 12, borderTop: '1px solid var(--border)',
        }}>
          <span style={{
            fontSize: 12, fontWeight: disabled ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6,
            color: disabled ? 'var(--red)' : open <= 5 ? 'var(--red)' : open <= 10 ? 'var(--accent)' : 'var(--text)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: disabled ? 'var(--red)' : open <= 5 ? 'var(--red)' : open <= 10 ? 'var(--accent)' : '#ffffff',
            }} />
            {locked ? t('home.timeOutLabel') : full ? t('home.gameFullLabel') : t('home.slotsLeft', { count: open })}
          </span>
          {!full && (
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
              {t('home.viewDetails')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
