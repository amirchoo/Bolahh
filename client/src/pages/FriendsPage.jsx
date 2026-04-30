import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getRank, getRankColor } from '../lib/rankUtils';
import { calculateCardStats } from '../lib/cardUtils';
import {IconFriends, IconUpcoming, IconLoading } from '../components/Icons';


const POSITION_ABBR = { 'Attacker': 'AT', 'Midfielder': 'MF', 'Defender': 'DF', 'Goalkeeper': 'GK' };
const STATS = [
  { key: 'pac', label: 'PAC' }, { key: 'sho', label: 'SHO' }, { key: 'pas', label: 'PAS' },
  { key: 'dri', label: 'DRI' }, { key: 'def', label: 'DEF' }, { key: 'phy', label: 'PHY' },
];

function getCardTheme(rank) {
  if (rank.startsWith('Emas'))   return { bg: 'linear-gradient(145deg, #b8860b, #ffd700, #b8860b)', border: '#ffd700', text: '#3a2a00', muted: '#6b4e00', statBg: 'rgba(0,0,0,0.2)' };
  if (rank.startsWith('Perak'))  return { bg: 'linear-gradient(145deg, #6e7275, #c0c0c0, #6e7275)', border: '#c0c0c0', text: '#1a1a1a', muted: '#444', statBg: 'rgba(0,0,0,0.2)' };
  if (rank.startsWith('Gangsa')) return { bg: 'linear-gradient(145deg, #7c4a1a, #cd7f32, #7c4a1a)', border: '#cd7f32', text: '#2a1400', muted: '#5a3010', statBg: 'rgba(0,0,0,0.2)' };
  return { bg: 'linear-gradient(145deg, #2a2d30, #3d4144, #2a2d30)', border: '#555', text: '#e8e9eb', muted: '#aaa', statBg: 'rgba(255,255,255,0.1)' };
}


function FifaCard({ profile, cardStats, rank }) {
  const theme = getCardTheme(rank);
  const isSubscribed = profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();
  return (
    <div style={{ width: 220, height: 330, borderRadius: 16, background: theme.bg, border: `2px solid ${theme.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)', position: 'relative', overflow: 'hidden', flexShrink: 0, fontFamily: "'DM Sans'" }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', top: 12, left: 14, zIndex: 3 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 44, color: theme.text, lineHeight: 1 }}>{cardStats.overall || 30}</div>
        <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: theme.text, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>{POSITION_ABBR[profile?.position] || 'POS'}</div>
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, fontFamily: "'Bebas Neue'", fontSize: 10, color: theme.muted, letterSpacing: 1, textAlign: 'right' }}>{rank}</div>
      <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', width: 108, height: 108, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${theme.border}`, background: theme.statBg, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: "'Space Mono'", fontSize: 28, fontWeight: 700, color: theme.text }}>{(profile?.name?.[0] || '?').toUpperCase()}</span>}
      </div>
      {/* Name + verified tick */}
      <div style={{ position: 'absolute', top: 160, left: 0, right: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 8px' }}>
        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 17, color: theme.text, letterSpacing: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile?.name || 'PLAYER'}
        </span>
        {isSubscribed && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, fontSize: 9, color: '#fff', lineHeight: 1 }}>✓</span>
        )}
      </div>
      <div style={{ position: 'absolute', top: 182, left: 16, right: 16, height: 1, background: `${theme.border}55`, zIndex: 3 }} />
      <div style={{ position: 'absolute', top: 190, left: 10, right: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, zIndex: 3 }}>
        {STATS.map(s => (
          <div key={s.key} style={{ background: theme.statBg, borderRadius: 5, padding: '4px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 14, fontWeight: 700, color: theme.text, lineHeight: 1 }}>{cardStats[s.key] || 0}</div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 8, color: theme.muted, letterSpacing: 0.5, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', zIndex: 3, borderTop: `1px solid ${theme.border}55`, paddingTop: 5 }}>
        <div style={{ fontFamily: "'Space Mono'", fontSize: 8, color: theme.muted }}><span style={{ fontWeight: 700, color: theme.text }}>{profile?.games_played || 0}</span> GAMES PLAYED</div>
        <div style={{ fontFamily: "'Space Mono'", fontSize: 8, color: theme.muted }}><span style={{ fontWeight: 700, color: theme.text }}>{profile?.total_points || 30}</span> OVR</div>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);   // requests I received
  const [sent, setSent] = useState([]);          // requests I sent
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');
  const [viewingPlayer, setViewingPlayer] = useState(null); // { profile, cardStats }

  useEffect(() => { if (user) fetchAll(); }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchPending(), fetchSent()]);
    setLoading(false);
  };

  const fetchFriends = async () => {
    // Get all accepted friendships involving current user
    const { data } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id, status')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!data) return;

    const friendIds = data.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id);
    if (friendIds.length === 0) { setFriends([]); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, total_points, games_played, is_subscribed, subscription_expires_at')
      .in('id', friendIds);

    setFriends(profiles || []);
  };

  const fetchPending = async () => {
    // Requests sent TO me
    const { data } = await supabase
      .from('friendships')
      .select('sender_id, created_at')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (!data || data.length === 0) { setPending([]); return; }

    const senderIds = data.map(f => f.sender_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, total_points, games_played, is_subscribed, subscription_expires_at')
      .in('id', senderIds);

    setPending(profiles || []);
  };

  const fetchSent = async () => {
    // Requests I sent
    const { data } = await supabase
      .from('friendships')
      .select('receiver_id, status')
      .eq('sender_id', user.id)
      .eq('status', 'pending');

    if (!data) { setSent([]); return; }
    setSent(data.map(f => f.receiver_id));
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);

    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, total_points, games_played, is_subscribed, subscription_expires_at')
      .ilike('name', `%${q}%`)
      .neq('id', user.id)
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  const sendRequest = async (receiverId) => {
    await supabase.from('friendships').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending',
    });
    setSent(prev => [...prev, receiverId]);
  };

  const acceptRequest = async (senderId) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id);
    await fetchAll();
  };

  const declineRequest = async (senderId) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id);
    setPending(prev => prev.filter(p => p.id !== senderId));
  };

  const removeFriend = async (friendId) => {
    if (!confirm('Remove this friend?')) return;
    await supabase
      .from('friendships')
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      );
    setFriends(prev => prev.filter(f => f.id !== friendId));
  };

  const getFriendshipStatus = (profileId) => {
    if (friends.find(f => f.id === profileId)) return 'friends';
    if (sent.includes(profileId)) return 'sent';
    if (pending.find(p => p.id === profileId)) return 'pending';
    return 'none';
  };

  const openPlayerCard = async (profile) => {
    const { data: gameRatings } = await supabase
      .from('game_ratings')
      .select('goals, assists, good_defending, good_keeping, successful_dribble, good_chance')
      .eq('user_id', profile.id);
    const cardStats = calculateCardStats(gameRatings || []);
    setViewingPlayer({ profile, cardStats });
  };

  const TABS = [
    { key: 'friends', label: `Friends (${friends.length})` },
    { key: 'requests', label: `Requests${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { key: 'search', label: '🔍 Find Players' },
  ];

  const PlayerCard = ({ profile, actions }) => {
    const rank = getRank(profile.total_points || 0);
    const color = getRankColor(rank);
    return (
      <div
        onClick={() => openPlayerCard(profile)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, marginBottom: 8,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: profile.avatar_url ? 'transparent' : 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700, color: '#fff', overflow: 'hidden',
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (profile.name?.[0] || '?').toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{profile.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 1, color }}>{rank}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {profile.games_played || 0} games</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {actions}
        </div>
      </div>
    );
  };

  const btnBase = { borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>FRIENDS</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Manage your connections</p>
          </div>
          <button onClick={() => navigate('/profile')} style={{
            background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '7px 16px', fontSize: 13
          }}>← Back</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {TABS.map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{
              ...btnBase,
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--card)',
              color: activeTab === tab.key ? '#fff' : 'var(--muted)',
              border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
              padding: '8px 16px', fontSize: 13,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── FRIENDS TAB ── */}
        {activeTab === 'friends' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}><IconLoading size={16} />Loading...</div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No friends yet. Use Find Players to add some!</p>
                <button type="button" onClick={() => setActiveTab('search')} style={{
                  ...btnBase, marginTop: 16, background: 'var(--accent)', color: '#fff', padding: '9px 20px', fontSize: 13
                }}>Find Players</button>
              </div>
            ) : friends.map(profile => (
              <PlayerCard key={profile.id} profile={profile} actions={
                <button type="button" onClick={e => { e.stopPropagation(); removeFriend(profile.id); }} style={{
                  ...btnBase, background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                  border: '1px solid rgba(240,101,67,0.25)'
                }}>Remove</button>
              } />
            ))}
          </div>
        )}

        {/* ── REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No pending friend requests.</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                  INCOMING REQUESTS
                </div>
                {pending.map(profile => (
                  <PlayerCard key={profile.id} profile={profile} actions={
                    <>
                      <button type="button" onClick={e => { e.stopPropagation(); acceptRequest(profile.id); }} style={{
                        ...btnBase, background: 'var(--accent)', color: '#fff'
                      }}>Accept</button>
                      <button type="button" onClick={e => { e.stopPropagation(); declineRequest(profile.id); }} style={{
                        ...btnBase, background: 'var(--card2)', color: 'var(--muted)',
                        border: '1px solid var(--border)'
                      }}>Decline</button>
                    </>
                  } />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── SEARCH TAB ── */}
        {activeTab === 'search' && (
          <div>
            <input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              style={{ marginBottom: 16 }}
              autoFocus
            />

            {searching && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>Searching...</div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No players found for "{searchQuery}"</p>
              </div>
            )}

            {!searching && !searchQuery && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Type a username to search for players</p>
              </div>
            )}

            {searchResults.map(profile => {
              const status = getFriendshipStatus(profile.id);
              return (
                <PlayerCard key={profile.id} profile={profile} actions={
                  status === 'friends' ? (
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✓ Friends</span>
                  ) : status === 'sent' ? (
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Pending...</span>
                  ) : status === 'pending' ? (
                    <>
                      <button type="button" onClick={e => { e.stopPropagation(); acceptRequest(profile.id); }} style={{
                        ...btnBase, background: 'var(--accent)', color: '#fff'
                      }}>Accept</button>
                      <button type="button" onClick={e => { e.stopPropagation(); declineRequest(profile.id); }} style={{
                        ...btnBase, background: 'var(--card2)', color: 'var(--muted)',
                        border: '1px solid var(--border)'
                      }}>Decline</button>
                    </>
                  ) : (
                    <button type="button" onClick={e => { e.stopPropagation(); sendRequest(profile.id); }} style={{
                      ...btnBase, background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.3)'
                    }}>+ Add</button>
                  )
                } />
              );
            })}
          </div>
        )}


      {/* FIFA Card Modal */}
      {viewingPlayer && (
        <div
          onClick={() => setViewingPlayer(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <FifaCard
              profile={viewingPlayer.profile}
              cardStats={viewingPlayer.cardStats}
              rank={getRank(viewingPlayer.profile.total_points || 0)}
            />
            <button onClick={() => setViewingPlayer(null)} style={{
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10,
              padding: '10px 32px', fontSize: 14, cursor: 'pointer',
            }}>Close</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
