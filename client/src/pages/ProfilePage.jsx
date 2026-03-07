import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getRank, getRankColor, getCardBudget, MAX_POINTS } from '../lib/rankUtils';
import { IconFriends, IconUpcoming, IconLoading } from '../components/Icons';
import { RiTeamLine } from 'react-icons/ri';

const POSITIONS = ['Attacker', 'Midfielder', 'Defender', 'Goalkeeper'];
const POSITION_ABBR = { 'Attacker': 'AT', 'Midfielder': 'MF', 'Defender': 'DF', 'Goalkeeper': 'GK' };

const STATS = [
  { key: 'pac', label: 'PAC' },
  { key: 'sho', label: 'SHO' },
  { key: 'pas', label: 'PAS' },
  { key: 'dri', label: 'DRI' },
  { key: 'def', label: 'DEF' },
  { key: 'phy', label: 'PHY' },
];

// Card theme per tier
function getCardTheme(rank) {
  if (rank.startsWith('Emas'))   return {
    bg: 'linear-gradient(145deg, #b8860b, #ffd700, #b8860b)',
    border: '#ffd700', text: '#3a2a00', muted: '#6b4e00', statBg: 'rgba(0,0,0,0.2)'
  };
  if (rank.startsWith('Perak'))  return {
    bg: 'linear-gradient(145deg, #6e7275, #c0c0c0, #6e7275)',
    border: '#c0c0c0', text: '#1a1a1a', muted: '#444', statBg: 'rgba(0,0,0,0.2)'
  };
  if (rank.startsWith('Gangsa')) return {
    bg: 'linear-gradient(145deg, #7c4a1a, #cd7f32, #7c4a1a)',
    border: '#cd7f32', text: '#2a1400', muted: '#5a3010', statBg: 'rgba(0,0,0,0.2)'
  };
  return {
    bg: 'linear-gradient(145deg, #2a2d30, #3d4144, #2a2d30)',
    border: '#555', text: '#e8e9eb', muted: '#aaa', statBg: 'rgba(255,255,255,0.1)'
  };
}


// When a player loses points, randomly drop stats proportionally
function autoDropStats(currentStats, oldPoints, newPoints) {
  if (newPoints >= oldPoints) return currentStats;
  const totalUsed = Object.values(currentStats).reduce((a, b) => a + b, 0);
  if (totalUsed === 0) return currentStats;
  const ratio = Math.max(0, newPoints / oldPoints);
  const targetTotal = Math.floor(totalUsed * ratio);
  let excess = totalUsed - targetTotal;
  if (excess <= 0) return currentStats;
  const keys = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
  const newStats = { ...currentStats };
  // Randomly reduce stats until excess is gone
  let attempts = 0;
  while (excess > 0 && attempts < 200) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    if (newStats[key] > 0) {
      const drop = Math.min(newStats[key], Math.ceil(Math.random() * excess));
      newStats[key] -= drop;
      excess -= drop;
    }
    attempts++;
  }
  return newStats;
}

function calcOverall(stats) {
  const vals = STATS.map(s => stats[s.key] || 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round(sum / 6);
}

function FifaCard({ profile, cardStats, rank, size = 'normal', onAvatarClick }) {
  const theme = getCardTheme(rank);
  const overall = calcOverall(cardStats);
  const color = getRankColor(rank);
  const isSmall = size === 'small';
  const w = isSmall ? 140 : 220;
  const h = isSmall ? 210 : 330;
  const scale = isSmall ? 0.64 : 1;

  return (
    <div style={{
      width: w, height: h, borderRadius: isSmall ? 10 : 16,
      background: theme.bg,
      border: `2px solid ${theme.border}`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      fontFamily: "'DM Sans'",
    }}>
      {/* Shine overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)',
        pointerEvents: 'none', zIndex: 2
      }} />

      {/* Top info row */}
      <div style={{ position: 'absolute', top: isSmall ? 8 : 12, left: isSmall ? 8 : 14, zIndex: 3 }}>
        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: isSmall ? 28 : 44,
          color: theme.text, lineHeight: 1, letterSpacing: 1
        }}>{overall}</div>
        <div style={{
          fontFamily: "'Space Mono'", fontSize: isSmall ? 7 : 11,
          color: theme.text, fontWeight: 700, letterSpacing: 1, marginTop: isSmall ? 1 : 2
        }}>{POSITION_ABBR[profile?.position] || profile?.position || 'POS'}</div>

      </div>

      {/* Rank badge top right */}
      <div style={{ position: 'absolute', top: isSmall ? 8 : 12, right: isSmall ? 8 : 12, zIndex: 3 }}>
        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: isSmall ? 7 : 10,
          color: theme.muted, letterSpacing: 1, textAlign: 'right'
        }}>{rank}</div>
      </div>

      {/* Avatar */}
      <div
        onClick={!isSmall && onAvatarClick ? onAvatarClick : undefined}
        style={{
          position: 'absolute',
          top: isSmall ? 28 : 44,
          left: '50%', transform: 'translateX(-50%)',
          width: isSmall ? 68 : 108, height: isSmall ? 68 : 108,
          borderRadius: '50%', overflow: 'hidden',
          border: `${isSmall ? 2 : 3}px solid ${theme.border}`,
          background: theme.statBg, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: !isSmall && onAvatarClick ? 'pointer' : 'default',
        }}
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 18 : 28, fontWeight: 700, color: theme.text }}>
              {(profile?.name?.[0] || '?').toUpperCase()}
            </span>
        }
        {/* Camera overlay on hover — only on normal size */}
        {!isSmall && onAvatarClick && (
          <div className="avatar-hover-overlay" style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, opacity: 0, transition: 'opacity 0.2s',
          }}>📷</div>
        )}
      </div>

      {/* Name */}
      <div style={{
        position: 'absolute',
        top: isSmall ? 102 : 160,
        left: 0, right: 0, textAlign: 'center', zIndex: 3,
        fontFamily: "'Bebas Neue'", fontSize: isSmall ? 11 : 17,
        color: theme.text, letterSpacing: 1.5,
        padding: `0 ${isSmall ? 4 : 8}px`,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>
        {profile?.name || 'PLAYER'}
      </div>

      {/* Divider */}
      <div style={{
        position: 'absolute',
        top: isSmall ? 116 : 182,
        left: isSmall ? 10 : 16, right: isSmall ? 10 : 16,
        height: 1, background: `${theme.border}55`, zIndex: 3
      }} />

      {/* Stats grid */}
      <div style={{
        position: 'absolute',
        top: isSmall ? 120 : 190,
        left: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: isSmall ? 2 : 4, zIndex: 3
      }}>
        {STATS.map(s => (
          <div key={s.key} style={{
            background: theme.statBg, borderRadius: isSmall ? 3 : 5,
            padding: isSmall ? '2px 2px' : '4px 4px',
            textAlign: 'center'
          }}>
            <div style={{
              fontFamily: "'Space Mono'", fontSize: isSmall ? 9 : 14,
              fontWeight: 700, color: theme.text, lineHeight: 1
            }}>{cardStats[s.key] || 0}</div>
            <div style={{
              fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8,
              color: theme.muted, letterSpacing: 0.5, marginTop: 1
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Games + pts row */}
      <div style={{
        position: 'absolute',
        bottom: isSmall ? 5 : 8,
        left: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
        display: 'flex', justifyContent: 'space-between', zIndex: 3,
        borderTop: `1px solid ${theme.border}55`, paddingTop: isSmall ? 3 : 5
      }}>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted, textAlign: 'center' }}>
          <span style={{ fontWeight: 700, color: theme.text }}>{profile?.games_played || 0}</span> GAMES PLAYED
        </div>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted, textAlign: 'center' }}>
          <span style={{ fontWeight: 700, color: theme.text }}>{profile?.total_points || 0}</span> POINTS
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', position: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Card state
  const [cardStats, setCardStats] = useState({ pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 });
  const [draftStats, setDraftStats] = useState({ pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 });
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    if (user) { fetchProfile(); fetchGames(); }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles').select('*, wallet_balance').eq('id', user.id).single();
    if (error || !data) {
      const username = user.user_metadata?.username || '';
      const position = user.user_metadata?.position || '';
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({ id: user.id, name: username, position, is_admin: false })
        .select().single();
      if (newProfile) {
        setProfile(newProfile);
        setWalletBalance(newProfile?.wallet_balance || 0);
        setForm({ name: newProfile.name || '', position: newProfile.position || '' });
        fetchCard(newProfile.total_points || 0);
      }
    } else {
      if (!data.name && user.user_metadata?.username) {
        const username = user.user_metadata.username;
        const position = user.user_metadata?.position || data.position || '';
        await supabase.from('profiles').update({ name: username, position }).eq('id', user.id);
        setProfile({ ...data, name: username, position });
        setWalletBalance(data?.wallet_balance || 0);
        setForm({ name: username, position });
        fetchCard(data.total_points || 0);
      } else {
        setProfile(data);
        setWalletBalance(data?.wallet_balance || 0);
        setForm({ name: data.name || '', position: data.position || '' });
        fetchCard(data.total_points || 0);
      }
    }
    setLoading(false);
  };

  const fetchCard = async (pts) => {
    const { data } = await supabase
      .from('player_cards')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const loaded = { pac: data.pac, sho: data.sho, pas: data.pas, dri: data.dri, def: data.def, phy: data.phy };
      const budget = Math.max(30, pts || 0);
      const totalUsed = Object.values(loaded).reduce((a, b) => a + b, 0);
      // If total used exceeds current budget, auto-drop
      const adjusted = totalUsed > budget
        ? autoDropStats(loaded, totalUsed, budget)
        : loaded;
      setCardStats(adjusted);
      setDraftStats(adjusted);
      // Save adjusted stats back if they changed
      if (totalUsed > budget) {
        await supabase.from('player_cards').upsert({
          user_id: user.id, ...adjusted, overall: calcOverall(adjusted)
        });
      }
    }
  };

  const fetchGames = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: playerData, error: playerError } = await supabase
      .from('game_players').select('id, game_id').eq('user_id', user.id);
    if (playerError || !playerData || playerData.length === 0) return;
    const gameIds = playerData.map(p => p.game_id);
    const { data: gamesData, error: gamesError } = await supabase
      .from('games').select('id, title, area, date, time, format, price, fields(name)').in('id', gameIds);
    if (gamesError || !gamesData) return;
    const merged = playerData.map(p => ({
      id: p.id,
      games: gamesData.find(g => g.id === p.game_id) || null
    })).filter(e => e.games !== null);
    const now = new Date();
    const isUpcoming = (g) => {
      const [year, month, day] = g.date.split('-').map(Number);
      const [hour, minute] = (g.time || '00:00').split(':').map(Number);
      // Malaysia UTC+8
      const gameStart = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
      return now < gameStart;
    };
    setUpcomingGames(merged.filter(e => isUpcoming(e.games)).sort((a, b) => a.games.date.localeCompare(b.games.date) || a.games.time.localeCompare(b.games.time)));
    setRecentGames(merged.filter(e => !isUpcoming(e.games)).sort((a, b) => b.games.date.localeCompare(a.games.date) || b.games.time.localeCompare(a.games.time)));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) { setSaveMsg('Failed to upload image.'); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    if (!updateError) setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));
    setUploadingAvatar(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveMsg('Username cannot be empty.'); return; }
    setSaving(true); setSaveMsg('');
    const { error } = await supabase.from('profiles').upsert({ id: user.id, name: form.name.trim(), position: form.position });
    if (error) { setSaveMsg('Failed to save. Try again.'); }
    else { setProfile({ ...profile, name: form.name.trim(), position: form.position }); setEditing(false); }
    setSaving(false);
  };

  const handleSaveCard = async () => {
    setSavingCard(true);
    const budget = Math.max(29, profile?.total_points || 0);
    const used = Object.values(draftStats).reduce((a, b) => a + b, 0);
    if (used > budget) { setSavingCard(false); return; }

    const payload = {
      user_id: user.id,
      pac: draftStats.pac, sho: draftStats.sho, pas: draftStats.pas,
      dri: draftStats.dri, def: draftStats.def, phy: draftStats.phy,
      overall: calcOverall(draftStats),
    };

    // Check if row exists — use update if yes, insert if no
    const { data: existing } = await supabase
      .from('player_cards').select('id').eq('user_id', user.id).maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase.from('player_cards').update(payload).eq('user_id', user.id));
    } else {
      ({ error } = await supabase.from('player_cards').insert(payload));
    }

    if (error) {
      console.error('Card save error:', error.message, error.details);
      setSavingCard(false);
      return;
    }

    setCardStats({...draftStats});
    setSavingCard(false);
    setShowCardEditor(false);
  };

  const handleCancelCard = () => {
    setDraftStats({...cardStats}); // restore original
    setShowCardEditor(false);
  };



  const getInitials = (name) => {
    if (!name || name.trim() === '') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const daysUntil = (dateStr, timeStr) => {
    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = (timeStr || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
    const diff = Math.round((gameStart - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today!';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}><IconLoading size={16} /></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const rank = getRank(profile?.total_points || 0, profile?.games_played || 0);
  const rankColor = getRankColor(rank);
  const budget = Math.max(30, profile?.total_points || 0);
  const usedBudget = Object.values(cardStats).reduce((a, b) => a + b, 0);
  const remaining = budget - usedBudget;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <style>{`
        @media (max-width: 480px) {
          .profile-header { flex-direction: column !important; align-items: center !important; text-align: center !important; }
          .profile-header .edit-btn { margin-top: 12px; width: 100%; }
          .profile-info { align-items: center !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .card-editor-grid { grid-template-columns: 1fr !important; }
        }
        .avatar-hover-overlay { pointer-events: none; }
        div:hover > .avatar-hover-overlay { opacity: 1 !important; }
      `}</style>

      {/* Card Editor Modal */}
      {showCardEditor && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16
        }} onClick={e => e.target === e.currentTarget && setShowCardEditor(false)}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 2, color: 'var(--text)' }}>EDIT CARD</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Budget: <span style={{ color: (budget - Object.values(draftStats).reduce((a,b)=>a+b,0)) < 10 ? 'var(--red)' : 'var(--accent)', fontWeight: 700 }}>{budget - Object.values(draftStats).reduce((a,b)=>a+b,0)} pts remaining</span> / {budget} (max {MAX_POINTS})
                </div>
              </div>
              {/* Live preview */}
              <FifaCard profile={profile} cardStats={draftStats} rank={rank} size="small" />
            </div>

            {/* Budget bar */}
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.2s',
                width: `${Math.min(100, (Object.values(draftStats).reduce((a,b)=>a+b,0) / budget) * 100)}%`,
                background: remaining < 10 ? 'var(--red)' : 'var(--accent)'
              }} />
            </div>

            {/* Stat adjusters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <style>{`
                .stat-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 10px; border-radius: 5px; outline: none; cursor: pointer; background: var(--border); touch-action: none; }
                .stat-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 10px; height: 28px; border-radius: 3px; background: var(--text); cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
                .stat-slider::-moz-range-thumb { width: 10px; height: 28px; border-radius: 3px; background: var(--text); cursor: pointer; border: none; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
                .stat-slider:disabled { opacity: 0.35; cursor: not-allowed; }
              `}</style>
              {STATS.map(s => {
                const val = draftStats[s.key] || 0;
                const statColor = val >= 80 ? '#4ade80' : val >= 60 ? 'var(--accent)' : 'var(--tomato)';
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: "'Space Mono'", fontSize: 12, fontWeight: 700, color: 'var(--muted)', width: 32 }}>{s.label}</div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="range" min={0} max={99} value={val}
                        className="stat-slider"
                        style={{ background: `linear-gradient(to right, ${statColor} ${val}%, var(--border) ${val}%)` }}
                        onChange={e => {
                          const newVal = parseInt(e.target.value);
                          const budget = Math.max(29, profile?.total_points || 0);
                          const otherUsed = Object.values(draftStats).reduce((a, b) => a + b, 0) - val;
                          const capped = Math.min(newVal, budget - otherUsed);
                          setDraftStats(prev => ({ ...prev, [s.key]: Math.max(0, capped) }));
                        }}
                      />
                    </div>
                    <div style={{ fontFamily: "'Space Mono'", fontSize: 14, fontWeight: 700, color: statColor, width: 28, textAlign: 'center' }}>{val}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, textAlign: 'center' }}>
              Max per stat: 99 · Your rank ({rank}) gives you {budget} max total points to distribute
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={handleSaveCard} disabled={savingCard} style={{
                flex: 2, padding: '12px', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, opacity: savingCard ? 0.6 : 1
              }}>{savingCard ? 'Saving...' : 'Save Card'}</button>
              <button type="button" onClick={handleCancelCard} style={{
                flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10, fontSize: 14
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <h2 className="fade-up" style={{
          fontFamily: "'Bebas Neue'", fontSize: 32,
          letterSpacing: 3, marginBottom: 20, color: 'var(--text)'
        }}>MY PROFILE</h2>

        {/* FIFA Card section */}
        <div className="fade-up" style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          marginBottom: 20, position: 'relative'
        }}>
          <FifaCard profile={profile} cardStats={cardStats} rank={rank} size="normal" onAvatarClick={() => fileInputRef.current?.click()} />
          {/* Edit icon button — always shown */}
          <button type="button" onClick={() => { setDraftStats({...cardStats}); setShowCardEditor(true); }} style={{
            position: 'absolute', bottom: 8, right: 'calc(50% - 118px)',
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }} title="Edit card stats">✎</button>
        </div>

        {/* Action row — edit profile + friends */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: 'center' }}>
          <button onClick={() => setEditing(!editing)} disabled={saving} style={{
            background: editing ? 'var(--accent)' : 'transparent',
            color: editing ? '#fff' : 'var(--accent)',
            border: '1.5px solid var(--accent)', borderRadius: 10, padding: '8px 24px',
            fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving...' : editing ? 'Cancel Edit' : 'Edit Profile'}</button>
          <button onClick={() => navigate('/friends')} style={{
            background: 'transparent', color: 'var(--accent)',
            border: '1.5px solid var(--accent)', borderRadius: 10,
            padding: '8px 24px', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}><RiTeamLine size={14} /> Friends</button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />

        {/* Edit form */}
        {editing && (
          <div className="fade-up-2" style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px', marginBottom: 16
          }}>
            {saveMsg && (
              <div style={{ marginBottom: 14, background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8, padding: '8px 14px', color: 'var(--red)', fontSize: 13 }}>
                {saveMsg}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block' }}>USERNAME</label>
              <input placeholder="e.g. hazif77" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 10, display: 'block' }}>POSITION</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {POSITIONS.map(p => (
                  <button key={p} onClick={() => setForm({ ...form, position: form.position === p ? '' : p })} style={{
                    background: form.position === p ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: form.position === p ? 'var(--accent)' : 'var(--text)',
                    border: `1px solid ${form.position === p ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={() => { setEditing(false); setSaveMsg(''); setForm({ name: profile?.name || '', position: profile?.position || '' }); }} style={{ flex: 1, padding: '10px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="fade-up-3 stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Games Joined', val: upcomingGames.length + recentGames.length },
            { label: 'Member Since', val: new Date(user?.created_at).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }) },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--accent)', letterSpacing: 1 }}>{s.val}</div>
              <div style={{ color: 'var(--text)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Wallet */}
        <div className="fade-up-3" style={{
          background: 'linear-gradient(135deg, #1c1e21, #27292d)',
          border: '1px solid rgba(240,157,81,0.25)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -28, right: -28, width: 110, height: 110, borderRadius: '50%', background: 'rgba(240,157,81,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -18, right: 64, width: 64, height: 64, borderRadius: '50%', background: 'rgba(240,157,81,0.04)', pointerEvents: 'none' }} />
          <div>
            <div style={{ fontSize: 10, color: 'rgba(240,157,81,0.65)', fontFamily: "'Space Mono'", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>
              BOLAHH WALLET
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 38, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
              RM {walletBalance.toFixed(2)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Available balance</div>
          </div>
          <button onClick={() => navigate('/wallettopup')} style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 20px', fontWeight: 700,
            fontSize: 13, cursor: 'pointer', fontFamily: "'Bebas Neue'",
            letterSpacing: 1.5, flexShrink: 0, transition: 'opacity 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            + TOPUP
          </button>
        </div>

        {/* Upcoming Games */}
        <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Upcoming Games</span>
            <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", fontWeight: 700 }}>
              {upcomingGames.length}
            </span>
          </div>
          {upcomingGames.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text)', fontSize: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}><IconUpcoming size={16} /></div>
              No upcoming games.{' '}
              <span onClick={() => navigate('/home')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Find one →</span>
            </div>
          ) : (
            upcomingGames.map((entry, i) => (
              <div key={entry.id} onClick={() => navigate(`/game/${entry.games.id}`)}
                style={{
                  padding: '14px 18px',
                  borderBottom: i < upcomingGames.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', transition: 'background 0.15s', gap: 12
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,157,81,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.games?.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {entry.games?.fields?.name} · {entry.games?.area}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'" }}>📅 {formatDate(entry.games?.date)}</span>
                    <span style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'" }}>🕐 {entry.games?.time}</span>
                    <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'", fontWeight: 700 }}>{entry.games?.format}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: "'Space Mono'", marginBottom: 4 }}>{daysUntil(entry.games?.date, entry.games?.time)}</div>
                  <div style={{ fontSize: 12, color: 'var(--tomato)', fontFamily: "'Space Mono'", fontWeight: 700 }}>RM {entry.games?.price}</div>
                  <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 4 }}>View →</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Past Games */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Past Games</div>
          {recentGames.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text)', fontSize: 14 }}>No past games yet.</div>
          ) : (
            recentGames.map((entry, i) => (
              <div key={entry.id} style={{
                padding: '12px 18px',
                borderBottom: i < recentGames.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.65
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.games?.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text)' }}>📍 {entry.games?.area} · {entry.games?.date}</div>
                </div>
                <span style={{ background: 'rgba(240,157,81,0.1)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.2)', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", flexShrink: 0, marginLeft: 8 }}>
                  {entry.games?.format}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
