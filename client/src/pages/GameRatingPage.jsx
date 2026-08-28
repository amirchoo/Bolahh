import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getCached, setCached, clearCached } from '../lib/dataCache';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { RANKS, getRank, getRankColor } from '../lib/rankUtils';
import { getCardTheme, calcOverall } from '../components/FifaCard';
import PlayerAvatar from '../components/PlayerAvatar';
import EquippedBorderFrame from '../components/EquippedBorderFrame';
import { IoCheckmarkCircle, IoCloseCircle, IoClose, IoCalendar, IoRemoveCircle, IoConstruct, IoCallOutline, IoChevronDown } from 'react-icons/io5';
import { GiSoccerBall, GiTrophy } from 'react-icons/gi';
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

// Quick rank-up options — every tier except Novis, since that's the default a
// fresh player already starts at. Picking one instantly sets all 6 stats to
// the midpoint OVR of that tier instead of tapping +/- one stat at a time.
const RANK_UP_OPTIONS = RANKS.filter(r => r.name !== 'Novis');

// For 3-team mode: `restTeam` is the team sitting out the very first match,
// so the other two face off first — lets a manager start with whichever
// pair already has enough players while stragglers are still arriving.
// Puts restTeam last in the order (buildSchedule's round 1 always rests
// order[2]) and keeps the other two in their existing relative order.
// 2-team mode has no rest team — both teams always play together — so this
// just returns teams unchanged.
function rotationOrder(teams, restTeam) {
  if (teams.length < 3 || !restTeam || !teams.includes(restTeam)) return teams;
  return [...teams.filter(t => t !== restTeam), restTeam];
}

// Every court booking is a fixed 2-hour slot — kickoff usually slips, but the
// booking still ends 2 hours after the *scheduled* start, not the actual one.
const SESSION_MINUTES = 120;

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

function diffMinutes(endStr, startStr) {
  const [eh, em] = endStr.split(':').map(Number);
  const [sh, sm] = startStr.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

const TEAM_COLORS = {
  A: { bg: 'rgba(240,157,81,0.15)', border: 'rgba(240,157,81,0.4)', text: '#F09D51' },
  B: { bg: 'rgba(100,160,255,0.15)', border: 'rgba(100,160,255,0.4)', text: '#64a0ff' },
  C: { bg: 'rgba(100,220,130,0.15)', border: 'rgba(100,220,130,0.4)', text: '#64dc82' },
};

// Snake-draft players onto teams by rank (highest picks first, draft order
// reverses each round) so team average OVR stays close, then bibs each
// player 1..N in the order they landed on their team. This is only a
// starting point — managers can freely reassign afterward.
function balanceTeams(playerIds, profiles, teams) {
  const sorted = [...playerIds].sort((a, b) => (profiles[b]?.total_points || 30) - (profiles[a]?.total_points || 30));
  const buckets = Object.fromEntries(teams.map(t => [t, []]));
  sorted.forEach((uid, i) => {
    const round = Math.floor(i / teams.length);
    const pos = i % teams.length;
    const team = round % 2 === 0 ? teams[pos] : teams[teams.length - 1 - pos];
    buckets[team].push(uid);
  });
  const teamAssign = {};
  const bibAssign = {};
  teams.forEach(t => {
    buckets[t].forEach((uid, idx) => {
      teamAssign[uid] = t;
      bibAssign[uid] = idx + 1;
    });
  });
  return { teamAssign, bibAssign };
}

// ── PREVIEW / DEV MODE ────────────────────────────────────────────────────────
const MOCK_GAME = {
  id: 'preview', title: 'Preview Game', format: '5v5', time: '20:00',
  fields: { name: 'Futsal Arena KL' }, assigned_manager_id: 'preview-admin',
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
  const { user, isSuperAdmin } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Step: 'config' | 'setup' | 'schedule' | 'rating'
  const [step, setStep] = useState('config');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [expandedUid, setExpandedUid] = useState(null);
  const [quickRankUid, setQuickRankUid] = useState(null);
  useEffect(() => { setExpandedUid(null); setQuickRankUid(null); }, [currentMatch]);

  // Minute the first match actually kicked off (hour is fixed to the game's booked hour)
  const [startMinute, setStartMinute] = useState(null);
  // 3-team mode only: which team sits out the very first match (the other two face off first)
  const [firstRestTeam, setFirstRestTeam] = useState(null);
  const [teamMode, setTeamMode] = useState(null);

  // Team assignments: { userId: 'A' | 'B' | 'C' }
  const [teamAssign, setTeamAssign] = useState({});
  // Manual bib numbers: { userId: number } — set by the manager per-player, not auto-derived
  const [bibAssign, setBibAssign] = useState({});
  const [expandedSetupUid, setExpandedSetupUid] = useState(null);
  // True while teamAssign/bibAssign still hold the untouched auto-balanced suggestion —
  // flips false the moment a manager makes any manual change, so we stop overwriting their work.
  const [autoBalanced, setAutoBalanced] = useState(false);
  // Ratings: { userId: { shooting_quality, passing_quality, ... } } — tracks TOTAL lifetime taps (adjusted this session)
  const [ratings, setRatings] = useState({});
  // Base taps before this game — used to compute the per-game delta on submit
  const [baseRatings, setBaseRatings] = useState({});

  // Re-applies any in-progress work saved to localStorage (team assignments, taps,
  // step, etc). Must run — and finish — before `loading` flips to false anywhere,
  // otherwise the auto-save effect below can fire on blank defaults first and
  // wipe out the real progress before it's restored.
  const restoreSavedProgress = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.step)              setStep(p.step);
        if (p.startMinute != null) setStartMinute(p.startMinute);
        if (p.firstRestTeam)     setFirstRestTeam(p.firstRestTeam);
        if (p.teamMode)          setTeamMode(p.teamMode);
        if (p.teamAssign)        setTeamAssign(p.teamAssign);
        if (p.bibAssign)         setBibAssign(p.bibAssign);
        if (p.ratings)           setRatings(p.ratings);
        if (p.currentMatch != null) setCurrentMatch(p.currentMatch);
        if (p.motmPlayers)       setMotmPlayers(p.motmPlayers);
      }
    } catch {}
  };

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
        if (cached.game?.time) setStartMinute(parseInt(cached.game.time.split(':')[1], 10));
        restoreSavedProgress();
        setLoading(false);
      }
    }
    fetchData(isPreview ? false : !!getCached(`rating_data_${id}`));
  }, [id]);

  // Persist progress to localStorage so a phone screen-off / tab refresh doesn't lose work
  useEffect(() => {
    if (loading || isPreview) return;
    localStorage.setItem(storageKey, JSON.stringify({ step, startMinute, firstRestTeam, teamMode, teamAssign, bibAssign, ratings, currentMatch, motmPlayers }));
  }, [step, startMinute, firstRestTeam, teamMode, teamAssign, bibAssign, ratings, currentMatch, loading]);

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
      setStartMinute(parseInt(MOCK_GAME.time.split(':')[1], 10));
      setLoading(false);
      return;
    }

    const { data: gameData } = await supabase
      .from('games').select('*, fields(name)').eq('id', id).single();
    setGame(gameData);
    if (gameData?.time) setStartMinute(parseInt(gameData.time.split(':')[1], 10));

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (gameData?.assigned_manager_id && gameData.assigned_manager_id !== currentUser?.id && !isSuperAdmin) {
      setNotOwner(true); setLoading(false); return;
    }

    const { data: playerData } = await supabase
      .from('game_players').select('user_id').eq('game_id', id);

    if (!playerData || playerData.length === 0) { setLoading(false); return; }

    const userIds = playerData.map(p => p.user_id);
    // Fetched together (rather than sequentially) so there's no `await` gap between
    // resetting ratings/teamMode to defaults below and restoring saved progress —
    // otherwise a render could slip in between and the auto-save effect would
    // persist the still-default (unrestored) state, clobbering real progress.
    const [{ data: profileData }, { data: existing }] = await Promise.all([
      supabase.from('profiles').select('id, name, avatar_url, total_points, games_played, card_stats, equipped_border').in('id', userIds),
      supabase.from('game_ratings').select('user_id').eq('game_id', id).limit(1),
    ]);

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
    if (existing && existing.length > 0) setAlreadyRated(true);

    setCached(`rating_data_${id}`, { game: gameData, players: userIds, profiles: profileMap, baseRatings: baseMap });

    // Restore saved progress if the admin was interrupted mid-session
    restoreSavedProgress();

    setLoading(false);
  };

  const activeTeams = teamMode === 2 ? ['A', 'B'] : ['A', 'B', 'C'];
  // Falls back to the last team if the saved choice no longer applies (e.g.
  // the manager switched team count after picking who rests first) — 'C'
  // resting first reproduces the original default rotation.
  const effectiveRestTeam = teamMode === 3
    ? (activeTeams.includes(firstRestTeam) ? firstRestTeam : activeTeams[2])
    : null;

  // The booking always ends SESSION_MINUTES after the *scheduled* kickoff (game.time),
  // regardless of when the first match actually starts — so a late kickoff leaves less
  // time to work with, not a shifted 2-hour window.
  const scheduledEnd = game?.time ? addMinutes(game.time, SESSION_MINUTES) : null;
  const actualStart = game?.time && startMinute != null
    ? `${game.time.split(':')[0]}:${String(startMinute).padStart(2, '0')}`
    : game?.time;
  const availableMinutes = actualStart && scheduledEnd
    ? Math.max(10, diffMinutes(scheduledEnd, actualStart))
    : SESSION_MINUTES;

  // Hour is locked to the booked hour — the manager only ever picks the minute
  const scheduledHour = game?.time ? parseInt(game.time.split(':')[0], 10) : null;
  const scheduledMinute = game?.time ? parseInt(game.time.split(':')[1], 10) : null;
  const scheduledHour12 = scheduledHour != null ? (scheduledHour % 12 || 12) : null;
  const scheduledAmpm = scheduledHour != null ? (scheduledHour >= 12 ? 'PM' : 'AM') : null;

  const runAutoBalance = () => {
    const { teamAssign: nextTeams, bibAssign: nextBibs } = balanceTeams(players, profiles, activeTeams);
    setTeamAssign(nextTeams);
    setBibAssign(nextBibs);
    setAutoBalanced(true);
  };

  // Suggests a starting lineup balanced by average rank as soon as the manager
  // reaches the Assign Teams step, so they only need to rearrange from there.
  // Skips a session restored from localStorage (teamAssign already populated)
  // and stops re-running once the manager has made any manual change.
  useEffect(() => {
    if (step !== 'setup' || loading || players.length === 0) return;
    if (Object.keys(teamAssign).length > 0 && !autoBalanced) return;
    runAutoBalance();
  }, [step, loading, players, teamMode]);

  const teamPlayers = (team) =>
    players.filter(uid => teamAssign[uid] === team);

  const allAssigned = () =>
    players.length > 0 && players.every(uid => teamAssign[uid] && bibAssign[uid]);

  const setPlayerTeam = (uid, team) => {
    setAutoBalanced(false);
    setTeamAssign(prev => {
      const next = { ...prev };
      if (next[uid] === team) delete next[uid];
      else next[uid] = team;
      return next;
    });
  };

  const setPlayerBib = (uid, number) => {
    setAutoBalanced(false);
    setBibAssign(prev => {
      const next = { ...prev };
      if (next[uid] === number) delete next[uid];
      else next[uid] = number;
      return next;
    });
  };

  const clearPlayerAssignment = (uid) => {
    setAutoBalanced(false);
    setTeamAssign(prev => { const next = { ...prev }; delete next[uid]; return next; });
    setBibAssign(prev => { const next = { ...prev }; delete next[uid]; return next; });
  };

  // Bib numbers taken by other players already on the given team — used to
  // block picking a duplicate number within the same (differently-colored-per-team) bib set.
  const takenBibs = (team, excludeUid) =>
    players.filter(uid => uid !== excludeUid && teamAssign[uid] === team).map(uid => bibAssign[uid]);

  const getBibNumber = (uid) => bibAssign[uid];

  // Scales the on-time 2-hour plan (13 min/match × 3 rounds for 3 teams, or
  // 15 min match + 7 min break × 5 matches for 2 teams) down to whatever time
  // is actually left before the booking ends, so a late kickoff still fits the
  // same number of matches — each team still gets 6 halves out of 9 for 3 teams.
  const scaleFactor = availableMinutes / SESSION_MINUTES;

  const buildSchedule = () => {
    if (!actualStart) return [];
    const order = rotationOrder(activeTeams, effectiveRestTeam);
    if (teamMode === 2) {
      const [t1, t2] = order;
      const matchMin = 15 * scaleFactor;
      const breakMin = 7 * scaleFactor;
      const numMatches = 5;
      return Array.from({ length: numMatches }, (_, i) => ({
        home: t1, away: t2, rest: null,
        time: addMinutes(actualStart, Math.round(i * (matchMin + breakMin))),
        index: i,
      }));
    } else {
      const [t1, t2, t3] = order;
      const rotation = [
        { home: t1, away: t2, rest: t3 },
        { home: t2, away: t3, rest: t1 },
        { home: t1, away: t3, rest: t2 },
      ];
      const matchMin = 13 * scaleFactor;
      const allMatches = [];
      for (let r = 0; r < 3; r++) {
        rotation.forEach(m => allMatches.push(m));
      }
      return allMatches.map((m, i) => ({
        ...m,
        time: addMinutes(actualStart, Math.round(i * matchMin)),
        index: i,
      }));
    }
  };

  const getScheduleInfo = () => {
    if (teamMode === 2) {
      const matchMin = Math.round(15 * scaleFactor);
      const breakMin = Math.round(7 * scaleFactor);
      const numMatches = 5;
      return `${matchMin} min per match · ${breakMin} min breaks · ${numMatches} matches · ends ${scheduledEnd ? formatTime(scheduledEnd) : ''}`;
    } else {
      const matchMin = Math.round(13 * scaleFactor);
      return `${matchMin} min per match · 9 matches (6 per team) · ends ${scheduledEnd ? formatTime(scheduledEnd) : ''}`;
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

  // Instantly sets every stat to the midpoint OVR of the chosen rank tier —
  // for a new player who's clearly stronger than their Novis default,
  // this skips tapping +/- six separate times to reach the observed level.
  const applyQuickRank = (uid, rankName) => {
    const rank = RANKS.find(r => r.name === rankName);
    if (!rank) return;
    const targetTaps = Math.round((rank.minOvr + rank.maxOvr) / 2) - 30;
    const isRanked = (profiles[uid]?.games_played || 0) > 0;
    setRatings(prev => {
      const next = { ...prev[uid] };
      CARD_STATS.forEach(({ key }) => {
        const baseMin = isRanked ? 0 : (baseRatings[uid]?.[key] || 0);
        next[key] = Math.max(baseMin, targetTaps);
      });
      return { ...prev, [uid]: next };
    });
    setQuickRankUid(null);
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
          goals: 0,
          assists: 0,
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

        // Persist team/bib so the feedback page can show them later — otherwise
        // this only ever lived in this session's in-memory/localStorage state.
        const team = teamAssign[uid];
        if (team) {
          await supabase
            .from('game_players')
            .update({ team_assignment: team, bib_number: getBibNumber(uid) })
            .eq('game_id', id).eq('user_id', uid);
        }
      }

      localStorage.removeItem(storageKey);
      clearCached(`rating_data_${id}`);

      // Fire-and-forget — a failed email send shouldn't block/undo the ratings submission.
      supabase.functions.invoke('send-game-summary', { body: { game_id: id } }).catch(() => {});
      supabase.functions.invoke('send-award-email', { body: { game_id: id } }).catch(() => {});
      supabase.functions.invoke('send-rank-promotion-email', { body: { game_id: id } }).catch(() => {});

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
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>You can only rate players for games assigned to you.</p>
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => navigate(`/game/${id}`)} style={{
            background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 16px', fontSize: 13
          }}>← Back to Game</button>
          {!isPreview && (
            <button onClick={() => navigate(`/manager/game/${id}/players`)} style={{
              background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
              border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
              padding: '7px 16px', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}><IoCallOutline size={14} /> Player Payments / Call Players</button>
          )}
        </div>

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
            <button onClick={() => navigate(`/game/${id}`)} style={{
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
            { key: 'config',   label: '1. Team Format'   },
            { key: 'setup',    label: '2. Assign Teams'  },
            { key: 'kickoff',  label: '3. Kickoff Time'  },
            { key: 'schedule', label: '4. Schedule'      },
            { key: 'rating',   label: '5. Rate Players'  },
            { key: 'motm',     label: '6. Awards'        },
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
            <style>{`
              @media (max-width: 640px) {
                .team-assign-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0, flex: 1, minWidth: 220 }}>
                Teams start balanced by average rank — tap a player to move them to a different team or bib number, handy for keeping friends grouped together.
              </p>
              <button type="button" onClick={runAutoBalance} style={{
                background: 'var(--card2)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.35)',
                borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>↻ Re-balance by rank</button>
            </div>

            <div style={{ ...cardStyle, marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              {players.map((uid, i) => {
                const p = profiles[uid];
                const rank = getRank(p?.total_points || 0);
                const team = teamAssign[uid];
                const bib = bibAssign[uid];
                const tc = team ? TEAM_COLORS[team] : null;
                const isExpanded = expandedSetupUid === uid;
                const bibNumbers = Array.from({ length: Math.max(players.length, 12) }, (_, n) => n + 1);
                const taken = team ? takenBibs(team, uid) : [];

                return (
                  <div key={uid} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <div
                      onClick={() => setExpandedSetupUid(isExpanded ? null : uid)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0
                      }}>
                        {p?.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p?.name?.[0] || '?').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name}</div>
                        <span style={{
                          fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700,
                          color: getRankColor(rank), background: `${getRankColor(rank)}18`,
                          border: `1px solid ${getRankColor(rank)}40`, borderRadius: 5, padding: '1px 6px',
                        }}>{rank} · {p?.total_points || 30}</span>
                      </div>
                      {team && bib ? (
                        <span style={{
                          background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                          borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 12, flexShrink: 0,
                        }}>Team {team} · #{bib}</span>
                      ) : (
                        <span style={{
                          background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '4px 10px', fontSize: 12, flexShrink: 0,
                        }}>Unassigned</span>
                      )}
                      <IoChevronDown size={16} style={{
                        color: 'var(--muted)', flexShrink: 0,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }} />
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>TEAM</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                          {activeTeams.map(t => (
                            <button key={t} type="button" onClick={() => setPlayerTeam(uid, t)} style={{
                              flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 700, fontSize: 13,
                              background: team === t ? TEAM_COLORS[t].bg : 'var(--card2)',
                              color: team === t ? TEAM_COLORS[t].text : 'var(--muted)',
                              border: `1.5px solid ${team === t ? TEAM_COLORS[t].border : 'var(--border)'}`,
                              cursor: 'pointer',
                            }}>Team {t}</button>
                          ))}
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>BIB NUMBER</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                          {bibNumbers.map(n => {
                            const isTaken = taken.includes(n) && bib !== n;
                            const isSelected = bib === n;
                            return (
                              <button key={n} type="button" disabled={isTaken}
                                onClick={() => setPlayerBib(uid, n)}
                                title={isTaken ? 'Already used on this team' : undefined}
                                style={{
                                  width: 34, height: 34, borderRadius: 8, fontWeight: 700, fontSize: 13,
                                  background: isSelected ? 'var(--accent)' : 'var(--card2)',
                                  color: isSelected ? '#fff' : isTaken ? 'var(--border)' : 'var(--text)',
                                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                  cursor: isTaken ? 'default' : 'pointer',
                                  opacity: isTaken ? 0.4 : 1,
                                }}>{n}</button>
                            );
                          })}
                        </div>

                        {(team || bib) && (
                          <button type="button" onClick={() => clearPlayerAssignment(uid)} style={{
                            background: 'rgba(240,101,67,0.12)', color: 'var(--red)',
                            border: '1px solid rgba(240,101,67,0.3)', borderRadius: 8,
                            padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>Clear assignment</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="team-assign-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${activeTeams.length}, 1fr)`, gap: 12, marginBottom: 24 }}>
              {activeTeams.map(team => {
                const tc = TEAM_COLORS[team];
                const members = teamPlayers(team);
                const avgOvr = members.length > 0
                  ? Math.round(members.reduce((sum, uid) => sum + (profiles[uid]?.total_points || 30), 0) / members.length)
                  : null;
                const avgRank = avgOvr !== null ? getRank(avgOvr) : null;
                return (
                  <div key={team} style={{
                    background: tc.bg, border: `1px solid ${tc.border}`,
                    borderRadius: 14, padding: 14, minHeight: 100, minWidth: 0,
                  }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: tc.text, marginBottom: 4 }}>
                      TEAM {team}
                      <span style={{ fontSize: 12, fontFamily: 'DM Sans', marginLeft: 8, opacity: 0.7 }}>{members.length} players</span>
                    </div>
                    {avgRank && (
                      <div style={{
                        fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: tc.text,
                        opacity: 0.85, marginBottom: 12,
                      }}>Avg: {avgRank} · {avgOvr} OVR</div>
                    )}
                    {members.length === 0 && (
                      <div style={{ color: tc.text, opacity: 0.4, fontSize: 12, textAlign: 'center', paddingTop: 12 }}>No players yet</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {members
                        .slice()
                        .sort((a, b) => (bibAssign[a] || 0) - (bibAssign[b] || 0))
                        .map(uid => {
                          const p = profiles[uid];
                          const rank = getRank(p?.total_points || 0);
                          const theme = getCardTheme(rank);
                          return (
                            <div key={uid} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 8px', borderRadius: 8,
                              background: 'rgba(0,0,0,0.18)', position: 'relative',
                            }}>
                              <EquippedBorderFrame equippedBorder={p?.equipped_border} context="roster" borderRadius={8} thickness="6px 7px 6px 7px" />
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <PlayerAvatar profile={p} size={30} borderColor={theme.border} background={theme.statBg} />
                                <div style={{
                                  position: 'absolute', bottom: -2, right: -2,
                                  width: 15, height: 15, borderRadius: '50%',
                                  background: tc.text, color: '#1e2123',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 8, fontWeight: 700, border: '1.5px solid rgba(0,0,0,0.4)',
                                }}>{bibAssign[uid]}</div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: tc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p?.name}
                                </div>
                                <div style={{ fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700, color: tc.text, opacity: 0.75 }}>{rank}</div>
                              </div>
                              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: tc.text, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                                {p?.total_points || 30}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('config')} style={{
                flex: 1, padding: '13px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>← Back</button>
              <button type="button" onClick={() => setStep('kickoff')} disabled={!allAssigned()}
                style={{
                  flex: 2, padding: '13px', background: allAssigned() ? 'var(--accent)' : 'var(--card2)',
                  color: allAssigned() ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: 15, opacity: allAssigned() ? 1 : 0.5,
                  cursor: allAssigned() ? 'pointer' : 'default',
                }}>
                {allAssigned() ? 'Kickoff Time →' : `Assign all players first (${players.filter(u => !(teamAssign[u] && bibAssign[u])).length} remaining)`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1.5: KICKOFF TIME ── */}
        {step === 'kickoff' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>ACTUAL KICKOFF TIME</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                {game?.time
                  ? `This court is booked ${formatTime(game.time)}–${formatTime(scheduledEnd)} (2 hours, fixed). Games rarely start right on time — when did the first match actually kick off?`
                  : 'When did the first match actually kick off?'}
              </p>
              {scheduledHour12 != null && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 1, color: 'var(--text)' }}>{scheduledHour12}</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: 'var(--muted)' }}>:</div>
                  <input
                    type="number" min={0} max={59}
                    value={startMinute ?? scheduledMinute ?? 0}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      setStartMinute(Number.isNaN(v) ? 0 : Math.min(59, Math.max(0, v)));
                    }}
                    style={{
                      width: 76, fontFamily: "'Bebas Neue'", fontSize: 40, textAlign: 'center',
                      background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
                      color: 'var(--text)', padding: '2px 0',
                    }}
                  />
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 1, color: 'var(--muted)', marginLeft: 4 }}>{scheduledAmpm}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                {[0, 5, 10, 15, 20, 30].map(offset => (
                  <button key={offset} type="button"
                    onClick={() => setStartMinute(Math.min(59, (scheduledMinute ?? 0) + offset))}
                    style={{
                      background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>{offset === 0 ? 'On time' : `+${offset}m`}</button>
                ))}
              </div>
              <div style={{
                background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '10px 14px', fontSize: 12, color: 'var(--muted)',
              }}>
                Available playing time: <strong style={{ color: 'var(--text)' }}>{Math.floor(availableMinutes / 60)}h {availableMinutes % 60}m</strong> — the session still ends at {scheduledEnd ? formatTime(scheduledEnd) : ''} either way.
              </div>
            </div>

            {teamMode === 3 ? (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>WHICH TEAMS FACE OFF FIRST?</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
                  Some players run late — pick whichever two teams already have enough players to kick off. The third team just starts the rotation resting; everyone still plays 6 of the 9 halves.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeTeams.map(restTeam => {
                    const [teamX, teamY] = activeTeams.filter(t => t !== restTeam);
                    const isSelected = effectiveRestTeam === restTeam;
                    return (
                      <button key={restTeam} type="button" onClick={() => setFirstRestTeam(restTeam)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 6, textAlign: 'left',
                        padding: '12px 16px', borderRadius: 10, fontWeight: 700,
                        background: isSelected ? 'rgba(240,157,81,0.12)' : 'var(--card2)',
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ color: TEAM_COLORS[teamX].text, fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 1 }}>TEAM {teamX}</span>
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>vs</span>
                          <span style={{ color: TEAM_COLORS[teamY].text, fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 1 }}>TEAM {teamY}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, flexShrink: 0 }}>Team {restTeam} rests</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--muted)',
              }}>
                Both teams play every match, so there's nothing to pick here — everyone needs to be ready from kickoff.
              </div>
            )}

            <div style={{
              background: 'var(--card2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <IoCalendar size={14} /><strong style={{ color: 'var(--text)' }}>Preview:</strong> {getScheduleInfo()}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('setup')} style={{
                flex: 1, padding: '13px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>← Back</button>
              <button type="button" onClick={() => setStep('schedule')} disabled={startMinute == null} style={{
                flex: 2, padding: '13px',
                background: startMinute != null ? 'var(--accent)' : 'var(--card2)',
                color: startMinute != null ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
                opacity: startMinute != null ? 1 : 0.5, cursor: startMinute != null ? 'pointer' : 'default',
              }}>
                View Schedule →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: SCHEDULE ── */}
        {step === 'schedule' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>
                MATCH SCHEDULE · {actualStart ? formatTime(actualStart) : ''} KICKOFF
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
              <button type="button" onClick={() => setStep('kickoff')} style={{
                flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>← Edit Kickoff Time</button>
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
            <div className="rating-teams-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[{ team: match.home, players: homePlayers }, { team: match.away, players: awayPlayers }].map(({ team, players: teamUids }) => {
                const tc = TEAM_COLORS[team];
                return (
                  <div key={team} style={{ background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 14, padding: 10 }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: tc.text, marginBottom: 10 }}>TEAM {team}</div>
                    {teamUids.map((uid) => {
                      const p = profiles[uid];
                      const stats = ratings[uid] || defaultStats();
                      const base  = baseRatings[uid] || defaultStats();
                      const bib = getBibNumber(uid);
                      const isRanked = (profiles[uid]?.games_played || 0) > 0;

                      // Total delta across all stats for this player
                      const totalDelta = CARD_STATS.reduce((sum, { key }) => sum + ((stats[key] || 0) - (base[key] || 0)), 0);

                      // Live OVR/rank from this player's current (in-progress) stats, so the
                      // box re-themes the instant a tap pushes them into a new tier.
                      const liveCardStats = {};
                      CARD_STATS.forEach(({ key, label }) => {
                        liveCardStats[label.toLowerCase()] = Math.max(30, Math.min(99, 30 + (stats[key] || 0)));
                      });
                      const liveOvr = calcOverall(liveCardStats);
                      const liveRank = getRank(liveOvr);
                      const rt = getCardTheme(liveRank);
                      const isExpanded = expandedUid === uid;

                      return (
                        <div key={uid} style={{
                          background: rt.bg, border: `${totalDelta !== 0 ? 3 : 2}px solid ${rt.border}`,
                          borderRadius: 12, padding: 12, marginBottom: 10,
                          transition: 'border-color 0.15s, background 0.2s',
                        }}>
                          {/* Collapsed header — tap to expand/collapse the rating controls */}
                          <div
                            onClick={() => setExpandedUid(isExpanded ? null : uid)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: isExpanded ? 10 : 0 }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: tc.text,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: '#1e2123', flexShrink: 0
                            }}>{bib}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: rt.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name}</div>
                              <div
                                onClick={e => { e.stopPropagation(); setQuickRankUid(quickRankUid === uid ? null : uid); }}
                                title="Tap for instant rank-up"
                                style={{
                                  fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700,
                                  color: rt.text, background: rt.statBg,
                                  border: `1px solid ${rt.border}`, borderRadius: 5,
                                  padding: '2px 7px', letterSpacing: 0.3,
                                  display: 'inline-block', marginTop: 3, cursor: 'pointer',
                                }}>{liveRank.toUpperCase()} · {liveOvr} OVR ⚡</div>
                            </div>
                            {totalDelta !== 0 && (
                              <div style={{
                                fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700,
                                color: totalDelta > 0 ? '#4ade80' : '#f87171',
                                background: totalDelta > 0 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                                border: `1px solid ${totalDelta > 0 ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`,
                                borderRadius: 5, padding: '2px 6px', flexShrink: 0,
                              }}>
                                {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
                              </div>
                            )}
                            <IoChevronDown size={16} style={{
                              color: rt.text, flexShrink: 0,
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }} />
                          </div>

                          {quickRankUid === uid && (
                            <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.15)' }}>
                              <div style={{ fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: rt.muted, marginBottom: 6 }}>
                                INSTANT RANK-UP — sets all 6 stats to that tier
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {RANK_UP_OPTIONS.map(r => {
                                  const rc = getRankColor(r.name);
                                  const isCurrent = liveRank === r.name;
                                  return (
                                    <button key={r.name} type="button"
                                      onClick={e => { e.stopPropagation(); applyQuickRank(uid, r.name); }}
                                      style={{
                                        fontSize: 11, fontWeight: 700, color: rc,
                                        background: isCurrent ? `${rc}30` : `${rc}15`,
                                        border: `1.5px solid ${isCurrent ? rc : `${rc}50`}`,
                                        borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
                                      }}>{r.name}</button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {isExpanded && (
                          <>
                          {/* 6 stat pads — 3×2 grid with [−] VALUE [+] */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                            {CARD_STATS.map(({ key, label }) => {
                              const taps     = stats[key] || 0;
                              const baseTaps = base[key] || 0;
                              const cardVal  = Math.max(30, Math.min(99, 30 + taps));
                              const delta    = taps - baseTaps;
                              const canDecrease = isRanked ? taps > 0 : taps > baseTaps;
                              return (
                                <div key={key} style={{
                                  borderRadius: 8,
                                  border: `1.5px solid ${delta !== 0 ? rt.border : 'transparent'}`,
                                  background: rt.statBg,
                                  transition: 'all 0.12s',
                                }}>
                                  <div style={{
                                    fontFamily: "'Space Mono'", fontSize: 7, fontWeight: 700,
                                    color: delta !== 0 ? rt.text : rt.muted,
                                    letterSpacing: 1, textAlign: 'center', paddingTop: 5,
                                  }}>{label}</div>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button type="button" onClick={() => updateStat(uid, key, -1)} style={{
                                      flex: 1, background: 'none', border: 'none',
                                      cursor: canDecrease ? 'pointer' : 'default',
                                      color: canDecrease ? '#f87171' : rt.muted,
                                      fontSize: 15, fontWeight: 700, padding: '3px 0',
                                      opacity: canDecrease ? 1 : 0.3, lineHeight: 1,
                                    }}>−</button>
                                    <div style={{ flex: 2, textAlign: 'center' }}>
                                      <div style={{
                                        fontFamily: "'Bebas Neue'", fontSize: 20, lineHeight: 1,
                                        color: delta !== 0 ? rt.text : rt.muted,
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
                          </>
                          )}
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
