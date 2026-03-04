import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';

const AREAS = ['All Areas', 'Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang'];
const FORMATS = ['All Formats', '5v5', '6v6'];

export default function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [formatFilter, setFormatFilter] = useState('All Formats');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchGames(); }, []);

  const fetchGames = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('games').select('*, fields(name, area)').order('date', { ascending: true });
    if (!error) setGames(data);
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
            FIND A GAME
          </h1>
          <p style={{ color: 'var(--text)', fontSize: 14 }}>Browse available futsal matches and book your slot</p>
        </div>

        <div className="fade-up-2" style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <input placeholder="🔍  Search games..." value={search} onChange={e => setSearch(e.target.value)}
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
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⚽</div>
            <p>Loading games...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(game => <GameCard key={game.id} game={game} />)}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⚽</div>
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
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', game.id);
      setPlayerCount(count || 0);
    };
    fetchCount();
  }, [game.id]);

  const full = playerCount >= game.slots;
  const pct = Math.round((playerCount / game.slots) * 100);
  const open = game.slots - playerCount;

  return (
    <div
      onClick={() => navigate(`/game/${game.id}`)}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 20, transition: 'border-color 0.2s, transform 0.15s', cursor: 'pointer'
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, color: 'var(--text)' }}>{game.title}</div>
          <div style={{ color: 'var(--text)', fontSize: 13 }}>{game.fields?.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            background: 'rgba(240,157,81,0.12)', color: 'var(--accent)',
            border: '1px solid rgba(240,157,81,0.25)',
            borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", fontWeight: 700
          }}>{game.format}</span>
          <div style={{ marginTop: 6, fontFamily: "'Space Mono'", fontSize: 13, color: 'var(--tomato)', fontWeight: 700 }}>
            RM {game.price}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[`📍 ${game.area}`, `📅 ${game.date}`, `🕐 ${game.time}`].map(tag => (
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