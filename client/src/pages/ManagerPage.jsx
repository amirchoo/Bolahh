import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached, clearCached } from '../lib/dataCache';
import { usePersistedState } from '../lib/usePersistedState';
import { refundGamePlayers } from '../lib/refundGamePlayers';
import { GiSoccerBall } from 'react-icons/gi';
import { MdOutlineCalendarMonth, MdOutlineStadium, MdSave, MdOutlineCancel } from 'react-icons/md';
import { FaPeopleGroup, FaLocationDot } from 'react-icons/fa6';
import { IoStar, IoStarOutline, IoChevronDown } from 'react-icons/io5';
import { LuMedal } from 'react-icons/lu';
import { IoCheckmarkDoneCircleSharp, IoClose } from "react-icons/io5";
import { MdError } from "react-icons/md";
import GameRulesEditor from '../components/GameRulesEditor';



const SHOES = ['IN (Indoor Futsal Boots)', 'TF (Turf Boots)', 'Sport Shoes', 'AG (Artificial Ground Boots)'];
const FORMATS = ['5v5', '6v6', '7v7'];

export default function ManagerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = usePersistedState('manager_tab', 'overview');
  const [fields, setFields] = useState([]);
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [sportsmanship, setSportsmanship] = useState({});
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingGame, setEditingGame] = useState(null);
  const [showEditGameModal, setShowEditGameModal] = useState(false);
  const [cancelingGame, setCancelingGame] = useState(null);
  const [cancelReason, setCancelReason] = useState('Rain');
  const [cancelling, setCancelling] = useState(false);
  const [expandedFeedbackGame, setExpandedFeedbackGame] = useState(null);

  const [gameForm, setGameForm] = useState({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '', court: '',
    description: '', game_rules: '', shoes_type: [], allow_pay_at_court: false
  });

  const [editGameForm, setEditGameForm] = useState({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '', court: '',
    description: '', game_rules: '', shoes_type: [], allow_pay_at_court: false
  });

  useEffect(() => {
    const cached = getCached('manager_data');
    if (cached) {
      setFields(cached.fields); setGames(cached.games); setPlayers(cached.players);
      setFeedback(cached.feedback || []); setSportsmanship(cached.sportsmanship || {});
      setLoading(false);
    }
    fetchAll(!!cached);
  }, []);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    const [fieldsData, gamesData, playersData] = await Promise.all([fetchFields(), fetchGames(), fetchPlayers()]);
    const { feedback: feedbackData, sportsmanship: sportsmanshipData } = await fetchFeedback();
    setCached('manager_data', {
      fields: fieldsData ?? [], games: gamesData ?? [], players: playersData ?? [],
      feedback: feedbackData, sportsmanship: sportsmanshipData,
    });
    setLoading(false);
  };

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*').order('name');
    if (data) setFields(data);
    return data ?? [];
  };

  const fetchGames = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('games')
      .select('*, fields(name)')
      .eq('created_by', currentUser?.id)
      .order('date', { ascending: true });
    if (data) setGames(data);
    return data ?? [];
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('username');
    if (data) setPlayers(data);
    return data ?? [];
  };

  const fetchFeedback = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: ownGames } = await supabase
      .from('games').select('id, title, date').eq('created_by', currentUser?.id)
      .order('date', { ascending: false });
    const gameIds = (ownGames || []).map(g => g.id);
    const gameTitleMap = {};
    (ownGames || []).forEach(g => { gameTitleMap[g.id] = g.title; });

    if (gameIds.length === 0) {
      setFeedback([]); setSportsmanship({});
      return { feedback: [], sportsmanship: {} };
    }

    const { data: feedbackRows } = await supabase
      .from('game_feedback').select('*').in('game_id', gameIds).order('created_at', { ascending: false });
    const { data: sportsmanshipRows } = await supabase
      .from('player_sportsmanship_ratings').select('game_id, rater_id, rated_id, rating, tags').in('game_id', gameIds);

    // Aggregated per game, not globally, so ratings can be shown alongside that
    // game's own feedback instead of as one combined all-time leaderboard.
    const aggByGame = {};
    (sportsmanshipRows || []).forEach(r => {
      if (!aggByGame[r.game_id]) aggByGame[r.game_id] = {};
      if (!aggByGame[r.game_id][r.rated_id]) aggByGame[r.game_id][r.rated_id] = { sum: 0, count: 0, tagCounts: {} };
      aggByGame[r.game_id][r.rated_id].sum += r.rating;
      aggByGame[r.game_id][r.rated_id].count += 1;
      (r.tags || []).forEach(tag => {
        aggByGame[r.game_id][r.rated_id].tagCounts[tag] = (aggByGame[r.game_id][r.rated_id].tagCounts[tag] || 0) + 1;
      });
    });

    const profileIds = [...new Set([
      ...(feedbackRows || []).map(f => f.user_id),
      ...(sportsmanshipRows || []).map(r => r.rated_id),
    ])];
    let profileMap = {};
    if (profileIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, name').in('id', profileIds);
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
    }

    const feedbackWithNames = (feedbackRows || []).map(f => ({
      ...f, gameTitle: gameTitleMap[f.game_id], userName: profileMap[f.user_id]?.name || 'Player',
    }));

    const sportsmanshipByGame = {};
    Object.entries(aggByGame).forEach(([gid, players]) => {
      sportsmanshipByGame[gid] = {
        gameTitle: gameTitleMap[gid],
        items: Object.entries(players)
          .map(([uid, { sum, count, tagCounts }]) => ({
            id: uid, name: profileMap[uid]?.name || 'Player', avg: sum / count, count,
            tags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]),
          }))
          .sort((a, b) => a.avg - b.avg),
      };
    });

    setFeedback(feedbackWithNames);
    setSportsmanship(sportsmanshipByGame);
    return { feedback: feedbackWithNames, sportsmanship: sportsmanshipByGame };
  };

  const showSuccess = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
  const showError = (msg) => { setError(msg); setSuccess(''); };

  const resetGameForm = () => setGameForm({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '', court: '',
    description: '', game_rules: '', shoes_type: [], allow_pay_at_court: false
  });

  const resetEditGameForm = () => setEditGameForm({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '', court: '',
    description: '', game_rules: '', shoes_type: [], allow_pay_at_court: false
  });

  // ── GAME HANDLERS ──
  const handleAddGame = async () => {
    if (!gameForm.title || !gameForm.field_id || !gameForm.date || !gameForm.time || !gameForm.price) {
      showError('Fill in all required game details.'); return;
    }
    const { error } = await supabase.from('games').insert({
      title: gameForm.title, field_id: gameForm.field_id, area: gameForm.area,
      format: gameForm.format, date: gameForm.date, time: gameForm.time,
      slots: parseInt(gameForm.slots), price: parseInt(gameForm.price),
      court: gameForm.court || null,
      description: gameForm.description, game_rules: gameForm.game_rules,
      shoes_type: gameForm.shoes_type.join(', '),
      allow_pay_at_court: gameForm.allow_pay_at_court,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) { showError(error.message); return; }
    showSuccess('Game added!'); resetGameForm(); clearCached('manager_data'); fetchGames();
  };

  const handleEditGame = (game) => {
    setEditingGame(game.id);
    setEditGameForm({
      title: game.title, field_id: game.field_id, area: game.area,
      format: game.format, date: game.date, time: game.time,
      slots: game.slots, price: game.price, court: game.court || '',
      description: game.description || '', game_rules: game.game_rules || '',
      shoes_type: game.shoes_type ? game.shoes_type.split(', ') : [],
      allow_pay_at_court: !!game.allow_pay_at_court,
    });
    setShowEditGameModal(true);
  };

  const handleUpdateGame = async () => {
    const f = editGameForm;
    if (!f.title?.trim() || !f.field_id || !f.date || !f.time || (f.price === '' || f.price == null)) {
      showError('Fill in all required game details.'); return;
    }
    const { data: updated, error } = await supabase.from('games').update({
      title: f.title, field_id: f.field_id, area: f.area,
      format: f.format, date: f.date, time: f.time,
      slots: parseInt(f.slots), price: parseInt(f.price),
      court: f.court || null,
      description: f.description, game_rules: f.game_rules,
      shoes_type: f.shoes_type.join(', '),
      allow_pay_at_court: f.allow_pay_at_court,
    }).eq('id', editingGame).select('*, fields(name)');
    if (error) { showError(error.message); return; }
    if (!updated || updated.length === 0) { showError('Update failed. No rows matched. Check Supabase RLS policies.'); return; }
    setGames(prev => prev.map(g => g.id === editingGame ? updated[0] : g));
    clearCached('manager_data');
    showSuccess('Game updated!'); setEditingGame(null); setShowEditGameModal(false); resetEditGameForm();
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Delete this game?')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) { showError(error.message); return; }
    showSuccess('Game deleted.'); clearCached('manager_data'); fetchGames();
  };

  const CANCEL_REASONS = ['Rain', 'Insufficient Players', 'Other'];

  const handleOpenCancelModal = async (game) => {
    const { count } = await supabase
      .from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', game.id);
    setCancelReason('Rain');
    setCancelingGame({ ...game, _playerCount: count || 0 });
  };

  const handleConfirmCancel = async () => {
    if (!cancelingGame) return;
    setCancelling(true);
    const refundedCount = await refundGamePlayers(cancelingGame.id, cancelingGame.title, cancelingGame.price, cancelReason);
    const { error } = await supabase.from('games').delete().eq('id', cancelingGame.id);
    setCancelling(false);
    if (error) { showError(error.message); return; }
    showSuccess(`Game cancelled. ${refundedCount} player${refundedCount !== 1 ? 's' : ''} refunded.`);
    setCancelingGame(null);
    clearCached('manager_data'); fetchGames();
  };

  const isUpcoming = (g) => {
    const now = new Date();
    const [year, month, day] = g.date.split('-').map(Number);
    const [hour, minute] = (g.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
    return now < gameStart;
  };
  const upcomingGames = games.filter(g => isUpcoming(g));
  const pastGames = games.filter(g => !isUpcoming(g)).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const todayMYT = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const labelStyle = { fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block' };
  const sectionCard = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 };

  const renderGameForm = (isEdit, form, setForm) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>GAME TITLE *</label>
        <input placeholder="e.g. Evening Kickoff" value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label style={labelStyle}>FIELD *</label>
        <select value={form.field_id} onChange={e => {
          const selected = fields.find(f => f.id === e.target.value);
          setForm({ ...form, field_id: e.target.value, area: selected?.area || '' });
        }}>
          <option value="">Select a field...</option>
          {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.area})</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>FORMAT *</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {FORMATS.map(f => (
            <button key={f} onClick={() => setForm({ ...form, format: f })} style={{
              background: form.format === f ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
              color: form.format === f ? 'var(--accent)' : 'var(--muted)',
              border: `1px solid ${form.format === f ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 24px', fontSize: 13, fontWeight: 600
            }}>{f}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DATE *</label>
          <input type="date" value={form.date} min={todayMYT} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>TIME *</label>
          <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>TOTAL SLOTS *</label>
          <input type="number" value={form.slots} onChange={e => setForm({ ...form, slots: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>PRICE (RM) *</label>
          <input type="number" placeholder="e.g. 15" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        </div>
      </div>
      <div
        onClick={() => setForm({ ...form, allow_pay_at_court: !form.allow_pay_at_court })}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          background: form.allow_pay_at_court ? 'rgba(240,157,81,0.08)' : 'var(--card2)',
          border: `1px solid ${form.allow_pay_at_court ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10, padding: '10px 14px'
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          background: form.allow_pay_at_court ? 'var(--accent)' : 'transparent',
          border: `2px solid ${form.allow_pay_at_court ? 'var(--accent)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff'
        }}>{form.allow_pay_at_court && '✓'}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Allow Pay at Court</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Players can book a slot and pay cash/QR at the venue instead of via wallet.</div>
        </div>
      </div>
      <div>
        <label style={labelStyle}>COURT / PITCH (only if venue has more than one)</label>
        <input placeholder="e.g. Court 2 (leave blank if there's only one court)" value={form.court}
          onChange={e => setForm({ ...form, court: e.target.value })} />
      </div>
      <div>
        <label style={labelStyle}>MATCH DESCRIPTION</label>
        <textarea placeholder="Tell players what to expect..." value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
      </div>
      <GameRulesEditor
        value={form.game_rules}
        format={form.format}
        onChange={val => setForm({ ...form, game_rules: val })}
      />
      <div>
        <label style={labelStyle}>SHOES TYPE</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SHOES.map(s => (
            <button key={s} onClick={() => {
              const current = form.shoes_type;
              setForm({ ...form, shoes_type: current.includes(s) ? current.filter(x => x !== s) : [...current, s] });
            }} style={{
              background: form.shoes_type.includes(s) ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
              color: form.shoes_type.includes(s) ? 'var(--accent)' : 'var(--muted)',
              border: `1px solid ${form.shoes_type.includes(s) ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500
            }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={isEdit ? handleUpdateGame : handleAddGame} style={{
          flex: 1, padding: '12px', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
        }}>{isEdit ? <><MdSave size={15} />Save Changes</> : '+ Add Game'}</button>
        {isEdit && (
          <button onClick={() => { setEditingGame(null); setShowEditGameModal(false); resetEditGameForm(); }} style={{
            flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 10, fontSize: 14
          }}>Cancel</button>
        )}
      </div>
    </div>
  );

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'games',    label: 'Games'    },
    { key: 'feedback', label: 'Feedback' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
              MANAGER DASHBOARD
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Create games and rate players</p>
          </div>
          <button onClick={() => navigate('/home')} style={{
            background: 'transparent', color: 'var(--text)',
            border: '1px solid var(--muted)', borderRadius: 8,
            padding: '8px 16px', fontSize: 13
          }}>← Back to Home</button>
        </div>

        {/* Messages */}
        {success && (
          <div style={{ background: 'rgba(240,157,81,0.12)', border: '1px solid rgba(240,157,81,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            <IoCheckmarkDoneCircleSharp />{success}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
            <MdError /> {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--card)',
              color: activeTab === tab.key ? '#fff' : 'var(--muted)',
              border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Fields',    val: fields.length,         icon: <MdOutlineStadium/> },
                { label: 'Total Games',     val: games.length,          icon: <GiSoccerBall/> },
                { label: 'Upcoming Games',  val: upcomingGames.length,  icon: <MdOutlineCalendarMonth/> },
                { label: 'Total Players',   val: players.length,        icon: <FaPeopleGroup/> },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--accent)', letterSpacing: 1 }}>{s.val}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent games */}
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>UPCOMING GAMES</h3>
              {upcomingGames.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No upcoming games.</div>
              ) : upcomingGames.slice(0, 5).map((game, i) => (
                <div key={game.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: i < Math.min(upcomingGames.length, 5) - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{game.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><FaLocationDot size={11} />{game.fields?.name} · <MdOutlineCalendarMonth size={12} />{game.date} · {game.format}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => navigate(`/game/${game.id}/rate`)} style={{
                      background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600
                    }}><LuMedal /> Rate</button>
                    <button onClick={() => handleEditGame(game)} style={{
                      background: 'var(--card2)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12
                    }}>Edit</button>
                    <button onClick={() => navigate(`/game/${game.id}`)} style={{
                      background: 'var(--card2)', color: 'var(--muted)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12
                    }}>View</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Past Games */}
            <div style={{ ...sectionCard, marginTop: 16 }}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>
                PAST GAMES
                <span style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)', fontWeight: 400, letterSpacing: 1, marginLeft: 10 }}>
                  {pastGames.length} game{pastGames.length !== 1 ? 's' : ''}
                </span>
              </h3>
              {pastGames.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No past games yet.</div>
              ) : pastGames.slice(0, 10).map((game, i) => (
                <div key={game.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: i < Math.min(pastGames.length, 10) - 1 ? '1px solid var(--border)' : 'none',
                  opacity: 0.7
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{game.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      <FaLocationDot size={11} />{game.fields?.name} · <MdOutlineCalendarMonth size={12} />{game.date} · {game.time} · {game.format}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.2)', borderRadius: 6,
                      padding: '3px 10px', fontSize: 11, fontFamily: "'Space Mono'", fontWeight: 700
                    }}>ENDED</span>
                    <button onClick={() => navigate(`/game/${game.id}/rate`)} style={{
                      background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}><LuMedal /> Rate</button>
                    <button onClick={() => navigate(`/game/${game.id}`)} style={{
                      background: 'var(--card2)', color: 'var(--muted)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, cursor: 'pointer'
                    }}>View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GAMES TAB ── */}
        {activeTab === 'games' && (
          <div>
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 20 }}>
                ADD NEW GAME
              </h3>
              {renderGameForm(false, gameForm, setGameForm)}
            </div>

            {/* Games list */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                All Games ({games.length})
              </div>
              {games.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No games yet.</div>
              ) : games.map((game, i) => (
                <div key={game.id}
                  onClick={() => navigate(`/manager/game/${game.id}/players`)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < games.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,157,81,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{game.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><FaLocationDot size={11} />{game.fields?.name} · <MdOutlineCalendarMonth size={12} />{game.date} · {game.format}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'Space Mono'", marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      RM {game.price} · {game.slots} slots
                      {game.allow_pay_at_court && (
                        <span style={{
                          background: 'rgba(74,222,128,0.1)', color: '#4ade80',
                          border: '1px solid rgba(74,222,128,0.3)', borderRadius: 5,
                          padding: '1px 7px', fontSize: 10, fontWeight: 700
                        }}>CASH/QR OK</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/game/${game.id}/rate`)} style={{
                      background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
                      padding: '5px 10px', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><LuMedal size={14} /></button>
                    <button onClick={() => handleEditGame(game)} style={{
                      background: 'var(--card2)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12
                    }}>Edit</button>
                    <button onClick={() => handleOpenCancelModal(game)} style={{
                      background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
                      padding: '5px 10px', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><MdOutlineCancel size={14} /></button>
                    <button onClick={() => handleDeleteGame(game.id)} style={{
                      background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FEEDBACK TAB ── */}
        {activeTab === 'feedback' && (() => {
          // Group both venue feedback and sportsmanship ratings by game, so a manager
          // opens one game and sees everything for it together, instead of one flat
          // feedback list plus a separate all-time sportsmanship leaderboard.
          const feedbackByGame = {};
          feedback.forEach(f => {
            if (!feedbackByGame[f.game_id]) feedbackByGame[f.game_id] = { gameTitle: f.gameTitle, items: [] };
            feedbackByGame[f.game_id].items.push(f);
          });

          const gameOrder = [...new Set([...Object.keys(feedbackByGame), ...Object.keys(sportsmanship)])];
          const totalFeedback = feedback.length;

          return (
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                Game & Venue Feedback ({totalFeedback})
              </div>
              {gameOrder.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No feedback or ratings submitted yet.</div>
              ) : gameOrder.map((gid, gi) => {
                const feedbackGroup = feedbackByGame[gid];
                const sportsmanshipEntry = sportsmanship[gid];
                const sportsmanshipGroup = sportsmanshipEntry?.items || [];
                const gameTitle = feedbackGroup?.gameTitle || sportsmanshipEntry?.gameTitle || 'Game';
                const isExpanded = expandedFeedbackGame === gid;
                const avgRating = feedbackGroup
                  ? feedbackGroup.items.reduce((sum, f) => sum + (f.venue_rating || 0), 0) / feedbackGroup.items.length
                  : null;
                return (
                  <div key={gid} style={{ borderBottom: gi < gameOrder.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div
                      onClick={() => setExpandedFeedbackGame(isExpanded ? null : gid)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                        padding: '14px 20px', cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{gameTitle}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {avgRating != null && (
                          <div style={{ display: 'flex', gap: 1 }}>
                            {[1, 2, 3, 4, 5].map(n => n <= Math.round(avgRating)
                              ? <IoStar key={n} size={13} color="var(--accent)" />
                              : <IoStarOutline key={n} size={13} color="var(--muted)" />)}
                          </div>
                        )}
                        {feedbackGroup && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{feedbackGroup.items.length} review{feedbackGroup.items.length !== 1 ? 's' : ''}</span>}
                        {sportsmanshipGroup.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sportsmanshipGroup.length} rated</span>}
                        <IoChevronDown size={14} style={{
                          color: 'var(--muted)',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ background: 'var(--card2)', borderTop: '1px solid var(--border)' }}>
                        {feedbackGroup && feedbackGroup.items.map((f, i) => (
                          <div key={f.id} style={{
                            padding: '10px 20px',
                            borderBottom: (i < feedbackGroup.items.length - 1 || sportsmanshipGroup.length > 0) ? '1px solid var(--border)' : 'none',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.userName}</div>
                              <div style={{ display: 'flex', gap: 1 }}>
                                {[1, 2, 3, 4, 5].map(n => n <= f.venue_rating
                                  ? <IoStar key={n} size={12} color="var(--accent)" />
                                  : <IoStarOutline key={n} size={12} color="var(--muted)" />)}
                              </div>
                            </div>
                            {f.venue_comment && (
                              <div style={{ fontSize: 13, color: 'var(--text)', opacity: 0.85 }}>{f.venue_comment}</div>
                            )}
                          </div>
                        ))}
                        {sportsmanshipGroup.length > 0 && (
                          <div style={{ padding: '10px 20px 4px' }}>
                            <div style={{ fontSize: 11, letterSpacing: 1, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Sportsmanship</div>
                            {sportsmanshipGroup.map((s, i) => (
                              <div key={s.id} style={{
                                padding: '8px 0',
                                borderBottom: i < sportsmanshipGroup.length - 1 ? '1px solid var(--border)' : 'none',
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: s.avg < 3 ? 'var(--red)' : 'var(--accent)' }}>{s.avg.toFixed(1)}</span>
                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>({s.count} rating{s.count !== 1 ? 's' : ''})</span>
                                  </div>
                                </div>
                                {s.tags.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                    {s.tags.map(([tag, count]) => (
                                      <span key={tag} style={{
                                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                                        background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                                        border: '1px solid rgba(240,157,81,0.25)',
                                      }}>{tag}{count > 1 ? ` ×${count}` : ''}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* Field Request CTA */}
        <div style={{ ...sectionCard, marginTop: 24, textAlign: 'center' }}>
          <MdOutlineStadium size={28} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
            No field or pitch you can manage?
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Request now and Bolahh will work on bringing your pitch to Bolahh.
          </div>
          <a
            href="https://forms.gle/sAyHSnWnHRfPNZvt5"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '10px 24px',
              fontSize: 13, fontWeight: 700, textDecoration: 'none'
            }}
          >
            Request Now
          </a>
        </div>

      </div>

      {/* ── EDIT GAME MODAL ── */}
      {showEditGameModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowEditGameModal(false); setEditingGame(null); resetEditGameForm(); } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>EDIT GAME</h3>
              <button
                onClick={() => { setShowEditGameModal(false); setEditingGame(null); resetEditGameForm(); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              ><IoClose size={18} /></button>
            </div>
            {renderGameForm(true, editGameForm, setEditGameForm)}
          </div>
        </div>
      )}

      {/* ── CANCEL GAME MODAL ── */}
      {cancelingGame && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !cancelling) setCancelingGame(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>CANCEL GAME</h3>
              <button
                onClick={() => !cancelling && setCancelingGame(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              ><IoClose size={18} /></button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              {cancelingGame.title} · {cancelingGame._playerCount} player{cancelingGame._playerCount !== 1 ? 's' : ''} joined
            </p>

            <label style={labelStyle}>REASON</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {CANCEL_REASONS.map(r => (
                <button key={r} type="button" onClick={() => setCancelReason(r)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: cancelReason === r ? 'var(--accent)' : 'var(--card2)',
                  color: cancelReason === r ? '#fff' : 'var(--muted)',
                  border: `1px solid ${cancelReason === r ? 'var(--accent)' : 'var(--border)'}`,
                }}>{r}</button>
              ))}
            </div>

            {cancelingGame._playerCount > 0 && (
              <div style={{
                background: 'rgba(240,157,81,0.08)', border: '1px solid rgba(240,157,81,0.25)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                fontSize: 13, color: 'var(--accent)', lineHeight: 1.6,
              }}>
                All {cancelingGame._playerCount} player{cancelingGame._playerCount !== 1 ? 's' : ''} will be refunded RM {Number(cancelingGame.price).toFixed(2)} each
                (RM {(cancelingGame._playerCount * cancelingGame.price).toFixed(2)} total) to their wallets.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCancelingGame(null)}
                disabled={cancelling}
                style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14 }}
              >Back</button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                style={{ flex: 2, padding: '12px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, opacity: cancelling ? 0.6 : 1 }}
              >{cancelling ? 'Cancelling...' : 'Confirm Cancel & Refund'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
