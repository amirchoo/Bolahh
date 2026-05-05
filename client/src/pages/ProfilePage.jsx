import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getRank, getRankColor } from '../lib/rankUtils';
import { calculateCardStats } from '../lib/cardUtils';
import { drawCardImage, DEFAULT_BG } from '../lib/cardCanvas';
import { IconFriends, IconUpcoming, IconLoading } from '../components/Icons';
import { RiTeamLine } from 'react-icons/ri';
import { IoClose, IoCheckmark, IoCalendar, IoTime, IoShareOutline, IoDownload } from 'react-icons/io5';
import { FaLocationDot } from 'react-icons/fa6';
import FifaCard, { calcOverall } from '../components/FifaCard';

const POSITIONS = ['Attacker', 'Midfielder', 'Defender', 'Goalkeeper'];
const AREAS = ['Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang', 'Ansan'];

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', position: '', gender: '', age: '', area: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [deletedGameCount, setDeletedGameCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [cardStats, setCardStats] = useState({ pac: 30, sho: 30, pas: 30, dri: 30, def: 30, phy: 30 });
  const [showCardModal, setShowCardModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [premiumBgs, setPremiumBgs] = useState([]);
  const [selectedBg, setSelectedBg] = useState(DEFAULT_BG);
  const [cardPreviewUrl, setCardPreviewUrl] = useState(null);

  useEffect(() => {
    if (user) { fetchProfile(); fetchGames(); }
  }, [user]);

  useEffect(() => {
    if (!profile || !user) return;
    if (profile.is_subscribed && profile.subscription_expires_at && new Date(profile.subscription_expires_at) <= new Date()) {
      supabase.from('profiles').update({ is_subscribed: false }).eq('id', user.id);
      setProfile(prev => ({ ...prev, is_subscribed: false }));
    }
  }, [profile?.is_subscribed, profile?.subscription_expires_at]);

  useEffect(() => {
    if (!showCardModal) return;
    supabase.storage.from('card-backgrounds').list('', { sortBy: { column: 'created_at', order: 'asc' } })
      .then(({ data }) => {
        if (!data) return;
        const bgs = data
          .filter(f => f.name && !f.name.startsWith('.'))
          .map(f => ({
            id: f.name,
            label: f.name.replace(/\.[^.]+$/, '').replace(/-|_/g, ' '),
            src: supabase.storage.from('card-backgrounds').getPublicUrl(f.name).data.publicUrl,
          }));
        setPremiumBgs(bgs);
      });
  }, [showCardModal]);

  useEffect(() => {
    if (!showCardModal || !profile) return;
    drawCardImage({ profile, cardStats, rank: getRank(calcOverall(cardStats)), bgUrl: selectedBg.src })
      .then(canvas => setCardPreviewUrl(canvas.toDataURL('image/png')));
  }, [showCardModal, selectedBg, cardStats]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles').select('*, wallet_balance').eq('id', user.id).single();
    if (error || !data) {
      const username = user.user_metadata?.username || '';
      const position = user.user_metadata?.position || '';
      const gender = user.user_metadata?.gender || '';
      const age = user.user_metadata?.age || null;
      const area = user.user_metadata?.area || '';
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({ id: user.id, name: username, position, gender, age, area, is_admin: false })
        .select().single();
      if (newProfile) {
        setProfile(newProfile);
        setWalletBalance(newProfile?.wallet_balance || 0);
        setForm({ name: newProfile.name || '', position: newProfile.position || '', gender: newProfile.gender || '', age: newProfile.age?.toString() || '', area: newProfile.area || '' });
        fetchCard();
      }
    } else {
      if (!data.name && user.user_metadata?.username) {
        const username = user.user_metadata.username;
        const position = user.user_metadata?.position || data.position || '';
        const gender = user.user_metadata?.gender || data.gender || '';
        const age = user.user_metadata?.age || data.age || null;
        const area = user.user_metadata?.area || data.area || '';
        await supabase.from('profiles').update({ name: username, position, gender, age, area }).eq('id', user.id);
        setProfile({ ...data, name: username, position, gender, age, area });
        setWalletBalance(data?.wallet_balance || 0);
        setForm({ name: username, position, gender: gender || '', age: age?.toString() || '', area: area || '' });
        fetchCard();
      } else {
        setProfile(data);
        setWalletBalance(data?.wallet_balance || 0);
        setForm({ name: data.name || '', position: data.position || '', gender: data.gender || '', age: data.age?.toString() || '', area: data.area || '' });
        fetchCard();
      }
    }
    setLoading(false);
  };

  const fetchCard = async () => {
    // Try to recompute from game_ratings (admin-readable; user may get empty due to RLS)
    const { data: gameRatings } = await supabase
      .from('game_ratings')
      .select('goals, assists, good_defending, good_keeping, successful_dribble, good_chance')
      .eq('user_id', user.id);

    if (gameRatings && gameRatings.length > 0) {
      const stats = calculateCardStats(gameRatings);
      setCardStats(stats);
      await supabase.from('player_cards').upsert({
        user_id: user.id,
        pac: stats.pac, sho: stats.sho, pas: stats.pas,
        dri: stats.dri, def: stats.def, phy: stats.phy,
        overall: stats.overall,
      });
      // Keep total_points in sync so FriendsPage/GameDetailPage (which read total_points) stay accurate
      await supabase.from('profiles').update({ total_points: stats.overall }).eq('id', user.id);
    } else {
      // Fall back to player_cards (written by the admin's rating submission)
      const { data: cardData } = await supabase
        .from('player_cards')
        .select('pac, sho, pas, dri, def, phy, overall')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cardData && (cardData.pac > 30 || cardData.overall > 30)) {
        setCardStats(cardData);
      }
    }
  };

  const fetchGames = async () => {
    const { data: playerData, error: playerError } = await supabase
      .from('game_players').select('id, game_id').eq('user_id', user.id);
    if (playerError || !playerData || playerData.length === 0) return;
    const gameIds = playerData.map(p => p.game_id);
    const { data: gamesData, error: gamesError } = await supabase
      .from('games').select('id, title, area, date, time, format, price, fields(name)').in('id', gameIds);
    if (gamesError) return;
    const allGames = gamesData || [];
    const merged = playerData.map(p => ({
      id: p.id,
      games: allGames.find(g => g.id === p.game_id) || null
    }));
    const valid = merged.filter(e => e.games !== null);
    const orphaned = merged.length - valid.length;
    setDeletedGameCount(orphaned);
    // Sync games_played from valid game count (games that still exist)
    setProfile(prev => prev ? { ...prev, games_played: playerData.length } : prev);
    const now = new Date();
    const isUpcoming = (g) => {
      const [year, month, day] = g.date.split('-').map(Number);
      const [hour, minute] = (g.time || '00:00').split(':').map(Number);
      // Malaysia UTC+8
      const gameStart = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
      return now < gameStart;
    };
    setUpcomingGames(valid.filter(e => isUpcoming(e.games)).sort((a, b) => a.games.date.localeCompare(b.games.date) || a.games.time.localeCompare(b.games.time)));
    setRecentGames(valid.filter(e => !isUpcoming(e.games)).sort((a, b) => b.games.date.localeCompare(a.games.date) || b.games.time.localeCompare(a.games.time)));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const subscribed = !!(profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date());
    const allowed = subscribed ? ['image/jpeg', 'image/png', 'image/gif'] : ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setSaveMsg(file.type === 'image/gif'
        ? 'GIF avatars are exclusive to verified users.'
        : 'Only JPG and PNG images are allowed.');
      e.target.value = '';
      return;
    }
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
    const age = form.age ? parseInt(form.age) : null;
    if (form.age && (isNaN(age) || age < 10 || age > 70)) { setSaveMsg('Age must be between 10 and 70.'); return; }
    setSaving(true); setSaveMsg('');
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, name: form.name.trim(), position: form.position,
      gender: form.gender || null, age: age || null, area: form.area || null,
    });
    if (error) { setSaveMsg('Failed to save. Try again.'); }
    else { setProfile({ ...profile, name: form.name.trim(), position: form.position, gender: form.gender || null, age: age || null, area: form.area || null }); setEditing(false); }
    setSaving(false);
  };


  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCardCanvas = () =>
    drawCardImage({ profile, cardStats, rank, bgUrl: selectedBg.src });

  const handleShareCard = async () => {
    setSharing(true);
    try {
      const canvas = await getCardCanvas();
      canvas.toBlob(async (blob) => {
        try {
          const filename = `${profile?.name || 'player'}-bolahh-card.png`;
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: `${profile?.name}'s Bolahh Card`,
              text: `${rank} · ${profile?.total_points || 30} OVR · bolahh.com`,
              files: [file],
            });
          } else {
            downloadBlob(blob, filename);
          }
        } catch { /* user cancelled */ }
        setSharing(false);
      });
    } catch { setSharing(false); }
  };

  const handleDownloadCard = async () => {
    setSharing(true);
    try {
      const canvas = await getCardCanvas();
      canvas.toBlob(blob => {
        downloadBlob(blob, `${profile?.name || 'player'}-bolahh-card.png`);
        setSharing(false);
      });
    } catch { setSharing(false); }
  };

  const getInitials = (name) => {
    if (!name || name.trim() === '') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const daysUntil = (dateStr) => {
    // Compare dates only in Malaysia time (UTC+8) to avoid timezone off-by-one
    const nowMY = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const todayMY = new Date(Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth(), nowMY.getUTCDate()));
    const [year, month, day] = dateStr.split('-').map(Number);
    const gameDateMY = new Date(Date.UTC(year, month - 1, day));
    const diff = Math.round((gameDateMY - todayMY) / (1000 * 60 * 60 * 24));
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

  const rank = getRank(calcOverall(cardStats));
  const rankColor = getRankColor(rank);
  const isSubscribed = profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <style>{`
        @media (max-width: 480px) {
          .profile-header { flex-direction: column !important; align-items: center !important; text-align: center !important; }
          .profile-header .edit-btn { margin-top: 12px; width: 100%; }
          .profile-info { align-items: center !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .avatar-hover-overlay { pointer-events: none; }
        div:hover > .avatar-hover-overlay { opacity: 1 !important; }
        .card-tap-hint { opacity: 0; transition: opacity 0.2s; }
        .card-tap-wrapper:hover .card-tap-hint { opacity: 1; }
      `}</style>

      {/* Card Share Modal */}
      {showCardModal && (
        <div
          onClick={() => setShowCardModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: '24px 16px', overflowY: 'auto',
          }}
        >
          {/* Close */}
          <button onClick={() => setShowCardModal(false)} style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><IoClose size={20} /></button>

          {/* Card preview — canvas output as img */}
          <div onClick={e => e.stopPropagation()}>
            {cardPreviewUrl
              ? <img src={cardPreviewUrl} alt="card preview" style={{ width: 220, height: 308, borderRadius: 12, display: 'block', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }} />
              : <div style={{ width: 220, height: 308, borderRadius: 12, background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>Generating…</div>
            }
          </div>

          {/* Background picker */}
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: "'Space Mono'", letterSpacing: 2 }}>BACKGROUND</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>

              {/* Dark default */}
              <button onClick={() => setSelectedBg(DEFAULT_BG)} style={{
                width: 40, height: 40, borderRadius: 10, cursor: 'pointer', padding: 0,
                border: `2px solid ${selectedBg.id === DEFAULT_BG.id ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                background: '#111213', outline: 'none',
                boxShadow: selectedBg.id === DEFAULT_BG.id ? '0 0 0 3px rgba(240,157,81,0.3)' : 'none',
              }} title="Dark" />

              {/* Premium backgrounds from admin */}
              {premiumBgs.map(bg => (
                <button key={bg.id} onClick={() => setSelectedBg(bg)} style={{
                  width: 40, height: 40, borderRadius: 10, cursor: 'pointer', padding: 0,
                  border: `2px solid ${selectedBg.id === bg.id ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                  background: `url(${bg.src}) center/cover`,
                  outline: 'none',
                  boxShadow: selectedBg.id === bg.id ? '0 0 0 3px rgba(240,157,81,0.3)' : 'none',
                }} title={bg.label} />
              ))}

            </div>
          </div>

          {/* Share + Save buttons */}
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleShareCard} disabled={sharing || !cardPreviewUrl} style={{
              padding: '12px 28px', borderRadius: 12,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontWeight: 700, fontSize: 14,
              cursor: sharing ? 'wait' : 'pointer', opacity: (sharing || !cardPreviewUrl) ? 0.6 : 1,
            }}>
              {sharing ? 'Preparing...' : <><IoShareOutline size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Share</>}
            </button>
            <button onClick={handleDownloadCard} disabled={sharing || !cardPreviewUrl} style={{
              padding: '12px 28px', borderRadius: 12,
              background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              fontWeight: 700, fontSize: 14,
              cursor: sharing ? 'wait' : 'pointer', opacity: (sharing || !cardPreviewUrl) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IoDownload size={16} />Save
            </button>
          </div>
        </div>
      )}


      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <h2 className="fade-up" style={{
          fontFamily: "'Bebas Neue'", fontSize: 32,
          letterSpacing: 3, marginBottom: 20, color: 'var(--text)'
        }}>MY PROFILE</h2>

        {/* FIFA Card section */}
        <div
          className="fade-up card-tap-wrapper"
          onClick={() => setShowCardModal(true)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: 20, cursor: 'pointer', position: 'relative',
          }}
        >
          <FifaCard profile={profile} cardStats={cardStats} rank={rank} size="normal" onAvatarClick={() => fileInputRef.current?.click()} />
          <div className="card-tap-hint" style={{
            marginTop: 8, fontSize: 11, color: 'var(--muted)',
            fontFamily: "'Space Mono'", letterSpacing: 1,
          }}>
            TAP TO VIEW & SHARE
          </div>
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
        <input ref={fileInputRef} type="file" accept={isSubscribed ? 'image/jpeg,image/png,image/gif' : 'image/jpeg,image/png'} style={{ display: 'none' }} onChange={handleAvatarUpload} />

        {/* Nudge banner for missing gender/age */}
        {!editing && profile && (!profile.gender || !profile.age || !profile.area) && (
          <div style={{
            background: 'rgba(240,157,81,0.08)', border: '1px solid rgba(240,157,81,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span style={{ fontSize: 13, color: 'var(--accent)' }}>
              {!profile.area
                ? 'Add your area so players nearby can find you.'
                : 'Add your gender and age to finish setting up your profile.'}
            </span>
            <button onClick={() => setEditing(true)} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0,
            }}>Update</button>
          </div>
        )}

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
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 10, display: 'block' }}>GENDER</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Male', 'Female', 'Rather not say'].map(g => (
                  <button key={g} onClick={() => setForm({ ...form, gender: form.gender === g ? '' : g })} style={{
                    flex: 1,
                    background: form.gender === g ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: form.gender === g ? 'var(--accent)' : 'var(--text)',
                    border: `1px solid ${form.gender === g ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500
                  }}>{g}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block' }}>AGE</label>
              <input type="number" placeholder="e.g. 22" min="10" max="70"
                value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 10, display: 'block' }}>AREA</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AREAS.map(a => (
                  <button key={a} onClick={() => setForm({ ...form, area: form.area === a ? '' : a })} style={{
                    background: form.area === a ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: form.area === a ? 'var(--accent)' : 'var(--text)',
                    border: `1px solid ${form.area === a ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500
                  }}>{a}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={() => { setEditing(false); setSaveMsg(''); setForm({ name: profile?.name || '', position: profile?.position || '', gender: profile?.gender || '', age: profile?.age?.toString() || '', area: profile?.area || '' }); }} style={{ flex: 1, padding: '10px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="fade-up-3 stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Games Joined', val: profile?.games_played || 0 },
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
          <button onClick={() => navigate('/wallet/topup')} style={{
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

        {/* Subscription */}
        <div
          className="fade-up-3"
          onClick={() => navigate('/subscription')}
          style={{
            background: isSubscribed
              ? 'linear-gradient(135deg, #0f3824, #1a5c3a)'
              : 'linear-gradient(135deg, #1c1e21, #27292d)',
            border: isSubscribed
              ? '1px solid rgba(74,222,128,0.3)'
              : '1px solid rgba(240,157,81,0.15)',
            borderRadius: 16, padding: '16px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: isSubscribed ? '#4ade8033' : 'rgba(255,255,255,0.06)',
              border: isSubscribed ? '2px solid #4ade8066' : '2px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: isSubscribed ? '#4ade80' : 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><IoCheckmark size={16} /></div>
            <div>
              <div style={{ fontSize: 10, color: isSubscribed ? 'rgba(74,222,128,0.7)' : 'rgba(240,157,81,0.65)', fontFamily: "'Space Mono'", fontWeight: 700, letterSpacing: 2, marginBottom: 3 }}>
                BOLAHH VERIFIED
              </div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, lineHeight: 1, color: isSubscribed ? '#4ade80' : '#fff' }}>
                {isSubscribed ? 'ACTIVE' : 'GET VERIFIED TICK'}
              </div>
              {isSubscribed && profile?.subscription_expires_at && (
                <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.6)', marginTop: 3 }}>
                  Expires {new Date(profile.subscription_expires_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
          <div style={{
            background: isSubscribed ? 'rgba(74,222,128,0.15)' : 'var(--accent)',
            color: isSubscribed ? '#4ade80' : '#fff',
            border: isSubscribed ? '1px solid rgba(74,222,128,0.3)' : 'none',
            borderRadius: 10, padding: '8px 16px', fontWeight: 700,
            fontSize: 12, fontFamily: "'Bebas Neue'", letterSpacing: 1.5, flexShrink: 0,
          }}>
            {isSubscribed ? 'RENEW' : 'RM10/MONTH'}
          </div>
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
                  <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}><FaLocationDot size={11} />{entry.games?.fields?.name} · {entry.games?.area}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'", display: 'inline-flex', alignItems: 'center', gap: 4 }}><IoCalendar size={11} />{formatDate(entry.games?.date)}</span>
                    <span style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'", display: 'inline-flex', alignItems: 'center', gap: 4 }}><IoTime size={11} />{entry.games?.time}</span>
                    <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'", fontWeight: 700 }}>{entry.games?.format}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: "'Space Mono'", marginBottom: 4 }}>{daysUntil(entry.games?.date)}</div>
                  <div style={{ fontSize: 12, color: 'var(--tomato)', fontFamily: "'Space Mono'", fontWeight: 700 }}>RM {entry.games?.price}</div>
                  <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 4 }}>View →</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Past Games */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Past Games</span>
            {recentGames.length > 0 && (
              <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", fontWeight: 700 }}>
                {recentGames.length}
              </span>
            )}
          </div>
          {recentGames.length === 0 && deletedGameCount === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text)', fontSize: 14 }}>No past games yet.</div>
          )}
          {recentGames.map((entry, i) => (
            <div key={entry.id} style={{
              padding: '12px 18px',
              borderBottom: i < recentGames.length - 1 || deletedGameCount > 0 ? '1px solid var(--border)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.65
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.games?.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}><FaLocationDot size={11} />{entry.games?.area} · {entry.games?.date}</div>
              </div>
              <span style={{ background: 'rgba(240,157,81,0.1)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.2)', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", flexShrink: 0, marginLeft: 8 }}>
                {entry.games?.format}
              </span>
            </div>
          ))}
          {deletedGameCount > 0 && (
            <div style={{ padding: '12px 18px', fontSize: 12, color: 'var(--muted)', textAlign: 'center', fontFamily: "'Space Mono'" }}>
              + {deletedGameCount} game{deletedGameCount !== 1 ? 's' : ''} no longer available
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
