import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PlayerAvatar from '../components/PlayerAvatar';
import StatChips from '../components/StatChips';
import { getRank, getRankColor } from '../lib/rankUtils';
import { GiSoccerBall, GiTrophy } from 'react-icons/gi';
import { IoClose } from 'react-icons/io5';
import { FaLocationDot } from 'react-icons/fa6';

const POSITION_META = {
  1: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', label: '1ST PLACE', shadowColor: 'rgba(255,215,0,0.45)' },
  2: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.35)', label: '2ND PLACE', shadowColor: 'rgba(192,192,192,0.3)' },
  3: { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.35)', label: '3RD PLACE', shadowColor: 'rgba(205,127,50,0.3)' },
};

const STAT_KEYS = [
  { key: 'goals',              label: 'SHO', weight: 3, color: '#f87171' },
  { key: 'assists',            label: 'PAS', weight: 2, color: '#4ade80' },
  { key: 'successful_dribble', label: 'DRI', weight: 1, color: '#F09D51' },
  { key: 'good_defending',     label: 'DEF', weight: 1, color: '#a78bfa' },
  { key: 'good_keeping',       label: 'PHY', weight: 1, color: '#34d399' },
  { key: 'good_chance',        label: 'PAC', weight: 1, color: '#64a0ff' },
];

const calcAwardPoints = (r) =>
  STAT_KEYS.reduce((sum, { key, weight }) => sum + (r[key] || 0) * weight, 0);


function AwardPopup({ position, profile, points, rating, onClose }) {
  const meta = POSITION_META[position];
  const name = profile?.name || 'Player';
  const rank = getRank(profile?.total_points);
  const rankColor = getRankColor(rank);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--card)',
        border: `1.5px solid ${meta.border}`,
        borderRadius: 24,
        padding: '36px 28px',
        width: '100%',
        maxWidth: 380,
        textAlign: 'center',
        boxShadow: `0 0 60px ${meta.shadowColor}, 0 24px 64px rgba(0,0,0,0.6)`,
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'var(--card2)', border: '1px solid var(--border)',
          borderRadius: 8, width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--muted)',
        }}>
          <IoClose size={16} />
        </button>

        {/* Trophy icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: meta.bg, border: `2px solid ${meta.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 28px ${meta.shadowColor}`,
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            <GiTrophy size={44} color={meta.color} />
          </div>
        </div>

        {/* Position badge */}
        <div style={{
          display: 'inline-block',
          background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 8, padding: '4px 16px',
          fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700,
          color: meta.color, letterSpacing: 2, marginBottom: 12,
        }}>{meta.label}</div>

        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: 4,
          color: 'var(--text)', marginBottom: 6, lineHeight: 1,
        }}>BOLAHH AWARD</div>

        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.8 }}>
          Congratulations, <span style={{ color: meta.color, fontWeight: 700 }}>{name}</span>!<br />
          You are one of the top performers this match.
        </p>

        {/* Player info row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--card2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'left',
        }}>
          <PlayerAvatar profile={profile} size={44} borderColor={meta.color} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: meta.color, marginBottom: 2 }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: rankColor }}>{rank}</span>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 14, color: rankColor }}>{profile?.total_points || 30} OVR</span>
            </div>
          </div>
          {/* Points */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: meta.color, lineHeight: 1 }}>{points}</div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>AWARD PTS</div>
          </div>
        </div>

        {/* Stat breakdown */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono'", fontSize: 10, color: 'var(--muted)', letterSpacing: 1, marginBottom: 8 }}>
            THIS MATCH
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {STAT_KEYS.filter(({ key }) => (rating[key] || 0) > 0).map(({ key, label, color }) => (
              <div key={key} style={{
                background: `${color}15`, border: `1px solid ${color}40`,
                borderRadius: 8, padding: '6px 12px',
                fontFamily: "'Space Mono'", fontSize: 12, color, fontWeight: 700,
              }}>
                {label} +{rating[key]}
              </div>
            ))}
            {STAT_KEYS.every(({ key }) => !(rating[key] || 0)) && (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Attendance only</span>
            )}
          </div>
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '14px',
          background: meta.color, color: '#111213',
          border: 'none', borderRadius: 12,
          fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 3,
          fontWeight: 700, cursor: 'pointer',
        }}>
          VIEW FULL SUMMARY
        </button>
      </div>
    </div>
  );
}

export default function GameSummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [sortedRatings, setSortedRatings] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [notRated, setNotRated] = useState(false);
  const [notJoined, setNotJoined] = useState(false);
  const [showAwardPopup, setShowAwardPopup] = useState(false);
  const [myPosition, setMyPosition] = useState(null);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);

    const { data: gameData } = await supabase
      .from('games').select('*, fields(name)').eq('id', id).single();
    if (!gameData) { navigate('/home'); return; }
    setGame(gameData);

    // Allow game creator even if not in game_players
    const { data: playerEntry } = await supabase
      .from('game_players').select('id')
      .eq('game_id', id).eq('user_id', user.id).maybeSingle();
    const canView = !!playerEntry || gameData.created_by === user.id;
    if (!canView) { setNotJoined(true); setLoading(false); return; }

    const { data: ratingsData } = await supabase
      .from('game_ratings')
      .select('user_id, goals, assists, good_defending, good_keeping, successful_dribble, good_chance, admin_bonus')
      .eq('game_id', id);

    if (!ratingsData || ratingsData.length === 0) {
      setNotRated(true); setLoading(false); return;
    }

    const userIds = [...new Set(ratingsData.map(r => r.user_id))];
    const { data: profileData } = await supabase
      .from('profiles').select('id, name, avatar_url, total_points, position')
      .in('id', userIds);
    const profileMap = {};
    profileData?.forEach(p => { profileMap[p.id] = p; });
    setProfiles(profileMap);

    // Aggregate per user in case of multiple entries
    const agg = {};
    ratingsData.forEach(r => {
      if (!agg[r.user_id]) {
        agg[r.user_id] = {
          user_id: r.user_id, goals: 0, assists: 0,
          good_defending: 0, good_keeping: 0,
          successful_dribble: 0, good_chance: 0, admin_bonus: 0,
        };
      }
      STAT_KEYS.forEach(({ key }) => { agg[r.user_id][key] += r[key] || 0; });
      if ((r.admin_bonus || 0) > 0) agg[r.user_id].admin_bonus = r.admin_bonus;
    });

    // Use manager's MOTM picks if any were set, otherwise auto-rank by points
    const hasOfficialMotm = Object.values(agg).some(r => r.admin_bonus > 0);
    let sorted;
    if (hasOfficialMotm) {
      const motmOrder = Object.values(agg).filter(r => r.admin_bonus > 0).sort((a, b) => a.admin_bonus - b.admin_bonus);
      const others = Object.values(agg).filter(r => !r.admin_bonus).sort((a, b) => calcAwardPoints(b) - calcAwardPoints(a));
      sorted = [...motmOrder, ...others];
    } else {
      sorted = Object.values(agg).sort((a, b) => calcAwardPoints(b) - calcAwardPoints(a));
    }
    setSortedRatings(sorted);

    const myIdx = sorted.findIndex(r => r.user_id === user.id);
    if (myIdx >= 0 && myIdx < 3) {
      setMyPosition(myIdx + 1);
      setTimeout(() => setShowAwardPopup(true), 700);
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const backBtn = {
    background: 'transparent', color: 'var(--muted)',
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '7px 16px', fontSize: 13, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    marginBottom: 24,
  };

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <GiSoccerBall size={32} color="var(--accent)" />
        </div>
        <p>Loading summary...</p>
      </div>
    </div>
  );

  if (notJoined) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate(`/game/${id}`)} style={backBtn}>← Back to Game</button>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <GiSoccerBall size={48} color="var(--muted)" />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>
            NO ACCESS
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Only players who joined this game can view the match summary.
          </p>
        </div>
      </div>
    </div>
  );

  if (notRated) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate(`/game/${id}`)} style={backBtn}>← Back to Game</button>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <GiTrophy size={48} color="var(--muted)" />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>
            MATCH NOT RATED YET
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8 }}>
            The summary will be available once the manager finishes rating the players.
          </p>
        </div>
      </div>
    </div>
  );

  const top3 = sortedRatings.slice(0, Math.min(3, sortedRatings.length));
  const rest = sortedRatings.slice(3);
  const myRating = sortedRatings.find(r => r.user_id === user.id);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {showAwardPopup && myPosition && myRating && (
        <AwardPopup
          position={myPosition}
          profile={profiles[user.id]}
          points={calcAwardPoints(myRating)}
          rating={myRating}
          onClose={() => setShowAwardPopup(false)}
        />
      )}

      <div className="page-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate(`/game/${id}`)} style={backBtn}>← Back to Game</button>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 38, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
            MATCH SUMMARY
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaLocationDot size={12} />
            {game?.fields?.name} · {game?.format} · {formatDate(game?.date)}
          </p>
        </div>

        {/* ── BOLAHH AWARD SECTION ── */}
        <div style={{ marginBottom: 28 }}>
          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: 12, padding: '12px 16px',
          }}>
            <GiTrophy size={24} color="#FFD700" />
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 3, color: '#FFD700', lineHeight: 1 }}>
                BOLAHH AWARD
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Players with the best manner and great plays
              </div>
            </div>
          </div>

          {/* 1st Place — large card */}
          {top3[0] && (() => {
            const r = top3[0];
            const meta = POSITION_META[1];
            const p = profiles[r.user_id];
            const rank = getRank(p?.total_points);
            const rankColor = getRankColor(rank);
            const pts = calcAwardPoints(r);
            const isMe = r.user_id === user.id;
            return (
              <div className="fade-up" style={{
                background: meta.bg,
                border: `1.5px solid ${meta.border}`,
                borderRadius: 16, padding: '20px',
                marginBottom: 12,
                boxShadow: isMe ? `0 0 28px ${meta.shadowColor}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Trophy badge */}
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: meta.bg, border: `2px solid ${meta.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <GiTrophy size={22} color={meta.color} />
                  </div>

                  <PlayerAvatar profile={p} size={54} borderColor={meta.color} />

                  {/* Name + rank + stats */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: isMe ? meta.color : 'var(--text)' }}>
                        {p?.name || 'Unknown'}
                      </span>
                      {isMe && (
                        <span style={{
                          fontSize: 9, background: meta.bg, color: meta.color,
                          border: `1px solid ${meta.border}`, borderRadius: 4,
                          padding: '1px 6px', fontFamily: "'Space Mono'",
                        }}>YOU</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: rankColor }}>{rank}</span>
                      <span style={{ fontFamily: "'Bebas Neue'", fontSize: 15, color: rankColor }}>{p?.total_points || 30} OVR</span>
                    </div>
                    <StatChips rating={r} />
                  </div>

                  {/* Points + label */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 42, color: meta.color, lineHeight: 1 }}>{pts}</div>
                    <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>PTS</div>
                    <div style={{
                      marginTop: 6, background: meta.bg, border: `1px solid ${meta.border}`,
                      borderRadius: 6, padding: '2px 10px', display: 'inline-block',
                      fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: meta.color,
                    }}>{meta.label}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 2nd & 3rd — side by side */}
          {top3.length >= 2 && (
            <div className="summary-top3-grid" style={{ display: 'grid', gridTemplateColumns: top3.length >= 3 ? '1fr 1fr' : '1fr', gap: 12 }}>
              {top3.slice(1).map((r, i) => {
                const pos = i + 2;
                const meta = POSITION_META[pos];
                const p = profiles[r.user_id];
                const rank = getRank(p?.total_points);
                const rankColor = getRankColor(rank);
                const pts = calcAwardPoints(r);
                const isMe = r.user_id === user.id;
                return (
                  <div key={r.user_id} className="fade-up" style={{
                    background: meta.bg, border: `1.5px solid ${meta.border}`,
                    borderRadius: 14, padding: 16,
                    boxShadow: isMe ? `0 0 18px ${meta.shadowColor}` : 'none',
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <PlayerAvatar profile={p} size={42} borderColor={meta.color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: isMe ? meta.color : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                            {p?.name || 'Unknown'}
                          </span>
                          {isMe && (
                            <span style={{
                              fontSize: 8, background: meta.bg, color: meta.color,
                              border: `1px solid ${meta.border}`, borderRadius: 4,
                              padding: '1px 5px', fontFamily: "'Space Mono'", flexShrink: 0,
                            }}>YOU</span>
                          )}
                        </div>
                        <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: rankColor }}>{rank}</span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: meta.color, lineHeight: 1 }}>{pts}</div>
                        <div style={{ fontFamily: "'Space Mono'", fontSize: 8, color: 'var(--muted)' }}>PTS</div>
                      </div>
                    </div>

                    {/* Stat chips + position badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
                      <StatChips rating={r} size="sm" />
                      <div style={{
                        background: meta.bg, border: `1px solid ${meta.border}`,
                        borderRadius: 5, padding: '2px 8px', flexShrink: 0,
                        fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700, color: meta.color,
                      }}>{meta.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FULL PLAYER STANDINGS ── */}
        {sortedRatings.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 14 }}>
              PLAYER STANDINGS
            </div>

            {sortedRatings.map((r, i) => {
              const pos = i + 1;
              const isTop3 = pos <= 3 && pos <= top3.length;
              const meta = isTop3 ? POSITION_META[pos] : null;
              const p = profiles[r.user_id];
              const rank = getRank(p?.total_points);
              const rankColor = getRankColor(rank);
              const pts = calcAwardPoints(r);
              const isMe = r.user_id === user.id;

              return (
                <div key={r.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: isMe ? (meta ? meta.bg : 'rgba(240,157,81,0.08)') : 'var(--card2)',
                  border: `1px solid ${isMe ? (meta ? meta.border : 'rgba(240,157,81,0.3)') : 'var(--border)'}`,
                  borderRadius: 10,
                  marginBottom: 6,
                }}>
                  {/* Position indicator */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: meta ? meta.bg : 'var(--card)',
                    border: `1.5px solid ${meta ? meta.border : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700,
                    color: meta ? meta.color : 'var(--muted)',
                  }}>
                    {isTop3 ? <GiTrophy size={13} color={meta.color} /> : pos}
                  </div>

                  <PlayerAvatar profile={p} size={36} borderColor={meta ? meta.color : rankColor} />

                  {/* Name + rank */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{
                        fontWeight: 700, fontSize: 13,
                        color: isMe ? (meta ? meta.color : 'var(--accent)') : 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p?.name || 'Unknown'}
                      </span>
                      {isMe && (
                        <span style={{
                          fontSize: 9, background: 'rgba(240,157,81,0.12)', color: 'var(--accent)',
                          border: '1px solid rgba(240,157,81,0.3)', borderRadius: 4,
                          padding: '1px 5px', fontFamily: "'Space Mono'", flexShrink: 0,
                        }}>YOU</span>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: rankColor }}>{rank}</span>
                  </div>

                  {/* Stat chips — hidden on small screens */}
                  <div className="summary-chips-col" style={{ flexShrink: 1, minWidth: 0, maxWidth: 140 }}>
                    <StatChips rating={r} size="sm" />
                  </div>

                  {/* Points */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: meta ? meta.color : 'var(--text)', lineHeight: 1 }}>{pts}</div>
                    <div style={{ fontFamily: "'Space Mono'", fontSize: 8, color: 'var(--muted)' }}>PTS</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nudge for non-top-3 players */}
        {myRating && !myPosition && (
          <div style={{
            background: 'rgba(240,157,81,0.06)', border: '1px solid rgba(240,157,81,0.2)',
            borderRadius: 12, padding: '14px 18px',
            fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 16,
          }}>
            Keep playing and earning stats to climb into the top 3 next time!
          </div>
        )}
        </div>
      </div>
  );
}
