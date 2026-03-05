import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getRank } from '../lib/rankUtils';

const STAT_FIELDS = [
  { key: 'goals',              label: 'Goal',     points: 3,  emoji: '⚽' },
  { key: 'assists',            label: 'Assist',   points: 2,  emoji: '🎯' },
  { key: 'good_defending',     label: 'Defend',   points: 2,  emoji: '🛡️' },
  { key: 'good_keeping',       label: 'Keep',     points: 2,  emoji: '🧤' },
  { key: 'successful_dribble', label: 'Dribble',  points: 2,  emoji: '🪄' },
  { key: 'good_chance',        label: 'Chance',   points: 2,  emoji: '🔥' },
  { key: 'good_manner',        label: 'Manner',   points: 2,  emoji: '🤝' },
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

// Schedule rotation: 9 matches, every team plays every other 3 times
const MATCH_ROTATION = [
  { home: 'A', away: 'B', rest: 'C' },
  { home: 'B', away: 'C', rest: 'A' },
  { home: 'A', away: 'C', rest: 'B' },
  { home: 'A', away: 'B', rest: 'C' },
  { home: 'B', away: 'C', rest: 'A' },
  { home: 'A', away: 'C', rest: 'B' },
  { home: 'A', away: 'B', rest: 'C' },
  { home: 'B', away: 'C', rest: 'A' },
  { home: 'A', away: 'C', rest: 'B' },
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

export default function GameRatingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [notOwner, setNotOwner] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Step: 'setup' | 'schedule' | 'rating'
  const [step, setStep] = useState('setup');
  const [currentMatch, setCurrentMatch] = useState(0);

  // Team assignments: { userId: 'A' | 'B' | 'C' }
  const [teamAssign, setTeamAssign] = useState({});
  // Ratings: { userId: { goals, assists, ... } }
  const [ratings, setRatings] = useState({});

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
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

    // Check already rated
    const { data: existing } = await supabase
      .from('game_ratings').select('user_id').eq('game_id', id).limit(1);
    if (existing && existing.length > 0) setAlreadyRated(true);

    setLoading(false);
  };

  // Parse format to get players per team
  const playersPerTeam = () => {
    if (!game?.format) return 5;
    const n = parseInt(game.format);
    return isNaN(n) ? 5 : n;
  };

  // Get team members sorted by bib
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

  // Build schedule with times
  const buildSchedule = () => {
    if (!game?.time) return MATCH_ROTATION.map((m, i) => ({ ...m, time: '', index: i }));
    return MATCH_ROTATION.map((m, i) => ({
      ...m,
      time: addMinutes(game.time, i * 13),
      index: i,
    }));
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
    setSaving(true); setError('');
    try {
      for (const uid of players) {
        const stats = ratings[uid] || defaultStats();
        const total = calcTotal(stats);
        const { error: insertError } = await supabase.from('game_ratings').insert({
          game_id: id, user_id: uid,
          rated_by: (await supabase.auth.getUser()).data.user.id,
          goals: stats.goals, assists: stats.assists,
          good_defending: stats.good_defending, good_keeping: stats.good_keeping,
          successful_dribble: stats.successful_dribble, good_chance: stats.good_chance,
          good_manner: stats.good_manner, admin_bonus: stats.admin_bonus,
          total_points: total,
        });
        if (insertError) throw new Error(insertError.message);
        const profile = profiles[uid];
        await supabase.from('profiles').update({
          total_points: Math.min(594, (profile?.total_points || 0) + total),
          games_played: (profile?.games_played || 0) + 1,
        }).eq('id', uid);
      }
      setSuccess('Ratings submitted!'); setAlreadyRated(true); setStep('setup');
    } catch (e) { setError(e.message); }
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
  const match = schedule[currentMatch];
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

        {/* Already rated banner */}
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

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[
            { key: 'setup', label: '1. Assign Teams' },
            { key: 'schedule', label: '2. Schedule' },
            { key: 'rating', label: '3. Rate Players' },
          ].map(s => (
            <div key={s.key} style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: step === s.key ? 'var(--accent)' : 'var(--card)',
              color: step === s.key ? '#fff' : 'var(--muted)',
              border: `1px solid ${step === s.key ? 'var(--accent)' : 'var(--border)'}`,
            }}>{s.label}</div>
          ))}
        </div>

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
                        <div style={{ display: 'flex', gap: 4 }}>
                          {['A', 'B', 'C'].map(team => (
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

            {/* Team columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {['A', 'B', 'C'].map(team => {
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

            <button type="button" onClick={() => setStep('schedule')} disabled={!allAssigned()}
              style={{
                width: '100%', padding: '13px', background: allAssigned() ? 'var(--accent)' : 'var(--card2)',
                color: allAssigned() ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15, opacity: allAssigned() ? 1 : 0.5
              }}>
              {allAssigned() ? 'View Schedule →' : `Assign all players first (${players.filter(u => !teamAssign[u]).length} remaining)`}
            </button>
          </div>
        )}

        {/* ── STEP 2: SCHEDULE ── */}
        {step === 'schedule' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>
                MATCH SCHEDULE · {game?.time ? formatTime(game.time) : ''} START
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>13 minutes per match · 9 matches · ~2 hours total</div>

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
                  <div style={{
                    background: 'rgba(136,136,128,0.1)', color: 'var(--muted)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    padding: '3px 10px', fontSize: 11, fontWeight: 600
                  }}>💤 Team {s.rest} rests</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('setup')} style={{
                flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14
              }}>← Edit Teams</button>
              <button type="button" onClick={() => { setCurrentMatch(0); setStep('rating'); }} style={{
                flex: 2, padding: '12px', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14
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
                <div style={{ background: 'rgba(136,136,128,0.1)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>💤 Team {match.rest} rests</div>
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

                          {/* Compact stat buttons */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {STAT_FIELDS.map(({ key, label, points, emoji }) => (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: 'var(--muted)', width: 56, flexShrink: 0 }}>{emoji} {label}</span>
                                <button type="button" onClick={() => updateStat(uid, key, -1)} disabled={!stats[key]}
                                  style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontSize: 13, opacity: stats[key] ? 1 : 0.3, cursor: stats[key] ? 'pointer' : 'default' }}>−</button>
                                <span style={{ fontFamily: "'Space Mono'", fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 16, textAlign: 'center' }}>{stats[key] || 0}</span>
                                <button type="button" onClick={() => updateStat(uid, key, 1)}
                                  style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>+</button>
                                <span style={{ fontSize: 10, color: tc.text, fontFamily: "'Space Mono'", marginLeft: 2 }}>
                                  {stats[key] ? `+${stats[key] * points}` : ''}
                                </span>
                              </div>
                            ))}

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
              border: '1px solid var(--border)', borderRadius: 10, fontSize: 13
            }}>📅 View Schedule</button>
          </div>
        )}

      </div>
    </div>
  );
}
