import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getRank, getRankColor } from '../lib/rankUtils';
import { calcOverall, getCardTheme } from '../components/FifaCard';
import { IoCheckmarkCircle, IoClose, IoCalendar, IoChevronDown } from 'react-icons/io5';
import { GiTrophy } from 'react-icons/gi';
import { LuLightbulb, LuMoon, LuCoffee } from 'react-icons/lu';

const MOTM_META = {
  0: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', label: '1ST' },
  1: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.35)', label: '2ND' },
  2: { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.35)', label: '3RD' },
};

const CARD_STATS = [
  { key: 'shooting_quality', label: 'SHO', color: '#f87171' },
  { key: 'passing_quality', label: 'PAS', color: '#4ade80' },
  { key: 'successful_dribble', label: 'DRI', color: '#F09D51' },
  { key: 'good_defending', label: 'DEF', color: '#a78bfa' },
  { key: 'good_keeping', label: 'PHY', color: '#34d399' },
  { key: 'good_chance', label: 'PAC', color: '#64a0ff' },
];

const defaultStats = () => ({
  shooting_quality: 0,
  passing_quality: 0,
  good_defending: 0,
  good_keeping: 0,
  successful_dribble: 0,
  good_chance: 0,
});

const DURATION_OPTIONS = [
  { label: '1 Hour', value: 60 },
  { label: '1.5 Hours', value: 90 },
  { label: '2 Hours', value: 120 },
];

const BASE_ROTATION = [
  { home: 'A', away: 'B', rest: 'C' },
  { home: 'B', away: 'C', rest: 'A' },
  { home: 'A', away: 'C', rest: 'B' },
];

const TEAM_COLORS = {
  A: { bg: 'rgba(240,157,81,0.15)', border: 'rgba(240,157,81,0.4)', text: '#F09D51' },
  B: { bg: 'rgba(100,160,255,0.15)', border: 'rgba(100,160,255,0.4)', text: '#64a0ff' },
  C: { bg: 'rgba(100,220,130,0.15)', border: 'rgba(100,220,130,0.4)', text: '#64dc82' },
};

const MOCK_PROFILES = {
  p1: { id: 'p1', name: 'Amir Hazif', avatar_url: null, total_points: 52, games_played: 14 },
  p2: { id: 'p2', name: 'Hafiz Noor', avatar_url: null, total_points: 44, games_played: 9 },
  p3: { id: 'p3', name: 'Aiman Rahman', avatar_url: null, total_points: 46, games_played: 11 },
  p4: { id: 'p4', name: 'Arif Danish', avatar_url: null, total_points: 58, games_played: 16 },
  p5: { id: 'p5', name: 'Hakim Farid', avatar_url: null, total_points: 49, games_played: 12 },
  p6: { id: 'p6', name: 'Danial Amin', avatar_url: null, total_points: 63, games_played: 21 },
  p7: { id: 'p7', name: 'Syafiq Rizal', avatar_url: null, total_points: 33, games_played: 4 },
  p8: { id: 'p8', name: 'Nazir Reza', avatar_url: null, total_points: 41, games_played: 8 },
  p9: { id: 'p9', name: 'Nabil Fikri', avatar_url: null, total_points: 57, games_played: 17 },
  p10: { id: 'p10', name: 'Zamri Yusuf', avatar_url: null, total_points: 67, games_played: 25 },
  p11: { id: 'p11', name: 'Irfan Zaki', avatar_url: null, total_points: 48, games_played: 12 },
  p12: { id: 'p12', name: 'Faiz Luqman', avatar_url: null, total_points: 37, games_played: 6 },
  p13: { id: 'p13', name: 'Rafiq Haris', avatar_url: null, total_points: 42, games_played: 10 },
  p14: { id: 'p14', name: 'Harris Azam', avatar_url: null, total_points: 55, games_played: 15 },
  p15: { id: 'p15', name: 'Faris Iqbal', avatar_url: null, total_points: 60, games_played: 18 },
};

const MOCK_BASE_TAPS = {
  p1: { shooting_quality: 22, passing_quality: 14, good_defending: 8, good_keeping: 5, successful_dribble: 17, good_chance: 12 },
  p2: { shooting_quality: 14, passing_quality: 18, good_defending: 6, good_keeping: 3, successful_dribble: 9, good_chance: 10 },
  p3: { shooting_quality: 11, passing_quality: 10, good_defending: 12, good_keeping: 4, successful_dribble: 7, good_chance: 8 },
  p4: { shooting_quality: 33, passing_quality: 22, good_defending: 15, good_keeping: 9, successful_dribble: 24, good_chance: 20 },
  p5: { shooting_quality: 3, passing_quality: 4, good_defending: 2, good_keeping: 1, successful_dribble: 4, good_chance: 3 },
  p6: { shooting_quality: 18, passing_quality: 12, good_defending: 9, good_keeping: 6, successful_dribble: 13, good_chance: 11 },
  p7: { shooting_quality: 7, passing_quality: 9, good_defending: 4, good_keeping: 2, successful_dribble: 6, good_chance: 5 },
  p8: { shooting_quality: 26, passing_quality: 16, good_defending: 11, good_keeping: 7, successful_dribble: 19, good_chance: 14 },
  p9: { shooting_quality: 1, passing_quality: 2, good_defending: 1, good_keeping: 0, successful_dribble: 2, good_chance: 1 },
  p10: { shooting_quality: 41, passing_quality: 28, good_defending: 18, good_keeping: 12, successful_dribble: 31, good_chance: 25 },
  p11: { shooting_quality: 9, passing_quality: 7, good_defending: 5, good_keeping: 3, successful_dribble: 8, good_chance: 6 },
  p12: { shooting_quality: 5, passing_quality: 8, good_defending: 4, good_keeping: 2, successful_dribble: 6, good_chance: 5 },
  p13: { shooting_quality: 10, passing_quality: 9, good_defending: 7, good_keeping: 4, successful_dribble: 9, good_chance: 8 },
  p14: { shooting_quality: 20, passing_quality: 15, good_defending: 12, good_keeping: 6, successful_dribble: 14, good_chance: 13 },
  p15: { shooting_quality: 24, passing_quality: 18, good_defending: 11, good_keeping: 8, successful_dribble: 19, good_chance: 15 },
};

const PLAYER_IDS = Object.keys(MOCK_PROFILES);
const MOCK_TEAM_ASSIGN = {
  p1: 'A', p2: 'A', p3: 'A', p4: 'A', p5: 'A',
  p6: 'B', p7: 'B', p8: 'B', p9: 'B', p10: 'B',
  p11: 'C', p12: 'C', p13: 'C', p14: 'C', p15: 'C',
};

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

function buildSchedule(duration, time = '20:00') {
  if (duration === 60) {
    const matchMin = 15;
    const breakMin = 7;
    const numMatches = Math.floor((duration + breakMin) / (matchMin + breakMin));
    return Array.from({ length: numMatches }, (_, i) => ({
      home: 'A', away: 'B', rest: null,
      time: addMinutes(time, i * (matchMin + breakMin)),
      index: i,
    }));
  }

  if (duration === 90) {
    const matchMin = 15;
    const allMatches = [];
    for (let r = 0; r < 2; r++) {
      BASE_ROTATION.forEach((m) => allMatches.push(m));
    }
    return allMatches.map((m, i) => ({ ...m, time: addMinutes(time, i * matchMin), index: i }));
  }

  const matchMin = 13;
  const allMatches = [];
  for (let r = 0; r < 3; r++) {
    BASE_ROTATION.forEach((m) => allMatches.push(m));
  }
  return allMatches.map((m, i) => ({ ...m, time: addMinutes(time, i * matchMin), index: i }));
}

function getScheduleInfo(duration) {
  if (duration === 60) {
    const matchMin = 15;
    const breakMin = 7;
    const numMatches = Math.floor((duration + breakMin) / (matchMin + breakMin));
    const totalMins = numMatches * matchMin + Math.max(0, numMatches - 1) * breakMin;
    return `15 min per match · 7 min breaks · ${numMatches} matches · ~${totalMins} min total`;
  }

  if (duration === 90) {
    return '15 min per match · 6 matches · ~90 min total';
  }

  return '13 min per match · 9 matches · ~120 min total';
}

function getBibNumber(uid, team, teamPlayers) {
  const members = teamPlayers(team);
  return members.indexOf(uid) + 1;
}

function buildInitialRatings() {
  return Object.fromEntries(PLAYER_IDS.map((uid) => [uid, { ...MOCK_BASE_TAPS[uid], touched: false }]));
}

export default function ManagerWalkthroughPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('config');
  const [duration, setDuration] = useState(90);
  const [teamMode, setTeamMode] = useState(3);
  const [teamAssign, setTeamAssign] = useState({ ...MOCK_TEAM_ASSIGN });
  const [currentMatch, setCurrentMatch] = useState(0);
  const [ratings, setRatings] = useState(buildInitialRatings);
  const [motmPlayers, setMotmPlayers] = useState([]);
  const [expandedUid, setExpandedUid] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);

  const activeTeams = teamMode === 2 ? ['A', 'B'] : ['A', 'B', 'C'];
  const schedule = buildSchedule(duration, '20:00');
  const match = schedule[currentMatch] || schedule[0];
  const homePlayers = PLAYER_IDS.filter((uid) => teamAssign[uid] === match.home);
  const awayPlayers = PLAYER_IDS.filter((uid) => teamAssign[uid] === match.away);
  const teamPlayers = (team) => PLAYER_IDS.filter((uid) => teamAssign[uid] === team);

  const allAssigned = () => PLAYER_IDS.length > 0 && PLAYER_IDS.every((uid) => teamAssign[uid]);

  const assignPlayer = (uid, team) => {
    setTeamAssign((prev) => {
      const next = { ...prev };
      if (next[uid] === team) delete next[uid];
      else next[uid] = team;
      return next;
    });
  };

  const updateStat = (uid, key, delta) => {
    const isRanked = (MOCK_PROFILES[uid]?.games_played || 0) > 0;
    const baseMin = isRanked ? 0 : (MOCK_BASE_TAPS[uid]?.[key] || 0);
    setRatings((prev) => ({
      ...prev,
      [uid]: {
        ...(prev[uid] || defaultStats()),
        [key]: Math.max(baseMin, (prev[uid]?.[key] || 0) + delta),
        touched: true,
      },
    }));
  };

  const toggleMotm = (uid) => {
    setMotmPlayers((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid);
      if (prev.length >= 3) return prev;
      return [...prev, uid];
    });
  };

  const ratedCount = Object.values(ratings).filter((player) => player.touched).length;
  const allPlayersRated = ratedCount === PLAYER_IDS.length;
  const canCompleteTest = allPlayersRated && motmPlayers.length === 3;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
              Manager walkthrough
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 42, letterSpacing: 3, color: 'var(--text)', margin: 0 }}>
              HOW THE MANAGER SYSTEM WORKS
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10, maxWidth: 760 }}>
              This is a guided mock of the actual manager flow in the live app, showing exactly how the setup, team assignment, schedule, rating, and awards steps work.
            </p>
          </div>

          <button onClick={() => navigate('/manager')} style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--muted)', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 14 }}>←</span> Back to Manager</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { key: 'config', label: '1. Setup' },
            { key: 'setup', label: '2. Assign Teams' },
            { key: 'schedule', label: '3. Schedule' },
            { key: 'rating', label: '4. Rate Players' },
            { key: 'motm', label: '5. Awards' },
          ].map((s) => (
            <div key={s.key} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: step === s.key ? 'var(--accent)' : 'var(--card)', color: step === s.key ? '#fff' : 'var(--muted)', border: `1px solid ${step === s.key ? 'var(--accent)' : 'var(--border)'}` }}>
              {s.label}
            </div>
          ))}
        </div>

        {step === 'config' && (
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>SESSION DURATION</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>How long is this game session?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {DURATION_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setDuration(opt.value)} style={{ flex: 1, padding: '12px 8px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: duration === opt.value ? 'rgba(240,157,81,0.15)' : 'var(--card2)', color: duration === opt.value ? 'var(--accent)' : 'var(--muted)', border: `1px solid ${duration === opt.value ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>TEAM FORMAT</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>{PLAYER_IDS.length} players joined · 5v5 format</p>
              <div style={{ background: 'rgba(100,160,255,0.08)', border: '1px solid rgba(100,160,255,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, color: 'var(--text)', fontSize: 13, lineHeight: 1.7 }}>
                <strong style={{ color: '#64a0ff' }}>Before kickoff:</strong> arrive at least 15 minutes early to set up the location, confirm the pitch is clear and unoccupied for the session, and arrange bibs in advance so the game flow stays smooth.
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 16, background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#64a0ff', fontWeight: 600 }}>
                <LuLightbulb size={13} /> {teamMode} teams suggested based on player count
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {[2, 3].map((n) => (
                  <button key={n} type="button" onClick={() => setTeamMode(n)} style={{ flex: 1, padding: '16px 8px', borderRadius: 10, fontWeight: 700, background: teamMode === n ? 'rgba(240,157,81,0.15)' : 'var(--card2)', color: teamMode === n ? 'var(--accent)' : 'var(--muted)', border: `2px solid ${teamMode === n ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer' }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1 }}>{n} TEAMS</div>
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>{n === 2 ? 'A vs B · rotates all session' : 'A, B, C · round-robin rotation'}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoCalendar size={14} /><strong style={{ color: 'var(--text)' }}>Preview:</strong> {getScheduleInfo(duration)}
            </div>

            <button type="button" onClick={() => setStep('setup')} style={{ width: '100%', padding: '13px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Assign Teams →
            </button>
          </div>
        )}

        {step === 'setup' && (
          <div>
            <style>{`@media (max-width: 640px) { .team-assign-grid { grid-template-columns: 1fr !important; } }`}</style>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Click a player to assign them to a team. Click their team badge to unassign. The bib number is the number shown beside each player, and the teams are balanced by overall rank and strength.
            </p>

            {PLAYER_IDS.some((uid) => !teamAssign[uid]) && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>UNASSIGNED PLAYERS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PLAYER_IDS.filter((uid) => !teamAssign[uid]).map((uid) => {
                    const p = MOCK_PROFILES[uid];
                    const rank = getRank(p?.total_points || 0);
                    return (
                      <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                          {p?.name?.[0] || '?'}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{p?.name}</span>
                        <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: getRankColor(rank), background: `${getRankColor(rank)}18`, border: `1px solid ${getRankColor(rank)}40`, borderRadius: 5, padding: '2px 6px' }}>{rank} · {p?.total_points || 30}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {activeTeams.map((team) => (
                            <button key={team} type="button" onClick={() => assignPlayer(uid, team)} style={{ width: 26, height: 26, borderRadius: 6, fontSize: 11, fontWeight: 700, background: TEAM_COLORS[team].bg, color: TEAM_COLORS[team].text, border: `1px solid ${TEAM_COLORS[team].border}`, cursor: 'pointer' }}>{team}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="team-assign-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${activeTeams.length}, 1fr)`, gap: 12, marginBottom: 24 }}>
              {activeTeams.map((team) => {
                const tc = TEAM_COLORS[team];
                const members = teamPlayers(team);
                const avgOvr = members.length > 0 ? Math.round(members.reduce((sum, uid) => sum + (MOCK_PROFILES[uid]?.total_points || 30), 0) / members.length) : null;
                const avgRank = avgOvr !== null ? getRank(avgOvr) : null;
                return (
                  <div key={team} style={{ background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 14, padding: 14, minHeight: 180, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: tc.text, marginBottom: 4 }}>
                      TEAM {team}
                      <span style={{ fontSize: 12, fontFamily: 'DM Sans', marginLeft: 8, opacity: 0.7 }}>{members.length} players</span>
                    </div>
                    {avgRank && <div style={{ fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: tc.text, opacity: 0.85, marginBottom: 12 }}>Avg: {avgRank} · {avgOvr} OVR</div>}
                    {members.length === 0 && <div style={{ color: tc.text, opacity: 0.4, fontSize: 12, textAlign: 'center', paddingTop: 20 }}>Drop players here</div>}
                    {members.map((uid) => {
                      const p = MOCK_PROFILES[uid];
                      const rank = getRank(p?.total_points || 0);
                      const bib = getBibNumber(uid, team, teamPlayers);
                      return (
                        <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, marginBottom: 6, background: 'rgba(0,0,0,0.15)' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: tc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1e2123', flexShrink: 0 }}>{bib}</div>
                          <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name}</div>
                          <span title={rank} style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: getRankColor(rank), background: `${getRankColor(rank)}18`, border: `1px solid ${getRankColor(rank)}40`, borderRadius: 5, padding: '1px 5px', flexShrink: 0 }}>{p?.total_points || 30}</span>
                          <button type="button" onClick={() => assignPlayer(uid, team)} style={{ background: 'rgba(240,101,67,0.2)', color: 'var(--red)', border: 'none', borderRadius: 4, fontSize: 10, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IoClose size={10} /></button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('config')} style={{ flex: 1, padding: '13px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>← Back</button>
              <button type="button" onClick={() => setStep('schedule')} disabled={!allAssigned()} style={{ flex: 2, padding: '13px', background: allAssigned() ? 'var(--accent)' : 'var(--card2)', color: allAssigned() ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, opacity: allAssigned() ? 1 : 0.5, cursor: allAssigned() ? 'pointer' : 'default' }}>
                {allAssigned() ? 'View Schedule →' : `Assign all players first (${PLAYER_IDS.filter((u) => !teamAssign[u]).length} remaining)`}
              </button>
            </div>
          </div>
        )}

        {step === 'schedule' && (
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>MATCH SCHEDULE · {formatTime('20:00')} START</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{getScheduleInfo(duration)}</div>
              {schedule.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 6, background: 'var(--card2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)', minWidth: 60 }}>{s.time ? formatTime(s.time) : `Match ${i + 1}`}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ background: TEAM_COLORS[s.home].bg, color: TEAM_COLORS[s.home].text, border: `1px solid ${TEAM_COLORS[s.home].border}`, borderRadius: 6, padding: '3px 12px', fontWeight: 700, fontSize: 13 }}>Team {s.home}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>vs</span>
                    <span style={{ background: TEAM_COLORS[s.away].bg, color: TEAM_COLORS[s.away].text, border: `1px solid ${TEAM_COLORS[s.away].border}`, borderRadius: 6, padding: '3px 12px', fontWeight: 700, fontSize: 13 }}>Team {s.away}</span>
                  </div>
                  {s.rest && <div style={{ background: 'rgba(136,136,128,0.1)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}><LuMoon size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Team {s.rest} rests</div>}
                  {!s.rest && i < schedule.length - 1 && <div style={{ background: 'rgba(100,160,255,0.08)', color: '#64a0ff', border: '1px solid rgba(100,160,255,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}><LuCoffee size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />7 min break</div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('setup')} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>← Edit Teams</button>
              <button type="button" onClick={() => { setCurrentMatch(0); setStep('rating'); }} style={{ flex: 2, padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Start Rating →</button>
            </div>
          </div>
        )}

        {step === 'rating' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              {schedule.map((s, i) => (
                <button key={i} type="button" onClick={() => setCurrentMatch(i)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: currentMatch === i ? 'var(--accent)' : 'var(--card)', color: currentMatch === i ? '#fff' : 'var(--muted)', border: `1px solid ${currentMatch === i ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer' }}>M{i + 1}</button>
              ))}
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: TEAM_COLORS[match.home].bg, color: TEAM_COLORS[match.home].text, border: `1px solid ${TEAM_COLORS[match.home].border}`, borderRadius: 8, padding: '4px 16px', fontWeight: 700, fontSize: 15 }}>Team {match.home}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>vs</span>
                <span style={{ background: TEAM_COLORS[match.away].bg, color: TEAM_COLORS[match.away].text, border: `1px solid ${TEAM_COLORS[match.away].border}`, borderRadius: 8, padding: '4px 16px', fontWeight: 700, fontSize: 15 }}>Team {match.away}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {match.rest && <div style={{ background: 'rgba(136,136,128,0.1)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><LuMoon size={11} />Team {match.rest} rests</div>}
                {match.time && <div style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)' }}>{formatTime(match.time)}</div>}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.6 }}>Tap to adjust each stat. Current values shown. Use</span>
              <span style={{ fontFamily: "'Space Mono'", color: '#f87171', fontWeight: 700 }}>−</span>
              <span style={{ opacity: 0.6 }}>and</span>
              <span style={{ fontFamily: "'Space Mono'", color: '#4ade80', fontWeight: 700 }}>+</span>
              <span style={{ opacity: 0.6 }}>to record this game's events.</span>
            </div>

            <div className="rating-teams-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[{ team: match.home, players: homePlayers }, { team: match.away, players: awayPlayers }].map(({ team, players: teamUids }) => {
                const tc = TEAM_COLORS[team];
                return (
                  <div key={team} style={{ background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 14, padding: 10 }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: tc.text, marginBottom: 10 }}>TEAM {team}</div>
                    {teamUids.map((uid) => {
                      const p = MOCK_PROFILES[uid];
                      const stats = ratings[uid] || defaultStats();
                      const base = MOCK_BASE_TAPS[uid] || defaultStats();
                      const bib = getBibNumber(uid, team, teamPlayers);
                      const isRanked = (MOCK_PROFILES[uid]?.games_played || 0) > 0;
                      const totalDelta = CARD_STATS.reduce((sum, { key }) => sum + ((stats[key] || 0) - (base[key] || 0)), 0);
                      const liveCardStats = {};
                      CARD_STATS.forEach(({ key, label }) => {
                        liveCardStats[label.toLowerCase()] = Math.max(30, Math.min(99, 30 + (stats[key] || 0)));
                      });
                      const liveOvr = calcOverall(liveCardStats);
                      const liveRank = getRank(liveOvr);
                      const rt = getCardTheme(liveRank);
                      const isExpanded = expandedUid === uid;

                      return (
                        <div key={uid} style={{ background: rt.bg, border: `${totalDelta !== 0 ? 3 : 2}px solid ${rt.border}`, borderRadius: 12, padding: 12, marginBottom: 10, transition: 'border-color 0.15s, background 0.2s' }}>
                          <div onClick={() => setExpandedUid(isExpanded ? null : uid)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: isExpanded ? 10 : 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: tc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1e2123', flexShrink: 0 }}>{bib}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: rt.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name}</div>
                              <div style={{ fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700, color: rt.text, background: rt.statBg, border: `1px solid ${rt.border}`, borderRadius: 5, padding: '2px 7px', letterSpacing: 0.3, display: 'inline-block', marginTop: 3 }}>{liveRank.toUpperCase()} · {liveOvr} OVR</div>
                            </div>
                            {totalDelta !== 0 && <div style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: totalDelta > 0 ? '#4ade80' : '#f87171', background: totalDelta > 0 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', border: `1px solid ${totalDelta > 0 ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{totalDelta > 0 ? `+${totalDelta}` : totalDelta}</div>}
                            <IoChevronDown size={16} style={{ color: rt.text, flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          </div>

                          {isExpanded && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                              {CARD_STATS.map(({ key, label }) => {
                                const taps = stats[key] || 0;
                                const baseTaps = base[key] || 0;
                                const cardVal = Math.max(30, Math.min(99, 30 + taps));
                                const delta = taps - baseTaps;
                                const canDecrease = isRanked ? taps > 0 : taps > baseTaps;
                                return (
                                  <div key={key} style={{ borderRadius: 8, border: `1.5px solid ${delta !== 0 ? rt.border : 'transparent'}`, background: rt.statBg, transition: 'all 0.12s' }}>
                                    <div style={{ fontFamily: "'Space Mono'", fontSize: 7, fontWeight: 700, color: delta !== 0 ? rt.text : rt.muted, letterSpacing: 1, textAlign: 'center', paddingTop: 5 }}>{label}</div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <button type="button" onClick={() => updateStat(uid, key, -1)} style={{ flex: 1, background: 'none', border: 'none', cursor: canDecrease ? 'pointer' : 'default', color: canDecrease ? '#f87171' : rt.muted, fontSize: 15, fontWeight: 700, padding: '3px 0', opacity: canDecrease ? 1 : 0.3, lineHeight: 1 }}>−</button>
                                      <div style={{ flex: 2, textAlign: 'center' }}>
                                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, lineHeight: 1, color: delta !== 0 ? rt.text : rt.muted }}>{cardVal}</div>
                                        <div style={{ fontFamily: "'Space Mono'", fontSize: 8, fontWeight: 700, lineHeight: 1.5, color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : 'transparent' }}>{delta > 0 ? `+${delta}` : delta !== 0 ? `${delta}` : '·'}</div>
                                      </div>
                                      <button type="button" onClick={() => updateStat(uid, key, 1)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 15, fontWeight: 700, padding: '3px 0', lineHeight: 1 }}>+</button>
                                    </div>
                                    <div style={{ height: 5 }} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button type="button" onClick={() => setCurrentMatch((m) => Math.max(0, m - 1))} disabled={currentMatch === 0} style={{ flex: 1, padding: '11px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, opacity: currentMatch === 0 ? 0.4 : 1 }}>
                ← Prev Match
              </button>
              {currentMatch < schedule.length - 1 ? (
                <button type="button" onClick={() => setCurrentMatch((m) => m + 1)} style={{ flex: 1, padding: '11px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                  Next Match →
                </button>
              ) : (
                <button type="button" onClick={() => setStep('motm')} disabled={allPlayersRated} style={{ flex: 1, padding: '11px', background: allPlayersRated ? 'var(--card2)' : 'var(--accent)', color: allPlayersRated ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {allPlayersRated ? 'Ratings complete' : 'Choose Top 3 →'}
                </button>
              )}
            </div>

            <button type="button" onClick={() => setStep('schedule')} style={{ width: '100%', padding: '10px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><IoCalendar size={14} />View Schedule</button>
          </div>
        )}

        {step === 'motm' && (
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>CHOOSE TOP 3 PLAYERS</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>Select the best performers of this session. Tap to assign 1st, 2nd, 3rd place awards. At least 1 required.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {PLAYER_IDS.map((uid) => {
                const p = MOCK_PROFILES[uid];
                const stats = ratings[uid] || defaultStats();
                const base = MOCK_BASE_TAPS[uid] || defaultStats();
                const motmIdx = motmPlayers.indexOf(uid);
                const isSelected = motmIdx >= 0;
                const meta = isSelected ? MOTM_META[motmIdx] : null;
                const canSelect = !isSelected && motmPlayers.length < 3;

                return (
                  <button key={uid} type="button" onClick={() => toggleMotm(uid)} disabled={!isSelected && motmPlayers.length >= 3} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, textAlign: 'left', background: isSelected ? meta.bg : 'var(--card)', border: `1.5px solid ${isSelected ? meta.border : 'var(--border)'}`, cursor: isSelected || canSelect ? 'pointer' : 'default', opacity: !isSelected && motmPlayers.length >= 3 ? 0.45 : 1, transition: 'all 0.15s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: isSelected ? meta.color : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#1e2123', overflow: 'hidden' }}>
                      {p?.name?.[0] || '?'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? meta.color : 'var(--text)', marginBottom: 4 }}>{p?.name || 'Unknown'}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {CARD_STATS.map(({ key, label, color }) => {
                          const delta = (stats[key] || 0) - (base[key] || 0);
                          if (delta === 0) return null;
                          return <span key={key} style={{ fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}38`, borderRadius: 4, padding: '1px 5px' }}>{label}{delta > 0 ? `+${delta}` : delta}</span>;
                        })}
                        {CARD_STATS.every(({ key }) => (stats[key] || 0) - (base[key] || 0) === 0) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>No events</span>}
                      </div>
                    </div>

                    {isSelected ? (
                      <div style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 8, padding: '4px 12px', flexShrink: 0, fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: meta.color, display: 'flex', alignItems: 'center', gap: 5 }}><GiTrophy size={12} />{meta.label}</div>
                    ) : canSelect ? (
                      <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', flexShrink: 0, fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>Tap</div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('rating')} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>← Back to Rating</button>
              <button type="button" onClick={() => setTestCompleted(true)} disabled={motmPlayers.length !== 3} style={{ flex: 2, padding: '12px', background: motmPlayers.length === 3 ? 'var(--accent)' : 'var(--card2)', color: motmPlayers.length === 3 ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, opacity: motmPlayers.length === 3 ? 1 : 0.5, cursor: motmPlayers.length === 3 ? 'pointer' : 'default' }}>
                {motmPlayers.length === 3 ? 'Complete Tutorial ✓' : `Select 3 winners (${motmPlayers.length}/3)`}
              </button>
            </div>

            {testCompleted && (
              <div style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.30)', borderRadius: 12, padding: '14px 16px', marginTop: 16, color: 'var(--text)', fontSize: 13, lineHeight: 1.7 }}>
                <strong style={{ color: '#4ade80' }}>Tutorial complete:</strong> the mock manager flow is finished. This page is only a training walkthrough and does not save a real game.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
