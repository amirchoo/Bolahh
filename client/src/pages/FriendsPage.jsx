import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import FifaCard, { getCardTheme } from '../components/FifaCard';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached } from '../lib/dataCache';
import { usePersistedState } from '../lib/usePersistedState';
import { getRank } from '../lib/rankUtils';
import {IconFriends, IconUpcoming, IconLoading } from '../components/Icons';
import { IoSearch, IoPeople, IoMailOpen, IoCheckmark } from 'react-icons/io5';
import { FaLocationDot } from 'react-icons/fa6';
import { UserRoundPlus, ChevronDown } from 'lucide-react';
import { PLAYER_AREAS, PLAYER_DISTRICTS } from '../lib/areas';

const AREA_OPTIONS = ['All Areas', ...PLAYER_AREAS];
// A player's stored area can be a bare state (legacy) or a district within
// it, so filtering by state needs to match either form.
const areaMatchValues = (state) => [state, ...(PLAYER_DISTRICTS[state] || [])];
const PROFILE_FIELDS = 'id, name, position, area, avatar_url, total_points, games_played, is_subscribed, subscription_expires_at, card_stats, achievement_badges, equipped_border, created_at';

export default function FriendsPage() {
  const { user } = useAuth();

  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);   // requests I received
  const [sent, setSent] = useState([]);          // requests I sent
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = usePersistedState('friends_tab', 'friends');
  const [viewingPlayer, setViewingPlayer] = useState(null); // { profile, cardStats }
  const [playedWith, setPlayedWith] = useState([]);
  const [loadingPlayedWith, setLoadingPlayedWith] = useState(true);
  const [areaFilter, setAreaFilter] = usePersistedState('friends_area', 'All Areas');
  const [areaBrowse, setAreaBrowse] = useState([]);
  const [loadingAreaBrowse, setLoadingAreaBrowse] = useState(false);

  useEffect(() => {
    if (!user) return;
    const cached = getCached(`friends_${user.id}`);
    if (cached) {
      setFriends(cached.friends); setPending(cached.pending); setSent(cached.sent);
      setPlayedWith(cached.playedWith || []);
      setLoading(false);
      setLoadingPlayedWith(false);
    }
    fetchAll(!!cached);
  }, [user]);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    const [friendsData, pendingData, sentData, playedWithData] = await Promise.all([fetchFriends(), fetchPending(), fetchSent(), fetchPlayedWith()]);
    setCached(`friends_${user.id}`, { friends: friendsData ?? [], pending: pendingData ?? [], sent: sentData ?? [], playedWith: playedWithData ?? [] });
    setLoading(false);
  };

  const fetchPlayedWith = async () => {
    setLoadingPlayedWith(true);
    const { data: myGames } = await supabase
      .from('game_players').select('game_id').eq('user_id', user.id);
    const gameIds = [...new Set((myGames || []).map(g => g.game_id))];
    if (gameIds.length === 0) { setPlayedWith([]); setLoadingPlayedWith(false); return []; }

    const { data: teammates } = await supabase
      .from('game_players').select('user_id').in('game_id', gameIds).neq('user_id', user.id);

    const counts = {};
    (teammates || []).forEach(t => { counts[t.user_id] = (counts[t.user_id] || 0) + 1; });
    const ids = Object.keys(counts);
    if (ids.length === 0) { setPlayedWith([]); setLoadingPlayedWith(false); return []; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .in('id', ids);

    const withCounts = (profiles || [])
      .map(p => ({ ...p, playedTogether: counts[p.id] }))
      .sort((a, b) => b.playedTogether - a.playedTogether);

    setPlayedWith(withCounts);
    setLoadingPlayedWith(false);
    return withCounts;
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
    if (friendIds.length === 0) { setFriends([]); return []; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .in('id', friendIds);

    setFriends(profiles || []);
    return profiles || [];
  };

  const fetchPending = async () => {
    // Requests sent TO me
    const { data } = await supabase
      .from('friendships')
      .select('sender_id, created_at')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (!data || data.length === 0) { setPending([]); return []; }

    const senderIds = data.map(f => f.sender_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .in('id', senderIds);

    setPending(profiles || []);
    return profiles || [];
  };

  const fetchSent = async () => {
    // Requests I sent
    const { data } = await supabase
      .from('friendships')
      .select('receiver_id, status')
      .eq('sender_id', user.id)
      .eq('status', 'pending');

    if (!data) { setSent([]); return []; }
    const sentIds = data.map(f => f.receiver_id);
    setSent(sentIds);
    return sentIds;
  };

  const runSearch = async (q, area) => {
    setSearching(true);
    let query = supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .ilike('name', `%${q}%`)
      .neq('id', user.id)
      .limit(10);
    if (area !== 'All Areas') query = query.in('area', areaMatchValues(area));

    const { data } = await query;
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    runSearch(q, areaFilter);
  };

  const fetchByArea = async (area) => {
    if (area === 'All Areas') { setAreaBrowse([]); return; }
    setLoadingAreaBrowse(true);
    const { data } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .in('area', areaMatchValues(area))
      .neq('id', user.id)
      .order('total_points', { ascending: false })
      .limit(20);
    setAreaBrowse(data || []);
    setLoadingAreaBrowse(false);
  };

  // Re-run whichever view is active (typed search or area browse) when the area filter changes.
  useEffect(() => {
    if (searchQuery.trim()) runSearch(searchQuery, areaFilter);
    else fetchByArea(areaFilter);
  }, [areaFilter]);

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

  const openPlayerCard = (profile) => {
    const cs = profile.card_stats;
    const cardStats = cs
      ? { pac: cs.pac || 30, sho: cs.sho || 30, pas: cs.pas || 30, dri: cs.dri || 30, def: cs.def || 30, phy: cs.phy || 30 }
      : { pac: 30, sho: 30, pas: 30, dri: 30, def: 30, phy: 30 };
    setViewingPlayer({ profile, cardStats });
  };

  const TABS = [
    { key: 'friends', label: `Friends (${friends.length})` },
    { key: 'requests', label: `Requests${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { key: 'search', label: <><IoSearch size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Find Players</> },
  ];

  const PlayerCard = ({ profile, onRemove, onAccept, onDecline }) => {
    const rank = getRank(profile.total_points || 0);
    const theme = getCardTheme(rank);
    const isSelf = profile.id === user?.id;
    const isSubscribed = profile.is_subscribed && profile.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();
    return (
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 10 }}>
      <div
        onClick={() => openPlayerCard(profile)}
        style={{
          background: theme.bg,
          border: `1.5px solid ${theme.border}`,
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', flex: 1, minWidth: 0,
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: profile.avatar_url ? 'transparent' : theme.statBg,
          border: `1.5px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700, color: theme.text, overflow: 'hidden',
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (profile.name?.[0] || '?').toUpperCase()}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {profile.name || 'Unknown'}
            </span>
            {isSelf && (
              <span style={{
                background: theme.statBg, color: theme.text, flexShrink: 0,
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                borderRadius: 20, padding: '3px 8px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>YOU</span>
            )}
            {isSubscribed && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, fontSize: 9, color: '#fff' }}><IoCheckmark size={9} /></span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 12, letterSpacing: 1, color: theme.text }}>
              {rank}{profile.position && ` · ${profile.position.toUpperCase()}`}
            </span>
          </div>
        </div>

        {/* OVR */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: theme.text, lineHeight: 1, letterSpacing: 1 }}>
            {profile.total_points || 30}
          </div>
          <div style={{ fontSize: 9, color: theme.muted, fontFamily: "'Space Mono'", letterSpacing: 1 }}>OVR</div>
        </div>
      </div>

      {onRemove && (
        <button type="button" onClick={onRemove} style={{
          ...btnBase, flexShrink: 0, alignSelf: 'stretch',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
          border: '1px solid rgba(240,101,67,0.25)'
        }}>Remove</button>
      )}

      {(onAccept || onDecline) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {onAccept && (
            <button type="button" onClick={onAccept} style={{
              ...btnBase, flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', color: '#fff'
            }}>Accept</button>
          )}
          {onDecline && (
            <button type="button" onClick={onDecline} style={{
              ...btnBase, flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--card2)', color: 'var(--muted)',
              border: '1px solid var(--border)'
            }}>Decline</button>
          )}
        </div>
      )}
      </div>
    );
  };

  const btnBase = { borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', margin: '0 0 20px' }}>FRIENDS</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {TABS.map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{
              ...btnBase,
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--card)',
              color: activeTab === tab.key ? '#fff' : 'var(--muted)',
              border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
              padding: '8px 16px', fontSize: 13, fontWeight: 700,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── FRIENDS TAB ── */}
        {activeTab === 'friends' && (
          <div className="fade-up-3">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}><IconLoading size={40} /></div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IoPeople size={40} color="var(--muted)" /></div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No friends yet. Use Find Players to add some!</p>
                <button type="button" onClick={() => setActiveTab('search')} style={{
                  ...btnBase, marginTop: 16, background: 'var(--accent)', color: '#fff', padding: '9px 20px', fontSize: 13
                }}>Find Players</button>
              </div>
            ) : friends.map(profile => (
              <PlayerCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}

        {/* ── REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IoMailOpen size={40} color="var(--muted)" /></div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No pending friend requests.</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                  INCOMING REQUESTS
                </div>
                {pending.map(profile => (
                  <PlayerCard key={profile.id} profile={profile} onAccept={() => acceptRequest(profile.id)} onDecline={() => declineRequest(profile.id)} />
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
              style={{ marginBottom: 14 }}
              autoFocus
            />

            {/* Area filter — browse/search players by area */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <select
                value={areaFilter}
                onChange={e => setAreaFilter(e.target.value)}
                style={{
                  width: '100%', appearance: 'none', colorScheme: 'dark',
                  background: 'var(--card)',
                  border: `1.5px solid ${areaFilter !== 'All Areas' ? 'var(--accent)' : 'var(--border)'}`,
                  color: areaFilter !== 'All Areas' ? 'var(--accent)' : 'var(--text)',
                  borderRadius: 10, padding: '10px 36px 10px 14px',
                  fontSize: 13, fontFamily: "'DM Sans'", fontWeight: 900,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                <ChevronDown size={18} color="var(--muted)" />
              </div>
            </div>

            {searching && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>Searching...</div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IoSearch size={36} color="var(--muted)" /></div>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No players found for "{searchQuery}"</p>
              </div>
            )}

            {!searching && !searchQuery && areaFilter !== 'All Areas' && (
              loadingAreaBrowse ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}><IconLoading size={32} /></div>
              ) : (() => {
                const candidates = areaBrowse.filter(p => getFriendshipStatus(p.id) === 'none');
                if (candidates.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><FaLocationDot size={30} color="var(--muted)" /></div>
                      <p style={{ color: 'var(--muted)', fontSize: 14 }}>No players found in {areaFilter}</p>
                    </div>
                  );
                }
                return (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                      PLAYERS IN {areaFilter.toUpperCase()}
                    </div>
                    {candidates.map(profile => (
                      <PlayerCard key={profile.id} profile={profile} />
                    ))}
                  </>
                );
              })()
            )}

            {!searching && !searchQuery && areaFilter === 'All Areas' && (
              loadingPlayedWith ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}><IconLoading size={32} /></div>
              ) : (() => {
                const suggestions = playedWith.filter(p => getFriendshipStatus(p.id) === 'none').slice(0, 8);
                if (suggestions.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IoSearch size={36} color="var(--muted)" /></div>
                      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Type a username, or pick an area to find players</p>
                    </div>
                  );
                }
                return (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                      PLAYED WITH BEFORE
                    </div>
                    {suggestions.map(profile => (
                      <PlayerCard key={profile.id} profile={profile} />
                    ))}
                  </>
                );
              })()
            )}

            {searchResults.map(profile => (
              <PlayerCard key={profile.id} profile={profile} />
            ))}
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
              achievementBadges={viewingPlayer.profile.achievement_badges}
              size="normal"
              interactive
              memberSince={viewingPlayer.profile.created_at}
            />
            {(() => {
              const status = getFriendshipStatus(viewingPlayer.profile.id);
              if (status === 'friends') {
                return (
                  <button onClick={() => removeFriend(viewingPlayer.profile.id)} style={{
                    background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                    border: '1px solid rgba(240,101,67,0.25)', borderRadius: 10,
                    padding: '10px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>Remove Friend</button>
                );
              }
              if (status === 'pending') {
                return (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { acceptRequest(viewingPlayer.profile.id); setViewingPlayer(null); }} style={{
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>Accept</button>
                    <button onClick={() => { declineRequest(viewingPlayer.profile.id); setViewingPlayer(null); }} style={{
                      background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>Decline</button>
                  </div>
                );
              }
              if (status === 'sent') {
                return (
                  <div style={{
                    background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                    border: '1px solid rgba(240,157,81,0.3)', borderRadius: 10,
                    padding: '10px 32px', fontSize: 14, fontWeight: 600,
                  }}>Request Sent</div>
                );
              }
              return (
                <button onClick={() => sendRequest(viewingPlayer.profile.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}><UserRoundPlus size={18} />Add Friend</button>
              );
            })()}
            <p style={{ color: 'var(--muted)', fontSize: 11, margin: 0, fontFamily: "'Space Mono'", letterSpacing: 1 }}>TAP ANYWHERE TO CLOSE</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
