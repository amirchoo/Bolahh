import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getCached, setCached, clearCached } from '../lib/dataCache';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { IoCheckmarkCircle, IoCloseCircle, IoClose, IoCalendar, IoRemoveCircle, IoConstruct } from 'react-icons/io5';
import { GiSoccerBall, GiTrophy, GiRunningShoe } from 'react-icons/gi';
import { LuLightbulb, LuMoon, LuCoffee } from 'react-icons/lu';

const MOTM_META = {
  0: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', label: '1ST' },
  1: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.35)', label: '2ND' },
  2: { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.35)', label: '3RD' },
};

const CARD_STATS = [
  { key: 'shooting_quality',   label: 'SHO', color: '#f87171' },
  { key: 'passing_quality',    label: 'PAS', color: '#4ade80' },
  { key: 'successful_dribble', label: 'DRI', color: '#F09D51' },
  { key: 'good_defending',     label: 'DEF', color: '#a78bfa' },
  { key: 'good_keeping',       label: 'PHY', color: '#34d399' },
  { key: 'good_chance',        label: 'PAC', color: '#64a0ff' },
];

const defaultStats = () => ({
  shooting_quality: 0, passing_quality: 0,
  good_defending: 0, good_keeping: 0,
  successful_dribble: 0, good_chance: 0,
});

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
const MOCK_GAME = {
  id: 'preview', title: 'Preview Game', format: '5v5', time: '20:00',
  fields: { name: 'Futsal Arena KL' }, created_by: 'preview-admin',
};
const MOCK_PLAYER_IDS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'];
const MOCK_PROFILES = {
  p1:  { id:'p1',  name:'Amir Hazif',   avatar_url: null, total_points: 52, games_played: 14 },
  p2:  { id:'p2',  name:'Hafiz Noor',   avatar_url: null, total_points: 44, games_played: 9  },
  p3:  { id:'p3',  name:'Razif Shah',   avatar_url: null, total_points: 41, games_played: 8  },
  p4:  { id:'p4',  name:'Danial Amin',  avatar_url: null, total_points: 63, games_played: 21 },
  p5:  { id:'p5',  name:'Syafiq Rizal', avatar_url: null, total_points: 33, games_played: 4  },
  p6:  { id:'p6',  name:'Irfan Zaki',   avatar_url: null, total_points: 48, games_played: 12 },
  p7:  { id:'p7',  name:'Faiz Luqman',  avatar_url: null, total_points: 37, games_played: 6  },
  p8:  { id:'p8',  name:'Haris Fikri',  avatar_url: null, total_points: 56, games_played: 16 },
  p9:  { id:'p9',  name:'Izzat Kamil',  avatar_url: null, total_points: 31, games_played: 2  },
  p10: { id:'p10', name:'Zulhilmi',     avatar_url: null, total_points: 71, games_played: 24 },
};
const MOCK_BASE_TAPS = {
  p1:  { shooting_quality: 22, passing_quality: 14, good_defending: 8,  good_keeping: 5,  successful_dribble: 17, good_chance: 12 },
  p2:  { shooting_quality: 14, passing_quality: 18, good_defending: 6,  good_keeping: 3,  successful_dribble: 9,  good_chance: 10 },
  p3:  { shooting_quality: 11, passing_quality: 10, good_defending: 12, good_keeping: 4,  successful_dribble: 7,  good_chance: 8  },
  p4:  { shooting_quality: 33, passing_quality: 22, good_defending: 15, good_keeping: 9,  successful_dribble: 24, good_chance: 20 },
  p5:  { shooting_quality: 3,  passing_quality: 4,  good_defending: 2,  good_keeping: 1,  successful_dribble: 4,  good_chance: 3  },
  p6:  { shooting_quality: 18, passing_quality: 12, good_defending: 9,  good_keeping: 6,  successful_dribble: 13, good_chance: 11 },
  p7:  { shooting_quality: 7,  passing_quality: 9,  good_defending: 4,  good_keeping: 2,  successful_dribble: 6,  good_chance: 5  },
  p8:  { shooting_quality: 26, passing_quality: 16, good_defending: 11, good_keeping: 7,  successful_dribble: 19, good_chance: 14 },
  p9:  { shooting_quality: 1,  passing_quality: 2,  good_defending: 1,  good_keeping: 0,  successful_dribble: 2,  good_chance: 1  },
  p10: { shooting_quality: 41, passing_quality: 28, good_defending: 18, good_keeping: 12, successful_dribble: 31, good_chance: 25 },
};
// ──────────────────────────────────────────────────────────────────────────────

export default function GameRatingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const storageKey = `bolahh_rating_${id}`;

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [notOwner, setNotOwner] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [motmPlayers, setMotmPlayers] = useState([]);
  const [goalAssist, setGoalAssist] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Step: 'config' | 'setup' | 'schedule' | 'rating'
  const [step, setStep] = useState('config');
  const [currentMatch, setCurrentMatch] = useState(0);

  const [duration, setDuration] = useState(120);
  const [teamMode, setTeamMode] = useState(null);

  // Team assignments: { userId: 'A' | 'B' | 'C' }
  const [teamAssign, setTeamAssign] = useState({});
  // Ratings: { userId: { goals, assists, ... } } — tracks TOTAL lifetime taps (adjusted this session)
  const [ratings, setRatings] = useState({});
  // Base taps before this game — used to compute the per-game delta on submit
  const [baseRatings, setBaseRatings] = useState({});

  useEffect(() => {
    if (!isPreview) {
      const cached = getCached(`rating_data_${id}`);
      if (cached) {
        setGame(cached.game); setPlayers(cached.players);
        setProfiles(cached.profiles); setBaseRatings(cached.baseRatings);
        const initRatings = {};
        cached.players.forEach(uid => { initRatings[uid] = { ...(cached.baseRatings[uid] || defaultStats()) }; });
        setRatings(initRatings);
        const formatNum = parseInt(cached.game?.format) || 5;
        setTeamMode(cached.players.length <= formatNum * 2 ? 2 : 3);
        setLoading(false);
      }
    }
    fetchData(isPreview ? false : !!getCached(`rating_data_${id}`));
  }, [id]);

  // Persist progress to localStorage so a phone screen-off / tab refresh doesn't lose work
  useEffect(() => {
    if (loading || isPreview) return;
    localStorage.setItem(storageKey, JSON.stringify({ step, duration, teamMode, teamAssign, ratings, currentMatch, motmPlayers, goalAssist }));
  }, [step, duration, teamMode, teamAssign, ratings, currentMatch, loading, goalAssist]);

  // Persist goal/assist separately so summary page can read it even before submit
  useEffect(() => {
    if (loading || isPreview) return;
    localStorage.setItem(`bolahh_goal_assist_${id}`, JSON.stringify(goalAssist));
  }, [goalAssist, loading]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);

    if (isPreview) {
      setGame(MOCK_GAME);
      setProfiles(MOCK_PROFILES);
      setPlayers(MOCK_PLAYER_IDS);
      setBaseRatings(MOCK_BASE_TAPS);
      const initRatings = {};
      MOCK_PLAYER_IDS.forEach(uid => { initRatings[uid] = { ...(MOCK_BASE_TAPS[uid] || defaultStats()) }; });
      setRatings(initRatings);
      setTeamMode(3);
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
      .from('profiles').select('id, name, avatar_url, total_points, games_played, card_stats').in('id', userIds);

    const profileMap = {};
    profileData?.forEach(p => { profileMap[p.id] = p; });
    setProfiles(profileMap);
    setPlayers(userIds);

    // Derive base taps from profiles.card_stats — the authoritative pre-computed source.
    // card_stat = 30 + lifetime_taps  →  taps = card_stat - 30
    const baseMap = {};
    userIds.forEach(uid => {
      const cs = profileMap[uid]?.card_stats || {};
      baseMap[uid] = {
        shooting_quality:   Math.max(0, (cs.sho || 30) - 30),
        passing_quality:    Math.max(0, (cs.pas || 30) - 30),
        good_defending:     Math.max(0, (cs.def || 30) - 30),
        good_keeping:       Math.max(0, (cs.phy || 30) - 30),
        successful_dribble: Math.max(0, (cs.dri || 30) - 30),
        good_chance:        Math.max(0, (cs.pac || 30) - 30),
      };
    });
    setBaseRatings(baseMap);

    // Init ratings to current base — manager adjusts from here
    const initRatings = {};
    userIds.forEach(uid => { initRatings[uid] = { ...baseMap[uid] }; });
    setRatings(initRatings);

    // Auto-suggest team mode
    const formatNum = parseInt(gameData?.format) || 5;
    setTeamMode(userIds.length <= formatNum * 2 ? 2 : 3);

    // Check already rated
    const { data: existing } = await supabase
      .from('game_ratings').select('user_id').eq('game_id', id).limit(1);
    if (existing && existing.length > 0) setAlreadyRated(true);

    setCached(`rating_data_${id}`, { game: gameData, players: userIds, profiles: profileMap, baseRatings: baseMap });

    // Restore saved progress if the admin was interrupted mid-session
    try {
      const saved = localStorage.getItem(`bolahh_rating_${id}`);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.step)              setStep(p.step);
        if (p.duration)          setDuration(p.duration);
        if (p.teamMode)          setTeamMode(p.teamMode);
        if (p.teamAssign)        setTeamAssign(p.teamAssign);
        if (p.ratings)           setRatings(p.ratings);
        if (p.currentMatch != null) setCurrentMatch(p.currentMatch);
        if (p.motmPlayers)       setMotmPlayers(p.motmPlayers);
        if (p.goalAssist)        setGoalAssist(p.goalAssist);
      }
    } catch {}

    setLoading(false);
  };

  const activeTeams = teamMode === 2 ? ['A', 'B'] : ['A', 'B', 'C'];

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

  const buildSchedule = () => {
    if (teamMode === 2) {
      const matchMin = 15;
      const breakMin = 7;
      const numMatches = Math.floor((duration + breakMin) / (matchMin + breakMin));
      return Array.from({ length: numMatches }, (_, i) => ({
        home: 'A', away: 'B', rest: null,
        time: game?.time ? addMinutes(game.time, i * (matchMin + breakMin)) : '',
        index: i,
      }));
    } else {
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
    const isRanked = (profiles[uid]?.games_played || 0) > 0;
    const baseMin = isRanked ? 0 : (baseRatings[uid]?.[key] || 0);
    setRatings(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [key]: Math.max(baseMin, (prev[uid][key] || 0) + delta) }
    }));
  };

  const updateGoalAssist = (uid, type, delta) => {
    setGoalAssist(prev => {
      const curr = prev[uid] || { goals: 0, assists: 0 };
      return { ...prev, [uid]: { ...curr, [type]: Math.max(0, (curr[type] || 0) + delta) } };
    });
  };

  const toggleMotm = (uid) => {
    setMotmPlayers(prev => {
      if (prev.includes(uid)) return prev.filter(id => id !== uid);
      if (prev.length < 3) return [...prev, uid];
      return prev;
    });
  };

  const handleSubmit = async () => {
    if (isPreview) { setSuccess('Preview mode. No data written.'); return; }
    setSaving(true); setError('');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      for (const uid of players) {
        const stats = ratings[uid] || defaultStats();
        const base  = baseRatings[uid] || defaultStats();

        const d_sho = (stats.shooting_quality   || 0) - (base.shooting_quality   || 0);
        const d_pas = (stats.passing_quality    || 0) - (base.passing_quality    || 0);
        const d_def = (stats.good_defending     || 0) - (base.good_defending     || 0);
        const d_phy = (stats.good_keeping       || 0) - (base.good_keeping       || 0);
        const d_dri = (stats.successful_dribble || 0) - (base.successful_dribble || 0);
        const d_pac = (stats.good_chance        || 0) - (base.good_chance        || 0);

        const { error: insertError } = await supabase.from('game_ratings').insert({
          game_id: id,
          user_id: uid,
          rated_by: currentUser.id,
          goals:             goalAssist[uid]?.goals   || 0,
          assists:           goalAssist[uid]?.assists || 0,
          shooting_quality:  d_sho,
          passing_quality:   d_pas,
          good_defending:    d_def,
          good_keeping:      d_phy,
          successful_dribble: d_dri,
          good_chance:       d_pac,
          good_manner: 0,
          admin_bonus: motmPlayers.indexOf(uid) >= 0 ? motmPlayers.indexOf(uid) + 1 : 0,
          total_points: 0,
        });
        if (insertError) throw new Error('Rating insert failed: ' + insertError.message);

        // Apply deltas directly to existing card_stats (preserves prior rating)
        const existing = profiles[uid]?.card_stats || {};
        const newPac = Math.max(30, Math.min(99, (existing.pac || 30) + d_pac));
        const newSho = Math.max(30, Math.min(99, (existing.sho || 30) + d_sho));
        const newPas = Math.max(30, Math.min(99, (existing.pas || 30) + d_pas));
        const newDri = Math.max(30, Math.min(99, (existing.dri || 30) + d_dri));
        const newDef = Math.max(30, Math.min(99, (existing.def || 30) + d_def));
        const newPhy = Math.max(30, Math.min(99, (existing.phy || 30) + d_phy));
        const newOverall = Math.round((newPac + newSho + newPas + newDri + newDef + newPhy) / 6);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            total_points: newOverall,
            games_played: (profiles[uid]?.games_played || 0) + 1,
            card_stats: { pac: newPac, sho: newSho, pas: newPas, dri: newDri, def: newDef, phy: newPhy },
          })
          .eq('id', uid);

        if (updateError) throw new Error('Profile update failed: ' + updateError.message);
      }

      localStorage.removeItem(storageKey);
      clearCached(`rating_data_${id}`);
      setSuccess('Ratings submitted!');
      setAlreadyRated(true);
      setStep('config');
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 12 };

  if (loading) return (
    <div style={{ minHeight: '100vh' }}><Navbar />
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GiSoccerBall size={32} color="var(--accent)" /></div><p>Loading...</p>
      </div>
    </div>
  );

  if (notOwner) return (
    <div style={{ minHeight: '100vh' }}><Navbar />
      <div className="page-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate('/manager')} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 24 }}>← Back</button>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><IoRemoveCircle size={48} color="var(--red)" /></div>
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
      <div className="page-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

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
            <IoConstruct size={16} /> Preview mode. Nothing will be saved.
          </div>
        )}

        {/* Banners */}
        {alreadyRated && !success && (
          <div style={{ background: 'rgba(240,157,81,0.1)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--accent)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoCheckmarkCircle size={16} /> This game has already been rated.
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: 'rgba(240,157,81,0.1)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 10, color: 'var(--accent)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoCheckmarkCircle size={16} /> {success}
            </div>
            <button onClick={() => navigate(`/game/${id}/summary`)} style={{
              width: '100%', padding: '12px',
              background: 'rgba(255,215,0,0.1)', color: '#FFD700',
              border: '1.5px solid rgba(255,215,0,0.35)', borderRadius: 10,
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              View Match Summary →
            </button>
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoCloseCircle size={16} /> {error}
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { key: 'config',   label: '1. Setup'        },
            { key: 'setup',    label: '2. Assign Teams'  },
            { key: 'schedule', label: '3. Schedule'      },
            { key: 'rating',   label: '4. Rate Players'  },
            { key: 'motm',     label: '5. Awards'        },
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

            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>TEAM FORMAT</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
                {players.length} player{players.length !== 1 ? 's' : ''} joined · {game?.format} format
              </p>
              {teamMode !== null && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 16,
                  background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.3)',
                  borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#64a0ff', fontWeight: 600
                }}>
                  <LuLightbulb size={13} /> {teamMode} teams suggested based on player count
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

            {teamMode !== null && (
              <div style={{
                background: 'var(--card2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <IoCalendar size={14} /><strong style={{ color: 'var(--text)' }}>Preview:</strong> {getScheduleInfo()}
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
                            border: 'none', borderRadius: 4, fontSize: 10, padding: '2px 6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}><IoClose size={10} /></button>
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
                  {s.rest && (
                    <div style={{
                      background: 'rgba(136,136,128,0.1)', color: 'var(--muted)',
                      border: '1px solid var(--border)', borderRadius: 6,
                      padding: '3px 10px', fontSize: 11, fontWeight: 600
                    }}><LuMoon size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Team {s.rest} rests</div>
                  )}
                  {!s.rest && i < schedule.length - 1 && (
                    <div style={{
                      background: 'rgba(100,160,255,0.08)', color: '#64a0ff',
                      border: '1px solid rgba(100,160,255,0.2)', borderRadius: 6,
                      padding: '3px 10px', fontSize: 11, fontWeight: 600
                    }}><LuCoffee size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />7 min break</div>
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
                {match.rest && (
                  <div style={{ background: 'rgba(136,136,128,0.1)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><LuMoon size={11} />Team {match.rest} rests</div>
                )}
                {match.time && <div style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)' }}>{formatTime(match.time)}</div>}
              </div>
            </div>

            {/* Hint */}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.6 }}>Tap to adjust each stat. Current values shown. Use</span>
              <span style={{ fontFamily: "'Space Mono'", color: '#f87171', fontWeight: 700 }}>−</span>
              <span style={{ opacity: 0.6 }}>and</span>
              <span style={{ fontFamily: "'Space Mono'", color: '#4ade80', fontWeight: 700 }}>+</span>
              <span style={{ opacity: 0.6 }}>to record this game's events.</span>
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
                      const base  = baseRatings[uid] || defaultStats();
                      const bib = getBibNumber(uid, team);
                      const isRanked = (profiles[uid]?.games_played || 0) > 0;

                      // Total delta across all stats for this player
                      const totalDelta = CARD_STATS.reduce((sum, { key }) => sum + ((stats[key] || 0) - (base[key] || 0)), 0);

                      return (
                        <div key={uid} style={{
                          background: 'var(--card)', border: `1px solid ${totalDelta !== 0 ? tc.border : 'var(--border)'}`,
                          borderRadius: 12, padding: 12, marginBottom: 10,
                          transition: 'border-color 0.15s',
                        }}>
                          {/* Player info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: tc.text,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: '#1e2123', flexShrink: 0
                            }}>{bib}</div>
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p?.name}</div>
                            {totalDelta !== 0 && (
                              <div style={{
                                fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700,
                                color: totalDelta > 0 ? '#4ade80' : '#f87171',
                                background: totalDelta > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                                border: `1px solid ${totalDelta > 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                                borderRadius: 5, padding: '2px 6px',
                              }}>
                                {totalDelta > 0 ? `+${totalDelta}` : totalDelta} this game
                              </div>
                            )}
                          </div>

                          {/* Goal / Assist counters */}
                          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            {[
                              { type: 'goals',   label: 'GOAL',   icon: <GiSoccerBall size={13} />, color: '#F09D51', bg: 'rgba(240,157,81,0.12)', border: 'rgba(240,157,81,0.35)' },
                              { type: 'assists', label: 'ASSIST', icon: <GiRunningShoe size={13} />, color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)' },
                            ].map(({ type, label, icon, color, bg, border }) => {
                              const count = goalAssist[uid]?.[type] || 0;
                              return (
                                <div key={type} style={{
                                  flex: 1, display: 'flex', alignItems: 'center', gap: 4,
                                  background: count > 0 ? bg : 'var(--card2)',
                                  border: `1px solid ${count > 0 ? border : 'var(--border)'}`,
                                  borderRadius: 8, padding: '4px 6px',
                                  transition: 'all 0.12s',
                                }}>
                                  <span style={{ color: count > 0 ? color : 'var(--muted)' }}>{icon}</span>
                                  <span style={{ fontSize: 9, color: count > 0 ? color : 'var(--muted)', fontWeight: 700, letterSpacing: 0.5, flex: 1 }}>{label}</span>
                                  <button type="button" onClick={() => updateGoalAssist(uid, type, -1)} style={{
                                    background: 'none', border: 'none', cursor: count > 0 ? 'pointer' : 'default',
                                    color: count > 0 ? '#f87171' : 'var(--border)', fontSize: 13, fontWeight: 700,
                                    padding: '0 2px', lineHeight: 1, opacity: count > 0 ? 1 : 0.25,
                                  }}>−</button>
                                  <span style={{
                                    fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700,
                                    color: count > 0 ? color : 'var(--muted)', minWidth: 14, textAlign: 'center',
                                  }}>{count}</span>
                                  <button type="button" onClick={() => updateGoalAssist(uid, type, 1)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#4ade80', fontSize: 13, fontWeight: 700,
                                    padding: '0 2px', lineHeight: 1,
                                  }}>+</button>
                                </div>
                              );
                            })}
                          </div>

                          {/* 6 stat pads — 3×2 grid with [−] VALUE [+] */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                            {CARD_STATS.map(({ key, label, color }) => {
                              const taps     = stats[key] || 0;
                              const baseTaps = base[key] || 0;
                              const cardVal  = Math.max(30, Math.min(99, 30 + taps));
                              const delta    = taps - baseTaps;
                              const canDecrease = isRanked ? taps > 0 : taps > baseTaps;
                              return (
                                <div key={key} style={{
                                  borderRadius: 8,
                                  border: `1.5px solid ${delta !== 0 ? color : 'var(--border)'}`,
                                  background: delta !== 0 ? `${color}18` : 'var(--card2)',
                                  transition: 'all 0.12s',
                                }}>
                                  <div style={{
                                    fontFamily: "'Space Mono'", fontSize: 7, fontWeight: 700,
                                    color: delta !== 0 ? color : 'var(--muted)',
                                    letterSpacing: 1, textAlign: 'center', paddingTop: 5,
                                  }}>{label}</div>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button type="button" onClick={() => updateStat(uid, key, -1)} style={{
                                      flex: 1, background: 'none', border: 'none',
                                      cursor: canDecrease ? 'pointer' : 'default',
                                      color: canDecrease ? '#f87171' : 'var(--border)',
                                      fontSize: 15, fontWeight: 700, padding: '3px 0',
                                      opacity: canDecrease ? 1 : 0.2, lineHeight: 1,
                                    }}>−</button>
                                    <div style={{ flex: 2, textAlign: 'center' }}>
                                      <div style={{
                                        fontFamily: "'Bebas Neue'", fontSize: 20, lineHeight: 1,
                                        color: delta !== 0 ? color : 'var(--muted)',
                                      }}>{cardVal}</div>
                                      <div style={{
                                        fontFamily: "'Space Mono'", fontSize: 8, fontWeight: 700, lineHeight: 1.5,
                                        color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : 'transparent',
                                      }}>{delta > 0 ? `+${delta}` : delta !== 0 ? `${delta}` : '·'}</div>
                                    </div>
                                    <button type="button" onClick={() => updateStat(uid, key, 1)} style={{
                                      flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                                      color: '#4ade80', fontSize: 15, fontWeight: 700,
                                      padding: '3px 0', lineHeight: 1,
                                    }}>+</button>
                                  </div>
                                  <div style={{ height: 5 }} />
                                </div>
                              );
                            })}
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
                <button type="button" onClick={() => setStep('motm')} disabled={alreadyRated}
                  style={{ flex: 1, padding: '11px', background: alreadyRated ? 'var(--card2)' : 'var(--accent)', color: alreadyRated ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {alreadyRated ? 'Already Submitted' : 'Choose Top 3 →'}
                </button>
              )}
            </div>

            <button type="button" onClick={() => setStep('schedule')} style={{
              width: '100%', padding: '10px', background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><IoCalendar size={14} />View Schedule</button>
          </div>
        )}

        {/* ── STEP 4: MOTM SELECTION ── */}
        {step === 'motm' && (
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>
              CHOOSE TOP 3 PLAYERS
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
              Select the best performers of this session. Tap to assign 1st, 2nd, 3rd place awards. At least 1 required.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {players.map(uid => {
                const p = profiles[uid];
                const stats = ratings[uid] || defaultStats();
                const base  = baseRatings[uid] || defaultStats();
                const motmIdx = motmPlayers.indexOf(uid);
                const isSelected = motmIdx >= 0;
                const meta = isSelected ? MOTM_META[motmIdx] : null;
                const canSelect = !isSelected && motmPlayers.length < 3;

                return (
                  <button key={uid} type="button" onClick={() => toggleMotm(uid)}
                    disabled={!isSelected && motmPlayers.length >= 3}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 12, textAlign: 'left',
                      background: isSelected ? meta.bg : 'var(--card)',
                      border: `1.5px solid ${isSelected ? meta.border : 'var(--border)'}`,
                      cursor: isSelected || canSelect ? 'pointer' : 'default',
                      opacity: !isSelected && motmPlayers.length >= 3 ? 0.45 : 1,
                      transition: 'all 0.15s',
                    }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? meta.color : 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: '#1e2123', overflow: 'hidden',
                    }}>
                      {p?.avatar_url
                        ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (p?.name?.[0] || '?').toUpperCase()}
                    </div>

                    {/* Name + this-game stats */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? meta.color : 'var(--text)', marginBottom: 4 }}>
                        {p?.name || 'Unknown'}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {CARD_STATS.map(({ key, label, color }) => {
                          const delta = (stats[key] || 0) - (base[key] || 0);
                          if (delta === 0) return null;
                          return (
                            <span key={key} style={{
                              fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700,
                              color, background: `${color}15`, border: `1px solid ${color}38`,
                              borderRadius: 4, padding: '1px 5px',
                            }}>{label}{delta > 0 ? `+${delta}` : delta}</span>
                          );
                        })}
                        {CARD_STATS.every(({ key }) => (stats[key] || 0) - (base[key] || 0) === 0) && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>No events</span>
                        )}
                      </div>
                    </div>

                    {/* Rank badge or tap hint */}
                    {isSelected ? (
                      <div style={{
                        background: meta.bg, border: `1px solid ${meta.border}`,
                        borderRadius: 8, padding: '4px 12px', flexShrink: 0,
                        fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: meta.color,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <GiTrophy size={12} />{meta.label}
                      </div>
                    ) : canSelect ? (
                      <div style={{
                        background: 'var(--card2)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '4px 10px', flexShrink: 0,
                        fontSize: 11, color: 'var(--muted)',
                      }}>Tap to add</div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Selection summary */}
            <div style={{
              background: 'var(--card2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>SELECTED:</span>
              {motmPlayers.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>None yet</span>}
              {motmPlayers.map((uid, idx) => {
                const meta = MOTM_META[idx];
                return (
                  <span key={uid} style={{
                    fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700,
                    color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
                    borderRadius: 6, padding: '3px 10px',
                  }}>
                    {meta.label} {profiles[uid]?.name || uid}
                  </span>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('rating')} style={{
                flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>← Back to Rating</button>
              <button type="button" onClick={handleSubmit}
                disabled={saving || alreadyRated || motmPlayers.length === 0}
                style={{
                  flex: 2, padding: '12px',
                  background: motmPlayers.length > 0 && !alreadyRated ? 'var(--accent)' : 'var(--card2)',
                  color: motmPlayers.length > 0 && !alreadyRated ? '#fff' : 'var(--muted)',
                  border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {saving ? 'Submitting...' : alreadyRated ? 'Already Submitted' : motmPlayers.length === 0 ? 'Pick at least 1 player' : <><IoCheckmarkCircle size={16} />Submit All Ratings</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
