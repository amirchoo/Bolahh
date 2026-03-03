import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const POSITIONS = ['Attacker', 'Midfielder', 'Defender', 'Goalkeeper'];

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', position: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) { fetchProfile(); fetchGames(); }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) {
      const username = user.user_metadata?.username || '';
      const position = user.user_metadata?.position || '';
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({ id: user.id, name: username, position, is_admin: false })
        .select().single();
      if (newProfile) {
        setProfile(newProfile);
        setForm({ name: newProfile.name || '', position: newProfile.position || '' });
      }
    } else {
      if (!data.name && user.user_metadata?.username) {
        const username = user.user_metadata.username;
        const position = user.user_metadata?.position || data.position || '';
        await supabase.from('profiles').update({ name: username, position }).eq('id', user.id);
        setProfile({ ...data, name: username, position });
        setForm({ name: username, position });
      } else {
        setProfile(data);
        setForm({ name: data.name || '', position: data.position || '' });
      }
    }
    setLoading(false);
  };

  const fetchGames = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('game_players')
      .select('*, games(id, title, area, date, time, format, price, fields(name))')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });
    if (!error && data) {
      setUpcomingGames(
        data.filter(e => e.games?.date >= today)
            .sort((a, b) => a.games.date.localeCompare(b.games.date))
      );
      setRecentGames(data.filter(e => e.games?.date < today).slice(0, 5));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) { setSaveMsg('Failed to upload image.'); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const { error: updateError } = await supabase
      .from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    if (!updateError) setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));
    setUploadingAvatar(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveMsg('Username cannot be empty.'); return; }
    setSaving(true); setSaveMsg('');
    const { error } = await supabase
      .from('profiles').upsert({ id: user.id, name: form.name.trim(), position: form.position });
    if (error) { setSaveMsg('Failed to save. Try again.'); }
    else { setProfile({ ...profile, name: form.name.trim(), position: form.position }); setEditing(false); }
    setSaving(false);
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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const game = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((game - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today!';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>

        <h2 className="fade-up" style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, marginBottom: 28, color: 'var(--text)' }}>
          MY PROFILE
        </h2>

        {/* Profile Card */}
        <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(240,157,81,0.08), transparent)', padding: '28px 28px 24px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div onClick={() => fileInputRef.current?.click()} style={{
                width: 80, height: 80, borderRadius: '50%',
                background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Space Mono'", fontSize: 26, fontWeight: 700, color: '#fff',
                border: '3px solid var(--border)', cursor: 'pointer', overflow: 'hidden', position: 'relative'
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(profile?.name)}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: uploadingAvatar ? 1 : 0, transition: 'opacity 0.2s', fontSize: 18
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => !uploadingAvatar && (e.currentTarget.style.opacity = 0)}>
                  {uploadingAvatar ? '⏳' : '📷'}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1, marginBottom: 4, color: 'var(--text)' }}>
                {profile?.name || 'No username set'}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>{user?.email}</div>
              {profile?.position
                ? <span style={{ background: 'rgba(240,157,81,0.15)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.3)', borderRadius: 6, padding: '2px 12px', fontSize: 12, fontFamily: "'Space Mono'", fontWeight: 700 }}>{profile.position}</span>
                : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No position set</span>}
            </div>

            <button onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving} style={{
              background: editing ? 'var(--accent)' : 'transparent',
              color: editing ? '#fff' : 'var(--accent)',
              border: '1.5px solid var(--accent)', borderRadius: 8, padding: '8px 18px',
              fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1
            }}>
              {saving ? 'Saving...' : editing ? 'Save' : 'Edit'}
            </button>
          </div>

          <div style={{ padding: '8px 28px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            📷 Click your avatar to change profile picture
          </div>

          {editing && (
            <div style={{ padding: '20px 28px 24px', borderTop: '1px solid var(--border)' }}>
              {saveMsg && (
                <div style={{ marginBottom: 14, background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8, padding: '8px 14px', color: 'var(--red)', fontSize: 13 }}>
                  {saveMsg}
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block' }}>USERNAME / NICKNAME</label>
                <input placeholder="e.g. hazif77" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 10, display: 'block' }}>PREFERRED POSITION</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {POSITIONS.map(p => (
                    <button key={p} onClick={() => setForm({ ...form, position: form.position === p ? '' : p })} style={{
                      background: form.position === p ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                      color: form.position === p ? 'var(--accent)' : 'var(--muted)',
                      border: `1px solid ${form.position === p ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, transition: 'all 0.15s'
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditing(false); setSaveMsg(''); setForm({ name: profile?.name || '', position: profile?.position || '' }); }} style={{ flex: 1, padding: '10px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Games Joined', val: upcomingGames.length + recentGames.length },
            { label: 'Member Since', val: new Date(user?.created_at).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }) },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--accent)', letterSpacing: 1 }}>{s.val}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming Games */}
        <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Upcoming Games</span>
            <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'", fontWeight: 700 }}>
              {upcomingGames.length}
            </span>
          </div>

          {upcomingGames.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              No upcoming games.{' '}
              <span onClick={() => navigate('/home')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                Find one →
              </span>
            </div>
          ) : (
            upcomingGames.map((entry, i) => (
              <div key={entry.id} onClick={() => navigate(`/game/${entry.games.id}`)}
                style={{
                  padding: '16px 20px',
                  borderBottom: i < upcomingGames.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,157,81,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    {entry.games?.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    📍 {entry.games?.fields?.name} · {entry.games?.area}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'" }}>
                      📅 {formatDate(entry.games?.date)}
                    </span>
                    <span style={{ background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'" }}>
                      🕐 {entry.games?.time}
                    </span>
                    <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: "'Space Mono'", fontWeight: 700 }}>
                      {entry.games?.format}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: "'Space Mono'", marginBottom: 4 }}>
                    {daysUntil(entry.games?.date)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tomato)', fontFamily: "'Space Mono'", fontWeight: 700 }}>
                    RM {entry.games?.price}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>View →</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Past Games */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
            Past Games
          </div>
          {recentGames.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              No past games yet.
            </div>
          ) : (
            recentGames.map((entry, i) => (
              <div key={entry.id} style={{
                padding: '14px 20px',
                borderBottom: i < recentGames.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: 0.65
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{entry.games?.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>📍 {entry.games?.area} · {entry.games?.date}</div>
                </div>
                <span style={{ background: 'rgba(240,157,81,0.1)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.2)', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: "'Space Mono'" }}>
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