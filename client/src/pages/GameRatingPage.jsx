import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getRank, MAX_POINTS } from '../lib/rankUtils';

const CARD_STATS = [
  { key: 'goals',              label: 'SHO', color: '#f87171' },
  { key: 'assists',            label: 'PAS', color: '#4ade80' },
  { key: 'successful_dribble', label: 'DRI', color: '#F09D51' },
  { key: 'good_defending',     label: 'DEF', color: '#a78bfa' },
  { key: 'good_keeping',       label: 'PHY', color: '#34d399' },
  { key: 'good_chance',        label: 'PAC', color: '#64a0ff' },
];

const defaultStats = () => ({
  goals: 0, assists: 0, good_defending: 0,
  good_keeping: 0, successful_dribble: 0,
  good_chance: 0, good_manner: 0, admin_bonus: 0,
});

function calcTotal(stats) {
  return 5
    + (stats.goals || 0) * 3
    + (stats.assists || 0) * 2
    + (stats.good_defending || 0) * 2
    + (stats.good_keeping || 0) * 2
    + (stats.successful_dribble || 0) * 2
    + (stats.good_chance || 0) * 2
    + (stats.good_manner || 0) * 2
    + (stats.admin_bonus || 0);
}

// Base 3-team rotation (1 round)
const BASE_ROTATION = [
  { home: 'A', away: 'B', rest: 'C' },
  { home: 'B', away: 'C', rest: 'A' },
  { home: 'A', away: 'C', rest: 'B' },
];

// Duration options
const DURATION_OPTIONS = [
  { label: '1 Hour',     value: 60  },
  { label: '1.5 Hours',  value: 90  },
  { label: '2 Hours',    value: 120 },
];

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const TEAM_COLORS = {
  A: { bg: 'rgba(240,157,81,0.15)', border: 'rgba(240,157,81,0.4)', text: '#F09D51' },
  B: { bg: 'rgba(100,160,255,0.15)', border: 'rgba(100,160,255,0.4)', text: '#64a0ff' },
  C: { bg: 'rgba(100,220,130,0.15)', border: 'rgba(100,220,130,0.4)', text: '#64dc82' },
};

// ── PREVIEW / DEV MODE ────────────────────────────────────────────────────────
// Visit /game/any-id/rate?preview=1 to see the full UI with mock data.
// Submit is disabled in preview mode — no DB writes happen.
const MOCK_GAME = {
  id: 'preview', title: 'Preview Game', format: '5v5', time: '20:00',
  fields: { name: 'Futsal Arena KL' }, created_by: 'preview-admin',
};
const MOCK_PLAYER_IDS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'];
const MOCK_PROFILES = {
  p1:  { id:'p1',  name:'Amir Hazif',   avatar_url: null, total_points: 320, games_played: 14 },
  p2:  { id:'p2',  name:'Hafiz Noor',   avatar_url: null, total_points: 210, games_played: 9  },
  p3:  { id:'p3',  name:'Razif Shah',   avatar_url: null, total_points: 180, games_played: 8  },
  p4:  { id:'p4',  name:'Danial Amin',  avatar_url: null, total_points: 440, games_played: 21 },
  p5:  { id:'p5',  name:'Syafiq Rizal', avatar_url: null, total_points: 90,  games_played: 4  },
  p6:  { id:'p6',  name:'Irfan Zaki',   avatar_url: null, total_points: 275, games_played: 12 },
  p7:  { id:'p7',  name:'Faiz Luqman',  avatar_url: null, total_points: 130, games_played: 6  },
  p8:  { id:'p8',  name:'Haris Fikri',  avatar_url: null, total_points: 360, games_played: 16 },
  p9:  { id:'p9',  name:'Izzat Kamil',  avatar_url: null, total_points: 55,  games_played: 2  },
  p10: { id:'p10', name:'Zulhilmi',     avatar_url: null, total_points: 490, games_played: 24 },
};
// ──────────────────────────────────────────────────────────────────────────────

export default function GameRatingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [notOwner, setNotOwner] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Step: 'config' | 'setup' | 'schedule' | 'rating'
  const [step, setStep] = useState('config');
  const [currentMatch, setCurrentMatch] = useState(0);

  // NEW: duration (minutes) and team mode (2 or 3), auto-suggested after load
  const [duration, setDuration] = useState(120);
  const [teamMode, setTeamMode] = useState(null);

  // Team assignments: { userId: 'A' | 'B' | 'C' }
  const [teamAssign, setTeamAssign] = useState({});
  // Ratings: { userId: { goals, assists, ... } }
  const [ratings, setRatings] = useState({});

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);

    if (isPreview) {
      setGame(MOCK_GAME);
      setProfiles(MOCK_PROFILES);
      setPlayers(MOCK_PLAYER_IDS);
      const initRatings = {};
      MOCK_PLAYER_IDS.forEach(uid => { initRatings[uid] = defaultStats(); });
      setRatings(initRatings);
      setTeamMode(3); // 10 players → 3 teams suggested
      setLoading(false);
      return;
    }

    const { data: gameData } = await supabase
      .from('games').select('*, fields(name)').eq('id', id).single();
    setGame(gameData);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (gameData?.created_by && gameData.created_by !== currentUser?.id) {
      setNotOwner(true); setLoading(false); return;
    }

    const { data: playerData } = await supabase
      .from('game_players').select('user_id').eq('game_id', id);

    if (!playerData || playerData.length === 0) { setLoading(false); return; }

    const userIds = playerData.map(p => p.user_id);
    const { data: profileData } = await supabase
      .from('profiles').select('id, name, avatar_url, total_points, games_played').in('id', userIds);

    const profileMap = {};
    profileData?.forEach(p => { profileMap[p.id] = p; });
    setProfiles(profileMap);
    setPlayers(userIds);

    // Init ratings
    const initRatings = {};
    userIds.forEach(uid => { initRatings[uid] = defaultStats(); });
    setRatings(initRatings);

    // Auto-suggest team mode: if players fit within 2 teams → suggest 2, else 3
    const formatNum = parseInt(gameData?.format) || 5;
    setTeamMode(userIds.length <= formatNum * 2 ? 2 : 3);

    // Check already rated
    const { data: existing } = await supabase
      .from('game_ratings').select('user_id').eq('game_id', id).limit(1);
    if (existing && existing.length > 0) setAlreadyRated(true);

    setLoading(false);
  };

  // Active teams based on mode
  const activeTeams = teamMode === 2 ? ['A', 'B'] : ['A', 'B', 'C'];

  // Get team members
  const teamPlayers = (team) =>
    players.filter(uid => teamAssign[uid] === team);

  const allAssigned = () =>
    players.length > 0 && players.every(uid => teamAssign[uid]);

  const assignPlayer = (uid, team) => {
    setTeamAssign(prev => {
      const next = { ...prev };
      if (next[uid] === team) delete next[uid];
      else next[uid] = team;
      return next;
    });
  };

  const getBibNumber = (uid, team) => {
    const members = teamPlayers(team);
    const idx = members.indexOf(uid);
    return idx + 1;
  };

  // Build schedule based on teamMode and duration
  const buildSchedule = () => {
    if (teamMode === 2) {
      // 2-team: A vs B, 15 min matches, 7 min breaks
      const matchMin = 15;
      const breakMin = 7;
      const numMatches = Math.floor((duration + breakMin) / (matchMin + breakMin));
      return Array.from({ length: numMatches }, (_, i) => ({
        home: 'A',
        away: 'B',
        rest: null,
        time: game?.time ? addMinutes(game.time, i * (matchMin + breakMin)) : '',
        index: i,
      }));
    } else {
      // 3-team rotation — match length and rotations scale with duration
      let matchMin, numRotations;
      if (duration === 60)       { matchMin = 20; numRotations = 1; }
      else if (duration === 90)  { matchMin = 15; numRotations = 2; }
      else                       { matchMin = 13; numRotations = 3; }

      const allMatches = [];
      for (let r = 0; r < numRotations; r++) {
        BASE_ROTATION.forEach(m => allMatches.push(m));
      }
      return allMatches.map((m, i) => ({
        ...m,
        time: game?.time ? addMinutes(game.time, i * matchMin) : '',
        index: i,
      }));
    }
  };

  // Human-readable schedule summary
  const getScheduleInfo = () => {
    if (teamMode === 2) {
      const matchMin = 15;
      const breakMin = 7;
      const numMatches = Math.floor((duration + breakMin) / (matchMin + breakMin));
      const totalMins = numMatches * matchMin + Math.max(0, numMatches - 1) * breakMin;
      return `15 min per match · 7 min breaks · ${numMatches} matches · ~${totalMins} min total`;
    } else {
      let matchMin, numMatches;
      if (duration === 60)      { matchMin = 20; numMatches = 3; }
      else if (duration === 90) { matchMin = 15; numMatches = 6; }
      else                      { matchMin = 13; numMatches = 9; }
      return `${matchMin} min per match · ${numMatches} matches · ~${duration} min total`;
    }
  };

  const updateStat = (uid, key, delta) => {
    setRatings(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [key]: Math.max(0, (prev[uid][key] || 0) + delta) }
    }));
  };

  const updateBonus = (uid, val) => {
    const clamped = Math.max(-5, Math.min(5, parseInt(val) || 0));
    setRatings(prev => ({ ...prev, [uid]: { ...prev[uid], admin_bonus: clamped } }));
  };

  const handleSubmit = async () => {
  if (isPreview) { setSuccess('Preview mode — no data written.'); return; }
  setSaving(true); setError('');
  try {
    for (const uid of players) {
      const stats = ratings[uid] || defaultStats();
      const total = calcTotal(stats);

      const { error: insertError } = await supabase.from('game_ratings').insert({
        game_id: id,
        user_id: uid,
        rated_by: (await supabase.auth.getUser()).data.user.id,
        goals: stats.goals,
        assists: stats.assists,
        good_defending: stats.good_defending,
        good_keeping: stats.good_keeping,
        successful_dribble: stats.successful_dribble,
        good_chance: stats.good_chance,
        good_manner: stats.good_manner,
        admin_bonus: stats.admin_bonus,
        total_points: total,
      });
      if (insertError) throw new Error('Rating insert failed: ' + insertError.message);

      const profile = profiles[uid];
      const newPoints = Math.min(MAX_POINTS, (profile?.total_points || 0) + total);
      const newGamesPlayed = (profile?.games_played || 0) + 1;

      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          total_points: newPoints,
          games_played: newGamesPlayed,
        })
        .eq('id', uid)
        .select();

      if (updateError) {
        console.error('Profile update failed for', uid, updateError);
        throw new Error('Profile update failed: ' + updateError.message);
      }
      if (!updateData || updateData.length === 0) {
        console.error('Profile update matched no rows for', uid);
        throw new Error('Profile update matched no rows for ' + uid);
      }
    }
    setSuccess('Ratings submitted!');
    setAlreadyRated(true);
    setStep('setup');
  } catch (e) {
    setError(e.message);
  }
  setSaving(false);
};
  // ── STYLES ──
  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 12 };

  if (loading) return (
    <div style={{ minHeight: '100vh' }}><Navbar />
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div><p>Loading...</p>
      </div>
    </div>
  );

  if (notOwner) return (
    <div style={{ minHeight: '100vh' }}><Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate('/manager')} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 24 }}>← Back</button>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>You can only rate players for games you created.</p>
        </div>
      </div>
    </div>
  );

  const schedule = buildSchedule();
  const match = schedule[currentMatch] || schedule[0];
  const homePlayers = teamPlayers(match?.home);
  const awayPlayers = teamPlayers(match?.away);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <button onClick={() => navigate(`/game/${id}`)} style={{
          background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 24
        }}>← Back to Game</button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
            RATE PLAYERS
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{game?.title} · {game?.fields?.name} · {game?.format}</p>
        </div>

        {/* Preview mode banner */}
        {isPreview && (
          <div style={{
            background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.35)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
            color: '#64a0ff', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            🛠️ Preview mode — mock data, no DB writes
          </div>
        )}

        {/* Banners */}
        {alreadyRated && !success && (
          <div style={{ background: 'rgba(240,157,81,0.1)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            ✅ This game has already been rated.
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(240,157,81,0.1)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
            ❌ {error}
          </div>
        )}

        {/* Step indicator — now 4 steps */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { key: 'config',   label: '1. Setup'        },
            { key: 'setup',    label: '2. Assign Teams'  },
            { key: 'schedule', label: '3. Schedule'      },
            { key: 'rating',   label: '4. Rate Players'  },
          ].map(s => (
            <div key={s.key} style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: step === s.key ? 'var(--accent)' : 'var(--card)',
              color: step === s.key ? '#fff' : 'var(--muted)',
              border: `1px solid ${step === s.key ? 'var(--accent)' : 'var(--border)'}`,
            }}>{s.label}</div>
          ))}
        </div>

        {/* ── STEP 0: CONFIG ── */}
        {step === 'config' && (
          <div>
            {/* Duration picker */}
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>SESSION DURATION</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>How long is this game session?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {DURATION_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setDuration(opt.value)} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                    background: duration === opt.value ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: duration === opt.value ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${duration === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Team mode */}
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>TEAM FORMAT</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
                {players.length} player{players.length !== 1 ? 's' : ''} joined · {game?.format} format
              </p>
              {teamMode !== null && (
                <div style={{
                  display: 'inline-block', marginBottom: 16,
                  background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.3)',
                  borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#64a0ff', fontWeight: 600
                }}>
                  💡 {teamMode} teams suggested based on player count
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                {[2, 3].map(n => (
                  <button key={n} type="button" onClick={() => setTeamMode(n)} style={{
                    flex: 1, padding: '16px 8px', borderRadius: 10, fontWeight: 700,
                    background: teamMode === n ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: teamMode === n ? 'var(--accent)' : 'var(--muted)',
                    border: `2px solid ${teamMode === n ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1 }}>{n} TEAMS</div>
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                      {n === 2 ? 'A vs B · rotates all session' : 'A, B, C · round-robin rotation'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule preview */}
            {teamMode !== null && (
              <div style={{
                background: 'var(--card2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                fontSize: 13, color: 'var(--muted)'
              }}>
                📅 <strong style={{ color: 'var(--text)' }}>Preview:</strong> {getScheduleInfo()}
              </div>
            )}

            <button type="button" onClick={() => setStep('setup')} disabled={!teamMode} style={{
              width: '100%', padding: '13px',
              background: teamMode ? 'var(--accent)' : 'var(--card2)',
              color: teamMode ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
              opacity: teamMode ? 1 : 0.5, cursor: teamMode ? 'pointer' : 'default',
            }}>
              Assign Teams →
            </button>
          </div>
        )}

        {/* ── STEP 1: TEAM SETUP ── */}
        {step === 'setup' && (
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Click a player to assign them to a team. Click their team badge to unassign.
            </p>

            {/* Unassigned players */}
            {players.some(uid => !teamAssign[uid]) && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>UNASSIGNED PLAYERS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {players.filter(uid => !teamAssign[uid]).map(uid => {
                    const p = profiles[uid];
                    return (
                      <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0
                        }}>
                          {p?.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p?.name?.[0] || '?').toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{p?.name}</span>
                        {/* Only show active teams (A+B or A+B+C) */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {activeTeams.map(team => (
                            <button key={team} type="button" onClick={() => assignPlayer(uid, team)} style={{
                              width: 26, height: 26, borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: TEAM_COLORS[team].bg, color: TEAM_COLORS[team].text,
                              border: `1px solid ${TEAM_COLORS[team].border}`, cursor: 'pointer'
                            }}>{team}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team columns — grid adapts to 2 or 3 teams */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeTeams.length}, 1fr)`, gap: 12, marginBottom: 24 }}>
              {activeTeams.map(team => {
                const tc = TEAM_COLORS[team];
                const members = teamPlayers(team);
                return (
                  <div key={team} style={{
                    background: tc.bg, border: `1px solid ${tc.border}`,
                    borderRadius: 14, padding: 14, minHeight: 160
                  }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: tc.text, marginBottom: 12 }}>
                      TEAM {team}
                      <span style={{ fontSize: 12, fontFamily: 'DM Sans', marginLeft: 8, opacity: 0.7 }}>{members.length} players</span>
                    </div>
                    {members.length === 0 && (
                      <div style={{ color: tc.text, opacity: 0.4, fontSize: 12, textAlign: 'center', paddingTop: 20 }}>Drop players here</div>
                    )}
                    {members.map((uid, idx) => {
                      const p = profiles[uid];
                      return (
                        <div key={uid} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 8px', borderRadius: 8, marginBottom: 6,
                          background: 'rgba(0,0,0,0.15)'
                        }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: tc.text,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: '#1e2123', flexShrink: 0
                          }}>{idx + 1}</div>
                          <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name}</div>
                          <button type="button" onClick={() => assignPlayer(uid, team)} style={{
                            background: 'rgba(240,101,67,0.2)', color: 'var(--red)',
                            border: 'none', borderRadius: 4, fontSize: 10, padding: '2px 6px', cursor: 'pointer'
                          }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('config')} style={{
                flex: 1, padding: '13px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>← Back</button>
              <button type="button" onClick={() => setStep('schedule')} disabled={!allAssigned()}
                style={{
                  flex: 2, padding: '13px', background: allAssigned() ? 'var(--accent)' : 'var(--card2)',
                  color: allAssigned() ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: 15, opacity: allAssigned() ? 1 : 0.5,
                  cursor: allAssigned() ? 'pointer' : 'default',
                }}>
                {allAssigned() ? 'View Schedule →' : `Assign all players first (${players.filter(u => !teamAssign[u]).length} remaining)`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: SCHEDULE ── */}
        {step === 'schedule' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>
                MATCH SCHEDULE · {game?.time ? formatTime(game.time) : ''} START
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{getScheduleInfo()}</div>

              {schedule.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                  background: 'var(--card2)', border: '1px solid var(--border)'
                }}>
                  <div style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)', minWidth: 60 }}>
                    {s.time ? formatTime(s.time) : `Match ${i + 1}`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{
                      background: TEAM_COLORS[s.home].bg, color: TEAM_COLORS[s.home].text,
                      border: `1px solid ${TEAM_COLORS[s.home].border}`,
                      borderRadius: 6, padding: '3px 12px', fontWeight: 700, fontSize: 13
                    }}>Team {s.home}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>vs</span>
                    <span style={{
                      background: TEAM_COLORS[s.away].bg, color: TEAM_COLORS[s.away].text,
                      border: `1px solid ${TEAM_COLORS[s.away].border}`,
                      borderRadius: 6, padding: '3px 12px', fontWeight: 700, fontSize: 13
                    }}>Team {s.away}</span>
                  </div>
                  {/* 3-team: show rest badge */}
                  {s.rest && (
                    <div style={{
                      background: 'rgba(136,136,128,0.1)', color: 'var(--muted)',
                      border: '1px solid var(--border)', borderRadius: 6,
                      padding: '3px 10px', fontSize: 11, fontWeight: 600
                    }}>💤 Team {s.rest} rests</div>
                  )}
                  {/* 2-team: show break badge (except last match) */}
                  {!s.rest && i < schedule.length - 1 && (
                    <div style={{
                      background: 'rgba(100,160,255,0.08)', color: '#64a0ff',
                      border: '1px solid rgba(100,160,255,0.2)', borderRadius: 6,
                      padding: '3px 10px', fontSize: 11, fontWeight: 600
                    }}>☕ 7 min break</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('setup')} style={{
                flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>← Edit Teams</button>
              <button type="button" onClick={() => { setCurrentMatch(0); setStep('rating'); }} style={{
                flex: 2, padding: '12px', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>Start Rating →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: RATING ── */}
        {step === 'rating' && (
          <div>
            {/* Match selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              {schedule.map((s, i) => (
                <button key={i} type="button" onClick={() => setCurrentMatch(i)} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: currentMatch === i ? 'var(--accent)' : 'var(--card)',
                  color: currentMatch === i ? '#fff' : 'var(--muted)',
                  border: `1px solid ${currentMatch === i ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}>M{i + 1}</button>
              ))}
            </div>

            {/* Current match header */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: TEAM_COLORS[match.home].bg, color: TEAM_COLORS[match.home].text, border: `1px solid ${TEAM_COLORS[match.home].border}`, borderRadius: 8, padding: '4px 16px', fontWeight: 700, fontSize: 15 }}>Team {match.home}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>vs</span>
                <span style={{ background: TEAM_COLORS[match.away].bg, color: TEAM_COLORS[match.away].text, border: `1px solid ${TEAM_COLORS[match.away].border}`, borderRadius: 8, padding: '4px 16px', fontWeight: 700, fontSize: 15 }}>Team {match.away}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Only show rest badge for 3-team games */}
                {match.rest && (
                  <div style={{ background: 'rgba(136,136,128,0.1)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>💤 Team {match.rest} rests</div>
                )}
                {match.time && <div style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)' }}>{formatTime(match.time)}</div>}
              </div>
            </div>

            {/* Two team columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[{ team: match.home, players: homePlayers }, { team: match.away, players: awayPlayers }].map(({ team, players: teamUids }) => {
                const tc = TEAM_COLORS[team];
                return (
                  <div key={team}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: tc.text, marginBottom: 10 }}>TEAM {team}</div>
                    {teamUids.map((uid) => {
                      const p = profiles[uid];
                      const stats = ratings[uid] || defaultStats();
                      const bib = getBibNumber(uid, team);
                      const total = calcTotal(stats);
                      return (
                        <div key={uid} style={{
                          background: 'var(--card)', border: `1px solid ${tc.border}`,
                          borderRadius: 12, padding: 12, marginBottom: 10
                        }}>
                          {/* Player info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: tc.text,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: '#1e2123', flexShrink: 0
                            }}>{bib}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p?.name}</div>
                            </div>
                            <div style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: total >= 10 ? 'var(--accent)' : 'var(--red)' }}>
                              {total >= 0 ? '+' : ''}{total}
                            </div>
                          </div>

                          {/* 6 card stat buttons — 3×2 grid */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                              {CARD_STATS.map(({ key, label, color }) => {
                                const count = stats[key] || 0;
                                return (
                                  <div key={key} style={{ position: 'relative' }}>
                                    <button type="button" onClick={() => updateStat(uid, key, 1)} style={{
                                      width: '100%', padding: '7px 0', borderRadius: 8, cursor: 'pointer',
                                      border: `1.5px solid ${count > 0 ? color : 'var(--border)'}`,
                                      background: count > 0 ? `${color}18` : 'var(--card2)',
                                      textAlign: 'center', transition: 'all 0.12s',
                                    }}>
                                      <div style={{ fontFamily: "'Space Mono'", fontSize: 8, fontWeight: 700, color: count > 0 ? color : 'var(--muted)', letterSpacing: 1 }}>{label}</div>
                                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, lineHeight: 1.1, color: count > 0 ? color : 'var(--muted)', marginTop: 1 }}>{count}</div>
                                    </button>
                                    {count > 0 && (
                                      <button type="button" onClick={e => { e.stopPropagation(); updateStat(uid, key, -1); }} style={{
                                        position: 'absolute', top: -4, right: -4,
                                        width: 14, height: 14, borderRadius: '50%',
                                        background: 'rgba(240,101,67,0.9)', color: '#fff',
                                        border: 'none', fontSize: 9, lineHeight: 1,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      }}>−</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Bonus */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                              <span style={{ fontSize: 11, color: 'var(--muted)', width: 56, flexShrink: 0 }}>🎖️ Bonus</span>
                              <button type="button" onClick={() => updateBonus(uid, (stats.admin_bonus || 0) - 1)} disabled={(stats.admin_bonus || 0) <= -5}
                                style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontSize: 13, opacity: (stats.admin_bonus || 0) > -5 ? 1 : 0.3 }}>−</button>
                              <span style={{ fontFamily: "'Space Mono'", fontSize: 12, fontWeight: 700, color: (stats.admin_bonus || 0) >= 0 ? 'var(--accent)' : 'var(--red)', minWidth: 24, textAlign: 'center' }}>
                                {(stats.admin_bonus || 0) >= 0 ? '+' : ''}{stats.admin_bonus || 0}
                              </span>
                              <button type="button" onClick={() => updateBonus(uid, (stats.admin_bonus || 0) + 1)} disabled={(stats.admin_bonus || 0) >= 5}
                                style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontSize: 13, opacity: (stats.admin_bonus || 0) < 5 ? 1 : 0.3 }}>+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button type="button" onClick={() => setCurrentMatch(m => Math.max(0, m - 1))} disabled={currentMatch === 0}
                style={{ flex: 1, padding: '11px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, opacity: currentMatch === 0 ? 0.4 : 1 }}>
                ← Prev Match
              </button>
              {currentMatch < schedule.length - 1 ? (
                <button type="button" onClick={() => setCurrentMatch(m => m + 1)}
                  style={{ flex: 1, padding: '11px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                  Next Match →
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={saving || alreadyRated}
                  style={{ flex: 1, padding: '11px', background: alreadyRated ? 'var(--card2)' : 'var(--accent)', color: alreadyRated ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Submitting...' : alreadyRated ? 'Already Submitted' : '✅ Submit All Ratings'}
                </button>
              )}
            </div>

            <button type="button" onClick={() => setStep('schedule')} style={{
              width: '100%', padding: '10px', background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, cursor: 'pointer',
            }}>📅 View Schedule</button>
          </div>
        )}

      </div>
    </div>
  );
}
