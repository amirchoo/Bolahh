import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PlayerAvatar from '../components/PlayerAvatar';
import StatChips from '../components/StatChips';
import { getRank, getRankColor } from '../lib/rankUtils';
import { GiSoccerBall, GiTrophy, GiRunningShoe } from 'react-icons/gi';
import { IoClose, IoInformationCircleOutline } from 'react-icons/io5';
import { FaArrowTrendUp, FaArrowTrendDown } from 'react-icons/fa6';
import { FaLocationDot } from 'react-icons/fa6';

const POSITION_META = {
  1: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', label: '1ST PLACE', shadowColor: 'rgba(255,215,0,0.45)' },
  2: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.35)', label: '2ND PLACE', shadowColor: 'rgba(192,192,192,0.3)' },
  3: { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.35)', label: '3RD PLACE', shadowColor: 'rgba(205,127,50,0.3)' },
};

const STAT_KEYS = [
  { key: 'shooting_quality',   label: 'SHO', weight: 3, color: '#f87171' },
  { key: 'passing_quality',    label: 'PAS', weight: 2, color: '#4ade80' },
  { key: 'successful_dribble', label: 'DRI', weight: 1, color: '#F09D51' },
  { key: 'good_defending',     label: 'DEF', weight: 1, color: '#a78bfa' },
  { key: 'good_keeping',       label: 'PHY', weight: 1, color: '#34d399' },
  { key: 'good_chance',        label: 'PAC', weight: 1, color: '#64a0ff' },
];

const calcAwardPoints = (r) =>
  STAT_KEYS.reduce((sum, { key, weight }) => sum + (r[key] || 0) * weight, 0);

const MOCK_GAME = { id: 'preview', title: 'Preview Game', format: '5v5', date: '2026-07-04', fields: { name: 'Futsal Arena KL' } };
const MOCK_PROFILES = {
  p1:  { id: 'p1',  name: 'Amir Hazif',   avatar_url: null, total_points: 52, position: 'FW' },
  p2:  { id: 'p2',  name: 'Hafiz Noor',   avatar_url: null, total_points: 44, position: 'MF' },
  p3:  { id: 'p3',  name: 'Razif Shah',   avatar_url: null, total_points: 41, position: 'DF' },
  p4:  { id: 'p4',  name: 'Danial Amin',  avatar_url: null, total_points: 63, position: 'FW' },
  p5:  { id: 'p5',  name: 'Syafiq Rizal', avatar_url: null, total_points: 33, position: 'GK' },
};
const MOCK_RATINGS = [
  { user_id: 'p4', goals: 3, assists: 1, successful_dribble: 2, good_defending: 0, good_keeping: 0, good_chance: 1, admin_bonus: 1 },
  { user_id: 'p1', goals: 2, assists: 2, successful_dribble: 1, good_defending: 0, good_keeping: 0, good_chance: 2, admin_bonus: 2 },
  { user_id: 'p2', goals: 1, assists: 3, successful_dribble: 0, good_defending: 1, good_keeping: 0, good_chance: 1, admin_bonus: 3 },
  { user_id: 'p3', goals: 0, assists: 1, successful_dribble: 0, good_defending: 3, good_keeping: 0, good_chance: 0, admin_bonus: 0 },
  { user_id: 'p5', goals: 0, assists: 0, successful_dribble: 0, good_defending: 0, good_keeping: 4, good_chance: 0, admin_bonus: 0 },
];
const MOCK_GOAL_ASSIST = {
  p4: { goals: 3, assists: 1 },
  p1: { goals: 2, assists: 2 },
  p2: { goals: 1, assists: 3 },
  p3: { goals: 0, assists: 1 },
  p5: { goals: 0, assists: 0 },
};

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
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                {label} ↑
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
  const userId = user?.id;
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const [game, setGame] = useState(null);
  const [sortedRatings, setSortedRatings] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [notRated, setNotRated] = useState(false);
  const [notJoined, setNotJoined] = useState(false);
  const [showAwardPopup, setShowAwardPopup] = useState(false);
  const [myPosition, setMyPosition] = useState(null);
  const [goalAssist, setGoalAssist] = useState({});

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);

    if (isPreview) {
      setGame(MOCK_GAME);
      setProfiles(MOCK_PROFILES);
      setGoalAssist(MOCK_GOAL_ASSIST);
      const sorted = [...MOCK_RATINGS].sort((a, b) => {
        if (a.admin_bonus && b.admin_bonus) return a.admin_bonus - b.admin_bonus;
        if (a.admin_bonus) return -1;
        if (b.admin_bonus) return 1;
        return calcAwardPoints(b) - calcAwardPoints(a);
      });
      setSortedRatings(sorted);
      setLoading(false);
      return;
    }

    const { data: gameData } = await supabase
      .from('games').select('*, fields(name)').eq('id', id).single();
    if (!gameData) { navigate('/home'); return; }
    setGame(gameData);

    // Allow game creator even if not in game_players
    const { data: playerEntry } = await supabase
      .from('game_players').select('id')
      .eq('game_id', id).eq('user_id', userId).maybeSingle();
    const canView = !!playerEntry || gameData.created_by === userId;
    if (!canView) { setNotJoined(true); setLoading(false); return; }

    const { data: ratingsData } = await supabase
      .from('game_ratings')
      .select('user_id, goals, assists, shooting_quality, passing_quality, good_defending, good_keeping, successful_dribble, good_chance, admin_bonus')
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

    const myIdx = sorted.findIndex(r => r.user_id === userId);
    if (myIdx >= 0 && myIdx < 3) {
      setMyPosition(myIdx + 1);
      setTimeout(() => setShowAwardPopup(true), 700);
    }
    const gaMap = {};
    ratingsData.forEach(r => {
      if (!gaMap[r.user_id]) gaMap[r.user_id] = { goals: 0, assists: 0 };
      gaMap[r.user_id].goals += r.goals || 0;
      gaMap[r.user_id].assists += r.assists || 0;
    });
    setGoalAssist(gaMap);

    setLoading(false);
  };

  const GoalAssistBadges = ({ uid }) => {
    const ga = goalAssist[uid];
    if (!ga || (ga.goals === 0 && ga.assists === 0)) return null;
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {ga.goals > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: '#FECA57',
          }}>
            <GiSoccerBall size={15} />{ga.goals}
          </span>
        )}
        {ga.assists > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: '#00D2D3',
          }}>
            <GiRunningShoe size={15} />{ga.assists}
          </span>
        )}
      </div>
    );
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
  const myRating = sortedRatings.find(r => r.user_id === userId);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {showAwardPopup && myPosition && myRating && (
        <AwardPopup
          position={myPosition}
          profile={profiles[userId]}
          points={calcAwardPoints(myRating)}
          rating={myRating}
          onClose={() => setShowAwardPopup(false)}
        />
      )}

      <div className="page-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate(`/game/${id}`)} style={backBtn}>← Back to Game</button>

        {isPreview && (
          <div style={{
            background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.35)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
            color: '#64a0ff', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Preview mode — showing mock data
          </div>
        )}

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

        {/* ── BALLER OF THE MATCH ── */}
        {top3.length > 0 && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 20, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 14 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
                BALLERS OF THE MATCH
              </div>
              <button onClick={() => navigate('/baller-info')} style={{
                position: 'absolute', right: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', padding: 0, display: 'flex', alignItems: 'center',
              }}>
                <IoInformationCircleOutline size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 10 }}>
              {top3.map((r) => {
                const p = profiles[r.user_id];
                const rank = getRank(p?.total_points);
                const rankColor = getRankColor(rank);
                const isMe = r.user_id === userId;
                const hasUp = STAT_KEYS.some(({ key }) => (r[key] || 0) > 0);
                const hasDown = !hasUp && STAT_KEYS.some(({ key }) => (r[key] || 0) < 0);
                return (
                  <div key={r.user_id} className="fade-up" style={{
                    background: 'var(--card2)',
                    border: `1.5px solid ${isMe ? 'rgba(240,157,81,0.5)' : 'var(--border)'}`,
                    borderRadius: 14, padding: '16px 12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, textAlign: 'center',
                    boxShadow: isMe ? '0 0 18px rgba(240,157,81,0.18)' : 'none',
                    position: 'relative',
                  }}>
                    {hasUp && <FaArrowTrendUp size={26} color="#4ade80" style={{ position: 'absolute', top: 10, right: 10 }} />}
                    {hasDown && <FaArrowTrendDown size={26} color="#f87171" style={{ position: 'absolute', top: 10, right: 10 }} />}
                    <PlayerAvatar profile={p} size={48} borderColor={rankColor} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: isMe ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                        {p?.name || 'Unknown'}
                      </div>
                      <div style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: rankColor, marginTop: 2 }}>{rank}</div>
                      {isMe && (
                        <span style={{ fontSize: 8, background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.3)', borderRadius: 4, padding: '1px 5px', fontFamily: "'Space Mono'", marginTop: 4, display: 'inline-block' }}>YOU</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <StatChips rating={r} size="sm" />
                      <GoalAssistBadges uid={r.user_id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FULL PLAYER STANDINGS ── */}
        {sortedRatings.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 14 }}>
              PLAYER STATISTICS
            </div>

            {sortedRatings.map((r) => {
              const p = profiles[r.user_id];
              const rank = getRank(p?.total_points);
              const rankColor = getRankColor(rank);
              const isMe = r.user_id === userId;
              const hasUp = STAT_KEYS.some(({ key }) => (r[key] || 0) > 0);
              const hasDown = !hasUp && STAT_KEYS.some(({ key }) => (r[key] || 0) < 0);

              return (
                <div key={r.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: isMe ? 'rgba(240,157,81,0.08)' : 'var(--card2)',
                  border: `1px solid ${isMe ? 'rgba(240,157,81,0.3)' : 'var(--border)'}`,
                  borderRadius: 10,
                  marginBottom: 6,
                }}>
                  <PlayerAvatar profile={p} size={36} borderColor={rankColor} />

                  {/* Name + rank */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{
                        fontWeight: 700, fontSize: 13,
                        color: isMe ? 'var(--accent)' : 'var(--text)',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: rankColor }}>{rank}</span>
                      <GoalAssistBadges uid={r.user_id} />
                    </div>
                  </div>

                  {/* Stat chips — hidden on small screens */}
                  <div className="summary-chips-col" style={{ flexShrink: 1, minWidth: 0, maxWidth: 140 }}>
                    <StatChips rating={r} size="sm" />
                  </div>

                  {/* Overall trend icon */}
                  <div style={{ flexShrink: 0 }}>
                    {hasUp && <FaArrowTrendUp size={24} color="#4ade80" />}
                    {hasDown && <FaArrowTrendDown size={24} color="#f87171" />}
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
