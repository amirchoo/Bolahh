import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached, clearCached } from '../lib/dataCache';
import { usePersistedState } from '../lib/usePersistedState';
import { GiSoccerBall } from 'react-icons/gi';
import { MdOutlineCalendarMonth, MdOutlineStadium, MdSave } from 'react-icons/md';
import { FaPeopleGroup, FaLocationDot } from 'react-icons/fa6';
import { LuMedal } from 'react-icons/lu';
import { IoCheckmarkDoneCircleSharp, IoClose } from "react-icons/io5";
import { MdError } from "react-icons/md";



const SHOES = ['IN (Indoor Futsal Boots)', 'TF (Turf Boots)', 'Sport Shoes', 'AG (Artificial Ground Boots)'];
const FORMATS = ['5v5', '6v6', '7v7'];

export default function ManagerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = usePersistedState('manager_tab', 'overview');
  const [fields, setFields] = useState([]);
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingGame, setEditingGame] = useState(null);
  const [showEditGameModal, setShowEditGameModal] = useState(false);

  const [gameForm, setGameForm] = useState({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '',
    description: '', game_rules: '', shoes_type: []
  });

  const [editGameForm, setEditGameForm] = useState({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '',
    description: '', game_rules: '', shoes_type: []
  });

  useEffect(() => {
    const cached = getCached('manager_data');
    if (cached) {
      setFields(cached.fields); setGames(cached.games); setPlayers(cached.players);
      setLoading(false);
    }
    fetchAll(!!cached);
  }, []);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    const [fieldsData, gamesData, playersData] = await Promise.all([fetchFields(), fetchGames(), fetchPlayers()]);
    setCached('manager_data', { fields: fieldsData ?? [], games: gamesData ?? [], players: playersData ?? [] });
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

  const showSuccess = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
  const showError = (msg) => { setError(msg); setSuccess(''); };

  const resetGameForm = () => setGameForm({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '',
    description: '', game_rules: '', shoes_type: []
  });

  const resetEditGameForm = () => setEditGameForm({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '',
    description: '', game_rules: '', shoes_type: []
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
      description: gameForm.description, game_rules: gameForm.game_rules,
      shoes_type: gameForm.shoes_type.join(', '),
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
      slots: game.slots, price: game.price,
      description: game.description || '', game_rules: game.game_rules || '',
      shoes_type: game.shoes_type ? game.shoes_type.split(', ') : [],
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
      description: f.description, game_rules: f.game_rules,
      shoes_type: f.shoes_type.join(', '),
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
      <div>
        <label style={labelStyle}>MATCH DESCRIPTION</label>
        <textarea placeholder="Tell players what to expect..." value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div>
        <label style={labelStyle}>GAME RULES</label>
        <textarea placeholder="e.g. No sliding tackles..." value={form.game_rules}
          onChange={e => setForm({ ...form, game_rules: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
      </div>
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
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

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
                <div key={game.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < games.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{game.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><FaLocationDot size={11} />{game.fields?.name} · <MdOutlineCalendarMonth size={12} />{game.date} · {game.format}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'Space Mono'", marginTop: 2 }}>RM {game.price} · {game.slots} slots</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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

    </div>
  );
}
