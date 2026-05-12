import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getCached, setCached } from '../lib/dataCache';
import { usePersistedState } from '../lib/usePersistedState';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import { GiSoccerBall } from 'react-icons/gi';
import { FaLocationDot } from "react-icons/fa6";
import { MdDateRange } from "react-icons/md";
import { MdAccessTime } from "react-icons/md";
import { FaRankingStar } from "react-icons/fa6";
import { TbPlayCard7Filled } from 'react-icons/tb';
import { IoWallet } from 'react-icons/io5';
import { FaInstagram } from 'react-icons/fa';



const AREAS = ['All Areas', 'Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang','Ansan'];
const FORMATS = ['All Formats', '5v5', '6v6'];

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

const get14Days = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = usePersistedState('home_area', 'All Areas');
  const [formatFilter, setFormatFilter] = usePersistedState('home_format', 'All Formats');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = usePersistedState('home_date', null);
  const days14 = get14Days();
  const dateScrollRef = useRef(null);
  const scrollDates = (dir) => {
    const el = dateScrollRef.current;
    if (!el) return;
    const firstPill = el.children[0];
    const pillW = firstPill ? firstPill.offsetWidth + 8 : 76;
    el.scrollBy({ left: dir * pillW, behavior: 'smooth' });
  };

  useEffect(() => {
    const cached = getCached('home_games');
    if (cached) { setGames(cached); setLoading(false); }
    fetchGames(!!cached);
  }, []);

  const isGameVisible = (game, playerCount) => {
    const now = new Date();
    const [year, month, day] = game.date.split('-').map(Number);
    const [hour, minute] = (game.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
    const full = playerCount >= game.slots;
    if (full) {
      return now < new Date(gameStart.getTime() + 2 * 60 * 60 * 1000);
    }
    return now < gameStart;
  };

  const fetchGames = async (silent = false) => {
    if (!silent) setLoading(true);
    const today = toDateStr(new Date());
    const { data, error } = await supabase
      .from('games')
      .select('*, fields(name, area, images)')
      .gte('date', today)
      .order('date', { ascending: true });
    if (error || !data) { setLoading(false); return; }

    // Fetch player counts for all games in parallel
    const counts = await Promise.all(
      data.map(g => supabase.from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', g.id))
    );
    const gamesWithCounts = data.map((g, i) => ({ ...g, _playerCount: counts[i].count || 0 }));

    // Auto-delete games past start time with fewer than 10 players
    const now = new Date();
    const gamesToDelete = gamesWithCounts.filter(g => {
      const [year, month, day] = g.date.split('-').map(Number);
      const [hour, minute] = (g.time || '00:00').split(':').map(Number);
      const gameStart = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
      const minPlayers = parseInt(g.format) * 2 || 10;
      return now >= gameStart && g._playerCount < minPlayers;
    });
    if (gamesToDelete.length > 0) {
      await Promise.all(gamesToDelete.map(g => supabase.from('games').delete().eq('id', g.id)));
    }
    const deletedIds = new Set(gamesToDelete.map(g => g.id));

    // Pre-filter expired games and deleted games
    const result = gamesWithCounts.filter(g => !deletedIds.has(g.id) && isGameVisible(g, g._playerCount));
    setGames(result);
    setCached('home_games', result);
    setLoading(false);
  };

  const filtered = games.filter(g => {
    if (areaFilter !== 'All Areas' && g.area !== areaFilter) return false;
    if (formatFilter !== 'All Formats' && g.format !== formatFilter) return false;
    if (search && !g.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFilter && g.date !== dateFilter) return false;
    return true;
  });

  const gameDates = new Set(games.map(g => g.date));

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>

        <div className="fade-up" style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 3, marginBottom: 4, color: 'var(--text)' }}>
            FIND YOUR GAME
          </h1>
          <p style={{ color: 'var(--text)', fontSize: 14 }}>Browse available matches and book your slot</p>
        </div>

        <div className="fade-up-2" style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <input placeholder=" Search games..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 220px', maxWidth: 320 }} />
          <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={{ flex: '0 0 180px' }}>
            {AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
          <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} style={{ flex: '0 0 150px' }}>
            {FORMATS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Date Scroll Bar — snaps 1 pill at a time */}
        <div className="fade-up-2" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <button onClick={() => scrollDates(-1)} style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--accent)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700,
            transition: 'border-color 0.15s'
          }}>‹</button>

          {/* Scrollable strip: fills remaining width */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div ref={dateScrollRef} className="hide-scrollbar" style={{
              display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0',
              scrollSnapType: 'x mandatory'
            }}>
              {/* ALL pill */}
              <button
                onClick={() => setDateFilter(null)}
                className="date-pill"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '2px 0', borderRadius: 7, border: '1px solid',
                  borderColor: dateFilter === null ? 'var(--accent)' : 'var(--border)',
                  background: dateFilter === null ? 'rgba(240,157,81,0.15)' : 'var(--card)',
                  color: dateFilter === null ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer', transition: 'all 0.15s', gap: 0,
                  scrollSnapAlign: 'start'
                }}
              >
                <span style={{ fontFamily: "'Space Mono'", fontSize: 9, opacity: 0.5 }}>SHOW</span>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, lineHeight: 1.1 }}>ALL</span>
              </button>

              {days14.map((d, i) => {
                const ds = toDateStr(d);
                const isSelected = dateFilter === ds;
                const isToday = i === 0;
                const hasGames = gameDates.has(ds);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const dayNum = d.getDate();
                const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

                return (
                  <button
                    key={ds}
                    onClick={() => setDateFilter(isSelected ? null : ds)}
                    className="date-pill"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '2px 0 5px', borderRadius: 7, border: '1px solid',
                      borderColor: isSelected ? 'var(--accent)' : isToday ? 'rgba(240,157,81,0.5)' : 'var(--border)',
                      background: isSelected ? 'rgba(240,157,81,0.13)' : isToday ? 'rgba(240,157,81,0.06)' : 'var(--card)',
                      color: isSelected ? 'var(--accent)' : 'var(--text)',
                      cursor: 'pointer', transition: 'all 0.15s', gap: 0, position: 'relative',
                      scrollSnapAlign: 'start'
                    }}
                  >
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 9, opacity: 0.45, letterSpacing: 0.5 }}>{dayName}</span>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 1, lineHeight: 1.05 }}>{dayNum}</span>
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 9, opacity: isToday ? 0.8 : 0.45, letterSpacing: 0.5, color: isToday && !isSelected ? 'var(--accent)' : 'inherit' }}>{isToday ? 'TODAY' : monthName}</span>
                    {hasGames && (
                      <span style={{
                        position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%',
                        background: isSelected ? 'var(--accent)' : 'rgba(240,157,81,0.55)'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => scrollDates(1)} style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--accent)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700,
            transition: 'border-color 0.15s'
          }}>›</button>
        </div>

        <div style={{ color: 'var(--text)', fontSize: 13, marginBottom: 18, fontFamily: "'Space Mono'" }}>
          {loading ? 'Loading...' : `${filtered.length} game${filtered.length !== 1 ? 's' : ''} found`}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}><IconLoading size={16} /></div>
            <p>Loading games...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(game => <GameCard key={game.id} game={game} />)}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}><GiSoccerBall/></div>
                <p>No games found. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <HomeFooter />
      </div>
    </div>
  );
}

function GameCard({ game }) {
  const navigate = useNavigate();
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

  return (
    <div
      onClick={() => { if (!full) navigate(`/game/${game.id}`); }}
      style={{
        background: disabled ? 'var(--card2)' : 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        opacity: disabled ? 0.65 : 1,
        transition: 'border-color 0.2s, transform 0.15s', cursor: full ? 'not-allowed' : 'pointer'
      }}
      onMouseEnter={e => { if (!full) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {coverImage && (
        <div style={{ width: '100%', height: 140, overflow: 'hidden', position: 'relative' }}>
          <img
            src={coverImage}
            alt={game.fields?.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {disabled && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 3, color: 'var(--red)'
            }}>{locked ? 'TIME OUT' : 'FULL'}</div>
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
            borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", fontWeight: 700
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
            borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'"
          }}>{icon}{label}</span>
        ))}
      </div>

      {!locked && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>
            <span>{playerCount}/{game.slots} players</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--red)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: 12, fontWeight: disabled ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6,
          color: disabled ? 'var(--red)' : open <= 5 ? 'var(--red)' : open <= 10 ? 'var(--accent)' : 'var(--text)'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: disabled ? 'var(--red)' : open <= 5 ? 'var(--red)' : open <= 10 ? 'var(--accent)' : '#ffffff'
          }} />
          {locked ? 'Time Out' : full ? 'Game Full' : `${open} slot${open !== 1 ? 's' : ''} left`}
        </span>
        {!full && (
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            View Details →
          </span>
        )}
      </div>
      </div>
    </div>
  );
}

function HomeFooter() {
  const navigate = useNavigate();
  return (
    <div style={{
      marginTop: 56, borderTop: '1px solid var(--border)',
      paddingTop: 32, paddingBottom: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>

        {/* Brand */}
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3, marginBottom: 6 }}>
            <span style={{ color: '#e8e9eb' }}>B<span style={{ color: '#F09D51' }}>O</span>LAHH</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.6, maxWidth: 220 }}>
            Malaysia's futsal booking and progression platform.
          </p>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--accent)', letterSpacing: 2, marginBottom: 10 }}>LEARN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: <GiSoccerBall size={12} />,       label: 'How It Works',  href: '#flow'   },
                { icon: <FaRankingStar size={12} />,      label: 'Rank System',   href: '#ranks'  },
                { icon: <TbPlayCard7Filled size={12} />,  label: 'Bolahh Card',   href: '#card'   },
                { icon: <IoWallet size={12} />,           label: 'Wallet',        href: '#wallet' },
              ].map(link => (
                <button
                  key={link.label}
                  onClick={() => navigate('/guide')}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 12, fontFamily: "'DM Sans'",
                    display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  {link.icon} {link.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--accent)', letterSpacing: 2, marginBottom: 10 }}>ACCOUNT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'My Profile',  path: '/profile'      },
                { label: 'Friends',     path: '/friends'      },
                { label: 'Top Up',      path: '/wallet/topup' },
              ].map(link => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 12, fontFamily: "'DM Sans'",
                    textAlign: 'left', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >{link.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--accent)', letterSpacing: 2, marginBottom: 10 }}>CONTACT US</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href="https://instagram.com/bolahhmy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12, fontFamily: "'DM Sans'", textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                <FaInstagram size={15} />
              </a>
              <a
                href="mailto:admin@bolahh.com"
                style={{ color: 'var(--muted)', fontSize: 12, fontFamily: "'DM Sans'", textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                admin@bolahh.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'DM Sans'" }}>© 2026 Bolahh. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href="https://forms.gle/cxzP7ifzdMfpA1D17"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(224,62,26,0.08)', color: '#e03e1a',
              border: '1px solid rgba(224,62,26,0.2)', borderRadius: 8,
              padding: '5px 14px', fontSize: 11, fontFamily: "'Space Mono'",
              cursor: 'pointer', letterSpacing: 1, textDecoration: 'none',
            }}
          >🐛 REPORT BUG</a>
          <button
            onClick={() => navigate('/guide')}
            style={{
              background: 'rgba(240,157,81,0.08)', color: 'var(--accent)',
              border: '1px solid rgba(240,157,81,0.2)', borderRadius: 8,
              padding: '5px 14px', fontSize: 11, fontFamily: "'Space Mono'",
              cursor: 'pointer', letterSpacing: 1,
            }}
          >GUIDE & HELP →</button>
        </div>
      </div>
    </div>
  );
}