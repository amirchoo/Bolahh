import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import { GiSoccerBall } from 'react-icons/gi';

const AREAS = ['All Areas', 'Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang'];
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

export default function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [formatFilter, setFormatFilter] = useState('All Formats');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchGames(); }, []);

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

  const fetchGames = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('games')
      .select('*, fields(name, area)')
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
    setGames(gamesWithCounts.filter(g => !deletedIds.has(g.id) && isGameVisible(g, g._playerCount)));
    setLoading(false);
  };

  const filtered = games.filter(g => {
    if (areaFilter !== 'All Areas' && g.area !== areaFilter) return false;
    if (formatFilter !== 'All Formats' && g.format !== formatFilter) return false;
    if (search && !g.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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

  return (
    <div
      onClick={() => { if (!full) navigate(`/game/${game.id}`); }}
      style={{
        background: full ? 'var(--card2)' : 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: 20,
        opacity: full ? 0.55 : 1,
        transition: 'border-color 0.2s, transform 0.15s', cursor: full ? 'not-allowed' : 'pointer'
      }}
      onMouseEnter={e => { if (!full) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
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
        {[`📍 ${game.area}`, `📅 ${formatDate(game.date)}`, `🕐 ${formatTime(game.time)}`].map(tag => (
          <span key={tag} style={{
            background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'"
          }}>{tag}</span>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>
          <span>{playerCount}/{game.slots} players</span>
          <span style={{ color: full ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
            {full ? 'FULL' : `${open} slots open`}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--red)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: 12, color: full ? 'var(--red)' : 'var(--text)', fontWeight: full ? 600 : 400 }}>
          {full ? '🔴 Game Full' : `🟢 ${open} slot${open !== 1 ? 's' : ''} left`}
        </span>
        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          View Details →
        </span>
      </div>
    </div>
  );
}