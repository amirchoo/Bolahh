import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCached, setCached } from '../lib/dataCache';
import { usePersistedState } from '../lib/usePersistedState';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getRank, getRankTier } from '../lib/rankUtils';
import { getCardTheme, STATS, POSITION_ABBR } from '../components/FifaCard';
import { IconLoading } from '../components/Icons';
import { IoTrophyOutline, IoCheckmark } from 'react-icons/io5';
import { FaLocationDot, FaMedal } from 'react-icons/fa6';
import { AREAS as CITY_AREAS } from '../lib/areas';

const AREAS = ['All Areas', ...CITY_AREAS];
const POSITION_TABS = [
  { value: 'All',        label: 'ALL' },
  { value: 'Attacker',   label: 'ATK' },
  { value: 'Midfielder', label: 'MID' },
  { value: 'Defender',   label: 'DEF' },
  { value: 'Goalkeeper', label: 'GK'  },
];

const RANK_NUM_COLOR = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
const PAGE_SIZE = 15;

const TIER_ORDER = ['emas', 'perak', 'gangsa'];
const TIER_DISPLAY = { emas: 'EMAS', perak: 'PERAK', gangsa: 'GANGSA' };
const TIER_COLORS = { emas: '#FFD700', perak: '#6ec8e8', gangsa: '#cd7f32' };

// Key stats highlighted per position
const POS_KEY_STATS = {
  Goalkeeper: ['def', 'phy'],
  Defender:   ['def', 'phy'],
  Midfielder: ['pas', 'dri'],
  Attacker:   ['sho', 'pac'],
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = usePersistedState('lb_area', 'All Areas');
  const [posFilter, setPosFilter] = usePersistedState('lb_pos', 'All');
  const [viewMode, setViewMode] = usePersistedState('lb_view', 'global');
  const [activeTier, setActiveTier] = usePersistedState('lb_tier', 'emas');
  const [page, setPage] = useState(1);

  // Any filter/tab change can shrink the list below the current page — reset to page 1.
  useEffect(() => { setPage(1); }, [areaFilter, posFilter, viewMode, activeTier]);

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
    if (getRankTier(getRank(p.overall)) === 'novis') return false;
    return true;
  });

  const keyStats = POS_KEY_STATS[posFilter] || [];


  const renderPlayerRow = (player, pos) => {
    const rank = getRank(player.overall);
    const theme = getCardTheme(rank);
    const isSelf = player.id === user?.id;
    const isSubscribed = player.is_subscribed && player.subscription_expires_at && new Date(player.subscription_expires_at) > new Date();

    return (
      <div
        key={player.id}
        style={{
          background: theme.bg,
          border: `1.5px solid ${theme.border}`,
          boxShadow: isSelf ? '0 0 0 2px var(--accent)' : 'none',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        {/* Rank number */}
        <div style={{
          width: 28, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Bebas Neue'", fontSize: 16,
          color: RANK_NUM_COLOR[pos] || theme.muted,
          letterSpacing: 1,
        }}>
          {pos <= 3
            ? <FaMedal size={22} color={RANK_NUM_COLOR[pos]} />
            : `#${pos}`}
        </div>

        {/* Mini card swatch — statBg (not theme.bg) so it stands out against the row,
            which now carries the same rank gradient as its background */}
        <div style={{
          width: 36, height: 50, borderRadius: 6, flexShrink: 0,
          background: theme.statBg,
          border: `1.5px solid ${theme.border}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {player.avatar_url ? (
            <img src={player.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: theme.text }}>
              {(player.name || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{ fontFamily: "'Space Mono'", fontSize: 6, color: theme.text, fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>
            {POSITION_ABBR[player.position] || '-'}
          </div>
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {player.name || 'Unknown'}
            </span>
            {isSubscribed && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, fontSize: 9, color: '#fff' }}><IoCheckmark size={9} /></span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.text, fontFamily: "'Space Mono'" }}>{rank}</span>
            {player.area && (
              <span style={{ fontSize: 11, color: theme.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                <FaLocationDot size={9} />{player.area}
              </span>
            )}
          </div>
          {/* Stats — key stats for the active position stay full-strength, others dim */}
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {STATS.map(s => {
              const isKey = keyStats.includes(s.key);
              return (
                <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 9, color: isKey ? theme.text : theme.muted, fontFamily: "'Space Mono'", fontWeight: isKey ? 700 : 400 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: isKey ? theme.text : theme.muted, fontFamily: "'Space Mono'" }}>
                    {player[s.key] || 30}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* OVR */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: theme.text, lineHeight: 1, letterSpacing: 1 }}>
            {player.overall || 30}
          </div>
          <div style={{ fontSize: 9, color: theme.muted, fontFamily: "'Space Mono'", letterSpacing: 1 }}>OVR</div>
          {player.games_played > 0 && (
            <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{player.games_played} games</div>
          )}
        </div>
      </div>
    );
  };

  const renderPagination = (totalCount) => {
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            background: 'var(--card)', color: page === 1 ? 'var(--muted)' : 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.5 : 1,
          }}
        >← Prev</button>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'Space Mono'" }}>
          Page {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          style={{
            background: 'var(--card)', color: page === totalPages ? 'var(--muted)' : 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.5 : 1,
          }}
        >Next →</button>
      </div>
    );
  };

  const renderGlobalList = () => {
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pageItems.map((player, idx) => renderPlayerRow(player, start + idx + 1))}
        </div>
        {renderPagination(filtered.length)}
      </>
    );
  };

  const renderTierList = () => {
    const tierPlayers = filtered.filter(p => getRankTier(getRank(p.overall)) === activeTier);
    const color = TIER_COLORS[activeTier];

    return (
      <div>
        {/* Tier tab row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {TIER_ORDER.map(tier => {
            const isActive = activeTier === tier;
            const tc = TIER_COLORS[tier];
            return (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                style={{
                  flex: 1,
                  background: isActive ? `${tc}18` : 'var(--card)',
                  color: isActive ? tc : 'var(--muted)',
                  border: `1.5px solid ${isActive ? tc : 'var(--border)'}`,
                  borderRadius: 10, padding: '8px 0',
                  fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 2,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {TIER_DISPLAY[tier]}
              </button>
            );
          })}
        </div>

        {tierPlayers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
            No {TIER_DISPLAY[activeTier]} players for this filter.
          </div>
        ) : (() => {
          const start = (page - 1) * PAGE_SIZE;
          const pageItems = tierPlayers.slice(start, start + PAGE_SIZE);
          return (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pageItems.map((player, idx) => renderPlayerRow(player, start + idx + 1))}
              </div>
              {renderPagination(tierPlayers.length)}
            </>
          );
        })()}
      </div>
    );
  };

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

        {/* Area filter — dropdown */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <select
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
            style={{
              width: '100%', appearance: 'none', colorScheme: 'dark',
              background: 'var(--card)',
              border: `1.5px solid ${areaFilter !== 'All Areas' ? 'var(--accent)' : 'var(--border)'}`,
              color: areaFilter !== 'All Areas' ? 'var(--accent)' : 'var(--text)',
              borderRadius: 10, padding: '10px 36px 10px 14px',
              fontSize: 13, fontFamily: "'DM Sans'", fontWeight: 600,
              cursor: 'pointer', outline: 'none',
            }}
          >
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)', fontSize: 12 }}>▾</div>
        </div>

        {/* Position filter — compact tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {POSITION_TABS.map(({ value, label }) => {
            const isActive = posFilter === value;
            return (
              <button
                key={value}
                onClick={() => setPosFilter(value)}
                style={{
                  flex: 1,
                  background: isActive ? 'rgba(240,157,81,0.15)' : 'var(--card)',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '8px 0',
                  fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 2,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[['global', 'Global Rank'], ['tier', 'Tier']].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                background: viewMode === mode ? 'var(--accent)' : 'var(--card)',
                color: viewMode === mode ? '#111' : 'var(--muted)',
                border: `1px solid ${viewMode === mode ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, padding: '7px 16px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans'", transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <IconLoading size={48} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
            No players found for this filter.
          </div>
        ) : viewMode === 'tier' ? renderTierList() : renderGlobalList()}

        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--muted)', fontFamily: "'Space Mono'" }}>
            {filtered.length} player{filtered.length !== 1 ? 's' : ''} ranked
          </div>
        )}
      </div>
    </div>
  );
}
