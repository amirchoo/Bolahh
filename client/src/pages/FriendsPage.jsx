import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getRank, getRankColor } from '../lib/rankUtils';
import {IconFriends, IconUpcoming, IconLoading } from '../components/Icons';

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
      .select('id, name, avatar_url, total_points, games_played')
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
      .select('id, name, avatar_url, total_points, games_played')
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
      .select('id, name, avatar_url, total_points, games_played')
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

  const TABS = [
    { key: 'friends', label: `Friends (${friends.length})` },
    { key: 'requests', label: `Requests${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { key: 'search', label: '🔍 Find Players' },
  ];

  const PlayerCard = ({ profile, actions }) => {
    const rank = getRank(profile.total_points || 0, profile.games_played || 0);
    const color = getRankColor(rank);
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, marginBottom: 8
      }}>
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
                <button type="button" onClick={() => removeFriend(profile.id)} style={{
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
                      <button type="button" onClick={() => acceptRequest(profile.id)} style={{
                        ...btnBase, background: 'var(--accent)', color: '#fff'
                      }}>Accept</button>
                      <button type="button" onClick={() => declineRequest(profile.id)} style={{
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
                      <button type="button" onClick={() => acceptRequest(profile.id)} style={{
                        ...btnBase, background: 'var(--accent)', color: '#fff'
                      }}>Accept</button>
                      <button type="button" onClick={() => declineRequest(profile.id)} style={{
                        ...btnBase, background: 'var(--card2)', color: 'var(--muted)',
                        border: '1px solid var(--border)'
                      }}>Decline</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => sendRequest(profile.id)} style={{
                      ...btnBase, background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.3)'
                    }}>+ Add</button>
                  )
                } />
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
