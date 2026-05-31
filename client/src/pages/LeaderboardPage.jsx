import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCached, setCached } from '../lib/dataCache';
import { usePersistedState } from '../lib/usePersistedState';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getRank, getRankColor } from '../lib/rankUtils';
import { getCardTheme, STATS, POSITION_ABBR } from '../components/FifaCard';
import { IconLoading } from '../components/Icons';
import { IoTrophyOutline, IoCheckmark } from 'react-icons/io5';
import { FaLocationDot } from 'react-icons/fa6';

const AREAS = ['All Areas', 'Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang', 'Ansan'];
const POSITIONS = ['All', 'Attacker', 'Midfielder', 'Defender', 'Goalkeeper'];

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const RANK_NUM_COLOR = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = usePersistedState('lb_area', 'All Areas');
  const [posFilter, setPosFilter] = usePersistedState('lb_pos', 'All');

  useEffect(() => {
    const cached = getCached('leaderboard');
    if (cached) { setPlayers(cached); setLoading(false); }
    fetchLeaderboard(!!cached);
  }, []);

  const fetchLeaderboard = async (silent = false) => {
    if (!silent) setLoading(true);

    // total_points is the authoritative OVR — synced every time a user visits their profile
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, position, area, avatar_url, games_played, is_subscribed, subscription_expires_at, total_points, card_stats')
      .gt('total_points', 0)
      .order('total_points', { ascending: false });

    if (error || !profiles || profiles.length === 0) { setLoading(false); return; }

    const enriched = profiles.map(p => ({
      ...p,
      overall: p.total_points,
      pac: p.card_stats?.pac || 30,
      sho: p.card_stats?.sho || 30,
      pas: p.card_stats?.pas || 30,
      dri: p.card_stats?.dri || 30,
      def: p.card_stats?.def || 30,
      phy: p.card_stats?.phy || 30,
    }));
    setPlayers(enriched);
    setCached('leaderboard', enriched);
    setLoading(false);
  };

  const filtered = players.filter(p => {
    if (areaFilter !== 'All Areas' && p.area !== areaFilter) return false;
    if (posFilter !== 'All' && p.position !== posFilter) return false;
    return true;
  });

  const chipStyle = (active) => ({
    background: active ? 'rgba(240,157,81,0.15)' : 'var(--card)',
    color: active ? 'var(--accent)' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 20, padding: '6px 14px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
    fontFamily: "'DM Sans'",
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div className="page-wrap" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <IoTrophyOutline size={28} color="var(--accent)" />
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 3, color: 'var(--text)', margin: 0 }}>
            LEADERBOARD
          </h2>
        </div>

        {/* Area filter */}
        <div style={{ overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
            {AREAS.map(a => (
              <button key={a} style={chipStyle(areaFilter === a)} onClick={() => setAreaFilter(a)}>{a}</button>
            ))}
          </div>
        </div>

        {/* Position filter */}
        <div style={{ overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
            {POSITIONS.map(p => (
              <button key={p} style={chipStyle(posFilter === p)} onClick={() => setPosFilter(p)}>{p}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <IconLoading size={16} />
            <p style={{ marginTop: 12 }}>Loading rankings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
            No players found for this filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((player, idx) => {
              const rank = getRank(player.overall);
              const rankColor = getRankColor(rank);
              const theme = getCardTheme(rank);
              const pos = idx + 1;
              const isSelf = player.id === user?.id;
              const isSubscribed = player.is_subscribed && player.subscription_expires_at && new Date(player.subscription_expires_at) > new Date();

              return (
                <div
                  key={player.id}
                  style={{
                    background: isSelf ? 'rgba(240,157,81,0.06)' : 'var(--card)',
                    border: `1px solid ${isSelf ? 'rgba(240,157,81,0.35)' : 'var(--border)'}`,
                    borderRadius: 14, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Rank number */}
                  <div style={{
                    width: 28, textAlign: 'center', flexShrink: 0,
                    fontFamily: "'Bebas Neue'", fontSize: pos <= 3 ? 22 : 16,
                    color: RANK_NUM_COLOR[pos] || 'var(--muted)',
                    letterSpacing: 1,
                  }}>
                    {pos <= 3 ? MEDAL[pos] : `#${pos}`}
                  </div>

                  {/* Mini card swatch */}
                  <div style={{
                    width: 36, height: 50, borderRadius: 6, flexShrink: 0,
                    background: theme.bg,
                    border: `1.5px solid ${theme.border}`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: theme.text }}>
                        {(player.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ fontFamily: "'Space Mono'", fontSize: 6, color: theme.text, fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>
                      {POSITION_ABBR[player.position] || '—'}
                    </div>
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                        {player.name || 'Unknown'}
                      </span>
                      {isSubscribed && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, fontSize: 9, color: '#fff' }}><IoCheckmark size={9} /></span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rankColor, fontFamily: "'Space Mono'" }}>{rank}</span>
                      {player.area && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FaLocationDot size={9} />{player.area}
                        </span>
                      )}
                    </div>
                    {/* Stat bars */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {STATS.map(s => (
                        <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: "'Space Mono'", letterSpacing: 0 }}>{s.label}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Mono'" }}>{player[s.key] || 30}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OVR */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: rankColor, lineHeight: 1, letterSpacing: 1 }}>
                      {player.overall || 30}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: "'Space Mono'", letterSpacing: 1 }}>OVR</div>
                    {player.games_played > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{player.games_played} games</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--muted)', fontFamily: "'Space Mono'" }}>
            {filtered.length} player{filtered.length !== 1 ? 's' : ''} ranked
          </div>
        )}
      </div>
    </div>
  );
}
