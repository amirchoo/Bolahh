import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getCached, setCached } from '../lib/dataCache';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PlayerAvatar from '../components/PlayerAvatar';
import StatChips from '../components/StatChips';
import { IconLoading } from '../components/Icons';
import { FaRankingStar } from "react-icons/fa6";
import { FaSquareParking } from 'react-icons/fa6';
import { LuToilet } from 'react-icons/lu';
import { CiShop } from 'react-icons/ci';
import { FaLocationDot, FaWhatsapp, FaTelegram } from "react-icons/fa6";
import { FaLink } from "react-icons/fa";
import { IoWallet, IoTimer, IoClose, IoCheckmark, IoInformationCircleOutline } from 'react-icons/io5';
import { FaArrowTrendUp, FaArrowTrendDown } from 'react-icons/fa6';
import { GiSoccerBall, GiTrophy, GiRunningShoe } from 'react-icons/gi';
import { getRank, getRankColor } from '../lib/rankUtils';
import GameRulesDisplay from '../components/GameRulesDisplay';
import FifaCard from '../components/FifaCard';

const STAT_KEYS = [
  { key: 'shooting_quality',   label: 'SHO', weight: 3, color: '#f87171' },
  { key: 'passing_quality',    label: 'PAS', weight: 2, color: '#4ade80' },
  { key: 'successful_dribble', label: 'DRI', weight: 1, color: '#F09D51' },
  { key: 'good_defending',     label: 'DEF', weight: 1, color: '#a78bfa' },
  { key: 'good_keeping',       label: 'PHY', weight: 1, color: '#34d399' },
  { key: 'good_chance',        label: 'PAC', weight: 1, color: '#64a0ff' },
];
const calcAwardPoints = (r) =>
  STAT_KEYS.reduce((sum, { key, weight }) => sum + (r[key] || 0) * weight, 0);

const POSITION_META = {
  1: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', label: '1ST PLACE', shadowColor: 'rgba(255,215,0,0.45)' },
  2: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.35)', label: '2ND PLACE', shadowColor: 'rgba(192,192,192,0.3)' },
  3: { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.35)', label: '3RD PLACE', shadowColor: 'rgba(205,127,50,0.3)' },
};

const GoalAssistBadges = ({ rating }) => {
  if (!rating || (!rating.goals && !rating.assists)) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {rating.goals > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: '#FECA57' }}>
          <GiSoccerBall size={13} />{rating.goals}
        </span>
      )}
      {rating.assists > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: '#00D2D3' }}>
          <GiRunningShoe size={13} />{rating.assists}
        </span>
      )}
    </div>
  );
};

function AwardPopup({ position, profile, points, rating, onClose }) {
  const meta = POSITION_META[position];
  const name = profile?.name || 'Player';
  const rank = getRank(profile?.total_points);
  const rankColor = getRankColor(rank);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--card)',
        border: `1.5px solid ${meta.border}`,
        borderRadius: 24,
        padding: '36px 28px',
        width: '100%',
        maxWidth: 380,
        textAlign: 'center',
        boxShadow: `0 0 60px ${meta.shadowColor}, 0 24px 64px rgba(0,0,0,0.6)`,
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'var(--card2)', border: '1px solid var(--border)',
          borderRadius: 8, width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--muted)',
        }}>
          <IoClose size={16} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: meta.bg, border: `2px solid ${meta.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 28px ${meta.shadowColor}`,
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            <GiTrophy size={44} color={meta.color} />
          </div>
        </div>

        <div style={{
          display: 'inline-block',
          background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 8, padding: '4px 16px',
          fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700,
          color: meta.color, letterSpacing: 2, marginBottom: 12,
        }}>{meta.label}</div>

        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: 4,
          color: 'var(--text)', marginBottom: 6, lineHeight: 1,
        }}>BOLAHH AWARD</div>

        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.8 }}>
          Congratulations, <span style={{ color: meta.color, fontWeight: 700 }}>{name}</span>!<br />
          You are one of the top performers this match.
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--card2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'left',
        }}>
          <PlayerAvatar profile={profile} size={44} borderColor={meta.color} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: meta.color, marginBottom: 2 }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: rankColor }}>{rank}</span>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 14, color: rankColor }}>{profile?.total_points || 30} OVR</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: meta.color, lineHeight: 1 }}>{points}</div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>AWARD PTS</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono'", fontSize: 10, color: 'var(--muted)', letterSpacing: 1, marginBottom: 8 }}>
            THIS MATCH
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {STAT_KEYS.filter(({ key }) => (rating[key] || 0) > 0).map(({ key, label, color }) => (
              <div key={key} style={{
                background: `${color}15`, border: `1px solid ${color}40`,
                borderRadius: 8, padding: '6px 12px',
                fontFamily: "'Space Mono'", fontSize: 12, color, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                {label} ↑
              </div>
            ))}
            {STAT_KEYS.every(({ key }) => !(rating[key] || 0)) && (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Attendance only</span>
            )}
          </div>
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '14px',
          background: meta.color, color: '#111213',
          border: 'none', borderRadius: 12,
          fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 3,
          fontWeight: 700, cursor: 'pointer',
        }}>
          GOT IT
        </button>
      </div>
    </div>
  );
}

export default function GameDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const userId = user?.id;

  const [game, setGame] = useState(null);
  const [field, setField] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRated, setIsRated] = useState(false);
  const [managerName, setManagerName] = useState(null);
  const [managerProfile, setManagerProfile] = useState(null);
  const [showManagerCard, setShowManagerCard] = useState(false);
  const [sortedRatings, setSortedRatings] = useState([]);
  const [ratingProfiles, setRatingProfiles] = useState({});
  const [hasFeedback, setHasFeedback] = useState(false);
  const [showAwardPopup, setShowAwardPopup] = useState(false);
  const [myPosition, setMyPosition] = useState(null);

  // Full standings list is shuffled (not ranked by points) so it doesn't read as a leaderboard —
  // the top-3 award ranking above it already covers that.
  const shuffledRatings = useMemo(() => {
    const arr = [...sortedRatings];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [sortedRatings]);

  useEffect(() => {
    const cached = getCached(`game_${id}`);
    if (cached) {
      setGame(cached.game); setField(cached.field);
      setPlayerCount(cached.playerCount); setHasJoined(cached.hasJoined);
      setPlayers(cached.players); setIsOwner(cached.isOwner);
      setWalletBalance(cached.walletBalance);
      setIsRated(cached.isRated || false);
      setManagerName(cached.managerName || null);
      setHasFeedback(cached.hasFeedback || false);
      setLoading(false);
    }
    fetchGame(!!cached);
  }, [id]);

  const fetchGame = async (silent = false) => {
    if (!silent) setLoading(true);
    const [gameRes, profileRes] = await Promise.all([
      supabase.from('games').select('*, fields(*)').eq('id', id).single(),
      user
        ? supabase.from('profiles').select('wallet_balance').eq('id', user.id).single()
        : Promise.resolve({ data: null }),
    ]);
    if (gameRes.error || !gameRes.data) { navigate('/home'); return; }
    const gameData = gameRes.data;
    const fieldData = gameRes.data.fields;
    const isOwnerVal = gameRes.data.created_by === user?.id;
    const walletBal = profileRes.data?.wallet_balance || 0;
    setGame(gameData); setField(fieldData);
    setIsOwner(isOwnerVal); setWalletBalance(walletBal);

    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, position, total_points, games_played, card_stats, is_subscribed, subscription_expires_at')
      .eq('id', gameData.created_by).single();
    setManagerName(creatorProfile?.name || null);
    setManagerProfile(creatorProfile || null);

    const { count } = await supabase
      .from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', id);
    const countVal = count || 0;
    setPlayerCount(countVal);

    const { data: existing } = user
      ? await supabase.from('game_players').select('id').eq('game_id', id).eq('user_id', user.id).maybeSingle()
      : { data: null };
    const joinedVal = !!existing;
    setHasJoined(joinedVal);

    let feedbackVal = false;
    if (joinedVal) {
      const { data: feedbackExisting } = await supabase
        .from('game_feedback').select('id').eq('game_id', id).eq('user_id', user.id).maybeSingle();
      feedbackVal = !!feedbackExisting;
    }
    setHasFeedback(feedbackVal);

    const { data: gamePlayers } = await supabase
      .from('game_players').select('user_id').eq('game_id', id);
    let playersVal = [];
    if (gamePlayers?.length) {
      const { data: profilesData } = await supabase
        .from('profiles').select('id, name, avatar_url, position, total_points, is_subscribed, subscription_expires_at')
        .in('id', gamePlayers.map(p => p.user_id));
      playersVal = profilesData || [];
      setPlayers(playersVal);
    }

    const { data: ratingCheck } = await supabase
      .from('game_ratings').select('user_id, goals, assists, shooting_quality, passing_quality, good_defending, good_keeping, successful_dribble, good_chance, admin_bonus')
      .eq('game_id', id);
    const ratedVal = !!(ratingCheck && ratingCheck.length > 0);
    setIsRated(ratedVal);

    if (ratedVal && ratingCheck.length > 0) {
      const agg = {};
      ratingCheck.forEach(r => {
        if (!agg[r.user_id]) agg[r.user_id] = { user_id: r.user_id, goals: 0, assists: 0, shooting_quality: 0, passing_quality: 0, good_defending: 0, good_keeping: 0, successful_dribble: 0, good_chance: 0, admin_bonus: 0 };
        agg[r.user_id].goals += r.goals || 0;
        agg[r.user_id].assists += r.assists || 0;
        STAT_KEYS.forEach(({ key }) => { agg[r.user_id][key] += r[key] || 0; });
        if ((r.admin_bonus || 0) > 0) agg[r.user_id].admin_bonus = r.admin_bonus;
      });
      const hasOfficialMotm = Object.values(agg).some(r => r.admin_bonus > 0);
      let sorted;
      if (hasOfficialMotm) {
        const motmOrder = Object.values(agg).filter(r => r.admin_bonus > 0).sort((a, b) => a.admin_bonus - b.admin_bonus);
        const others = Object.values(agg).filter(r => !r.admin_bonus).sort((a, b) => calcAwardPoints(b) - calcAwardPoints(a));
        sorted = [...motmOrder, ...others];
      } else {
        sorted = Object.values(agg).sort((a, b) => calcAwardPoints(b) - calcAwardPoints(a));
      }
      setSortedRatings(sorted);
      const uids = sorted.map(r => r.user_id);
      const { data: rProfiles } = await supabase.from('profiles').select('id, name, avatar_url, total_points, position').in('id', uids);
      const pm = {};
      rProfiles?.forEach(p => { pm[p.id] = p; });
      setRatingProfiles(pm);

      const myIdx = user ? sorted.findIndex(r => r.user_id === user.id) : -1;
      if (myIdx >= 0 && myIdx < 3) {
        setMyPosition(myIdx + 1);
        setTimeout(() => setShowAwardPopup(true), 700);
      }
    }

    setCached(`game_${id}`, {
      game: gameData, field: fieldData, isOwner: isOwnerVal,
      walletBalance: walletBal, playerCount: countVal,
      hasJoined: joinedVal, players: playersVal, isRated: ratedVal,
      managerName: creatorProfile?.name || null, hasFeedback: feedbackVal,
    });
    setLoading(false);
  };

  const handleJoinClick = () => {
    if (hasJoined || full || timedOut || ongoing || ended || !game) return;
    navigate(`/game/${id}/checkout`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}><IconLoading size={16} /></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const full = playerCount >= game.slots;
  const pct = Math.round((playerCount / game.slots) * 100);
  const open = game.slots - playerCount;
  // Below this fill level, the raw headcount reads as "nobody wants this game" and
  // discourages joining — lead with opportunity framing instead until it fills up more.
  const showCount = full || pct >= 40;
  const shortfall = Math.max(0, game.price - walletBalance);

  const now = new Date();
  const [gy, gm, gd] = game.date.split('-').map(Number);
  const [gh, gmin] = (game.time || '00:00').split(':').map(Number);
  const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
  const lockoutStart = new Date(gameStart.getTime() - 10 * 60 * 1000);
  const gameEnd = new Date(gameStart.getTime() + 2 * 60 * 60 * 1000);

  const timedOut = now >= lockoutStart && now < gameStart;
  const ongoing  = now >= gameStart && now < gameEnd;
  const ended    = now >= gameEnd;

  const tagStyle = {
    background: 'var(--card2)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 6,
    padding: '4px 12px', fontSize: 12, fontFamily: "'Space Mono'"
  };
  const sectionTitle = {
    fontFamily: "'Bebas Neue'", fontSize: 20,
    letterSpacing: 2, color: 'var(--text)', marginBottom: 12
  };
  const facilityItem = {
    background: 'var(--card2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 18px',
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 14, color: 'var(--text)', fontWeight: 500
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${timeStr}${ampm}`;
  };

  const shareMessage = game && field
    ? `${game.title} at ${field.name}, ${game.area} will be held on ${formatDate(game.date)} at ${formatTime(game.time)}`
    : '';
  const shareUrl = window.location.href;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${shareMessage}\n\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareMessage}\n\n${shareUrl}`)}`, '_blank');
  };

  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const top3 = sortedRatings.slice(0, Math.min(3, sortedRatings.length));
  const myRating = sortedRatings.find(r => r.user_id === userId);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {showAwardPopup && myPosition && myRating && (
        <AwardPopup
          position={myPosition}
          profile={ratingProfiles[userId]}
          points={calcAwardPoints(myRating)}
          rating={myRating}
          onClose={() => setShowAwardPopup(false)}
        />
      )}

      {/* ── Manager Card Modal ── */}
      {showManagerCard && managerProfile && (() => {
        const cs = managerProfile.card_stats;
        const cardStats = cs
          ? { pac: cs.pac || 30, sho: cs.sho || 30, pas: cs.pas || 30, dri: cs.dri || 30, def: cs.def || 30, phy: cs.phy || 30 }
          : { pac: 30, sho: 30, pas: 30, dri: 30, def: 30, phy: 30 };
        return (
          <div
            onClick={() => setShowManagerCard(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <FifaCard
                profile={managerProfile}
                cardStats={cardStats}
                rank={getRank(managerProfile.total_points || 0)}
              />
              <button onClick={() => setShowManagerCard(false)} style={{
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                padding: '10px 32px', fontSize: 14, cursor: 'pointer',
              }}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ── Insufficient Balance Modal ── */}
      {showInsufficientModal && (
        <div
          onClick={e => e.target === e.currentTarget && setShowInsufficientModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
            zIndex: 1000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 16
          }}
        >
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 360,
            textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'rgba(224,62,26,0.1)', border: '1.5px solid rgba(224,62,26,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <IoWallet size={30} color="#e03e1a" />
            </div>

            <div style={{
              fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2,
              color: 'var(--text)', marginBottom: 8
            }}>INSUFFICIENT BALANCE</div>

            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 22 }}>
              Your wallet doesn't have enough funds to join this game. Top up to continue.
            </p>

            <div style={{
              background: 'var(--card2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '16px 18px', marginBottom: 22, textAlign: 'left'
            }}>
              {[
                { label: 'Your balance', value: `RM ${walletBalance.toFixed(2)}`, color: 'var(--text)' },
                { label: 'Game price', value: `RM ${Number(game.price).toFixed(2)}`, color: 'var(--tomato)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 10px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>You need</span>
                <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--red)' }}>
                  + RM {shortfall.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/wallet/topup')}
              style={{
                width: '100%', padding: '14px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer',
                fontFamily: "'Bebas Neue'", letterSpacing: 2, marginBottom: 10,
                transition: 'opacity 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              TOPUP NOW
            </button>
            <button
              onClick={() => setShowInsufficientModal(false)}
              style={{
                width: '100%', padding: '12px',
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 12,
                fontSize: 14, cursor: 'pointer'
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* ── Share Modal ── */}
      {showShareModal && (
        <div
          onClick={e => e.target === e.currentTarget && setShowShareModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
            zIndex: 1000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 16
          }}
        >
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 360,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 2, color: 'var(--text)', marginBottom: 14 }}>SHARE GAME</div>

            <div style={{
              background: 'var(--card2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 20,
              fontSize: 13, color: 'var(--muted)', lineHeight: 1.7
            }}>
              {shareMessage}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleWhatsApp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                <FaWhatsapp size={18} /> Share on WhatsApp
              </button>
              <button onClick={handleTelegram} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px', background: '#229ED9', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                <FaTelegram size={18} /> Share on Telegram
              </button>
              <button onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px', background: copied ? 'rgba(74,222,128,0.1)' : 'var(--card2)', color: copied ? '#4ade80' : 'var(--text)', border: `1px solid ${copied ? 'rgba(74,222,128,0.35)' : 'var(--border)'}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans'", transition: 'all 0.2s' }}>
                <FaLink size={14} /> {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button onClick={() => setShowShareModal(false)} style={{ width: '100%', padding: '11px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button onClick={() => navigate('/home')} style={{
            background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '7px 16px', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
          }}>← Back to Games</button>

          <button
            onClick={() => setShowShareModal(true)}
            style={{
              background: 'var(--card)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '7px 16px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
            }}
          >
            <FaWhatsapp size={14} style={{ color: '#25D366' }} /> Share
          </button>
        </div>

        {/* Field images */}
        {field?.images?.length > 0 ? (
          <div className="fade-up" style={{ marginBottom: 24 }}>
            <div style={{ width: '100%', height: 240, borderRadius: 16, overflow: 'hidden', marginBottom: 8, border: '1px solid var(--border)' }}>
              <img src={field.images[selectedImage]} alt={field.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {field.images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {field.images.map((url, i) => (
                  <img key={i} src={url} alt={`Field ${i + 1}`} onClick={() => setSelectedImage(i)}
                    style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, cursor: 'pointer', border: `2px solid ${selectedImage === i ? 'var(--accent)' : 'var(--border)'}`, transition: 'border 0.15s' }} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="fade-up" style={{ width: '100%', height: 200, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <GiSoccerBall size={48} color="var(--accent)" />
          </div>
        )}

        {/* Title + tags */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}><FaLocationDot size={25}/> {field?.name}, {game.area}</h1>
              {game.court && (
                <p style={{ color: 'var(--accent)', fontSize: 14, fontFamily: "'Space Mono'", fontWeight: 700, marginBottom: 2 }}>Court {game.court}</p>
              )}
              <p style={{ fontFamily: "Bebas Neue", color: 'var(--text)', fontSize: 30, opacity: 1 }}>{formatDate(game.date)} / {formatTime(game.time)}</p>
              <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.75 }}>{game.title}</p>
              {managerName && (
                <p style={{ fontSize: 12, marginTop: 8, fontFamily: "'Space Mono'", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>MANAGER</span>
                  <span style={{ color: 'var(--border)' }}>|</span>
                  <span
                    onClick={() => setShowManagerCard(true)}
                    style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >{managerName}</span>
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 6, padding: '4px 14px', fontSize: 13, fontFamily: "'Space Mono'", fontWeight: 700 }}>{game.format}</span>
              <div style={{ marginTop: 6, fontFamily: "'Space Mono'", fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>RM {game.price}</div>
            </div>
          </div>
        </div>

        {/* ── GAME STATUS SECTION ── */}

        {/* Ongoing banner */}
        {ongoing && (
          <div className="fade-up-2" style={{
            background: 'rgba(74,222,128,0.07)',
            border: '1px solid rgba(74,222,128,0.25)',
            borderRadius: 14, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%', background: '#4ade80', flexShrink: 0,
              animation: 'pulse 1.8s ease-in-out infinite',
            }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: '#4ade80' }}>ONGOING</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Match is currently in progress</div>
            </div>
          </div>
        )}

        {/* Game Ended banner */}
        {ended && (
          <div className="fade-up-2" style={{
            background: 'rgba(240,157,81,0.07)',
            border: '1px solid rgba(240,157,81,0.25)',
            borderRadius: 14, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <GiSoccerBall size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--accent)' }}>GAME ENDED</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>This match has concluded</div>
            </div>
          </div>
        )}

        {/* Slot bar + join button — only shown when game has NOT started */}
        {!ongoing && !ended && (
          <>
            {/* Wallet balance hint */}
            {!hasJoined && !full && !timedOut && (
              <div style={{
                background: walletBalance >= game.price ? 'rgba(74,222,128,0.06)' : 'rgba(224,62,26,0.06)',
                border: `1px solid ${walletBalance >= game.price ? 'rgba(74,222,128,0.2)' : 'rgba(224,62,26,0.2)'}`,
                borderRadius: 10, padding: '10px 16px', marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13
              }}>
                <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><IoWallet size={13} /> Wallet balance</span>
                <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: walletBalance >= game.price ? '#4ade80' : 'var(--red)' }}>
                  RM {walletBalance.toFixed(2)} {walletBalance >= game.price ? <IoCheckmark size={13} style={{ verticalAlign: 'middle' }} /> : `(need RM ${shortfall.toFixed(2)} more)`}
                </span>
              </div>
            )}

            <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: showCount ? 8 : 16 }}>
                <span style={{ fontWeight: 600, color: showCount ? 'var(--text)' : 'var(--accent)' }}>
                  {showCount ? `${playerCount}/${game.slots} players joined` : 'Newly opened. Be one of the first to join!'}
                </span>
                <span style={{ color: full ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
                  {full ? 'FULL' : `${open} slots open`}
                </span>
              </div>
              {showCount && (
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--red)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
              )}

              <button
                onClick={handleJoinClick}
                disabled={full || hasJoined || timedOut}
                style={{
                  width: '100%', padding: '13px',
                  background: hasJoined ? 'transparent' : full ? 'transparent' : timedOut ? 'transparent' : 'var(--accent)',
                  color: hasJoined ? 'var(--accent)' : full ? 'var(--muted)' : timedOut ? 'var(--accent)' : '#fff',
                  border: hasJoined ? '1.5px solid var(--accent)' : full ? '1px solid var(--border)' : timedOut ? '1.5px solid var(--accent)' : 'none',
                  borderRadius: 10, fontWeight: 700, fontSize: 15, transition: 'all 0.15s',
                  cursor: hasJoined || full || timedOut ? 'default' : 'pointer',
                  opacity: timedOut ? 0.7 : 1
                }}
              >
                {hasJoined
                  ? <><IoCheckmark size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Already Joined</>
                  : full ? 'Game Full'
                  : timedOut ? <><IoTimer size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Game Starting Soon</>
                  : 'Join Game'}
              </button>
            </div>

            {/* Cancel booking */}
            {hasJoined && (
              <div className="fade-up-2" style={{ marginBottom: 16 }}>
                <button
                  onClick={() => navigate(`/game/${id}/cancel`)}
                  style={{
                    width: '100%', padding: '12px',
                    background: 'transparent', color: 'var(--red)',
                    border: '1.5px solid var(--red)', borderRadius: 10,
                    fontWeight: 700, fontSize: 14, cursor: 'pointer'
                  }}
                >
                  <IoClose size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Cancel Booking
                </button>
              </div>
            )}

            {/* Admin rate button */}
            {isAdmin && isOwner && (
              <div className="fade-up-2" style={{ marginBottom: 16 }}>
                <button onClick={() => navigate(`/game/${id}/rate`)} style={{
                  width: '100%', padding: '13px', background: 'transparent', color: 'var(--accent)',
                  border: '1.5px solid var(--accent)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer'
                }}><FaRankingStar /> Rate Players for this Game</button>
              </div>
            )}
          </>
        )}

        {/* ── MATCH SUMMARY (inline, shown when game has ended) ── */}
        {ended && (
          <div className="fade-up-2" style={{ marginBottom: 20 }}>
            {isRated && sortedRatings.length > 0 ? (
              <>
                {/* Baller of The Match */}
                {top3.length > 0 && (
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: 16, marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 12 }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)' }}>
                        BALLERS OF THE MATCH
                      </div>
                      <button onClick={() => navigate('/baller-info')} style={{
                        position: 'absolute', right: 0,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted)', padding: 0, display: 'flex', alignItems: 'center',
                      }}>
                        <IoInformationCircleOutline size={18} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 10 }}>
                      {top3.map((r) => {
                        const p = ratingProfiles[r.user_id];
                        const rank = getRank(p?.total_points);
                        const rankColor = getRankColor(rank);
                        const isMe = r.user_id === userId;
                        const hasUp = STAT_KEYS.some(({ key }) => (r[key] || 0) > 0);
                        const hasDown = !hasUp && STAT_KEYS.some(({ key }) => (r[key] || 0) < 0);
                        return (
                          <div key={r.user_id} className="fade-up" style={{
                            background: 'var(--card2)',
                            border: `1.5px solid ${isMe ? 'rgba(240,157,81,0.5)' : 'var(--border)'}`,
                            borderRadius: 12, padding: '14px 10px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: 8, textAlign: 'center',
                            boxShadow: isMe ? '0 0 16px rgba(240,157,81,0.18)' : 'none',
                            position: 'relative',
                          }}>
                            {hasUp && <FaArrowTrendUp size={24} color="#4ade80" style={{ position: 'absolute', top: 8, right: 8 }} />}
                            {hasDown && <FaArrowTrendDown size={24} color="#f87171" style={{ position: 'absolute', top: 8, right: 8 }} />}
                            <PlayerAvatar profile={p} size={44} borderColor={rankColor} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: isMe ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 84 }}>
                                {p?.name || 'Unknown'}
                              </div>
                              <div style={{ fontFamily: "'Space Mono'", fontSize: 9, fontWeight: 700, color: rankColor, marginTop: 2 }}>{rank}</div>
                              {isMe && (
                                <span style={{ fontSize: 8, background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.3)', borderRadius: 4, padding: '1px 5px', fontFamily: "'Space Mono'", marginTop: 4, display: 'inline-block' }}>YOU</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <StatChips rating={r} size="sm" />
                              <GoalAssistBadges rating={r} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Full standings */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 12 }}>
                    PLAYER STATISTICS
                  </div>
                  {shuffledRatings.map((r) => {
                    const p = ratingProfiles[r.user_id];
                    const rank = getRank(p?.total_points);
                    const rankColor = getRankColor(rank);
                    const isMe = r.user_id === userId;
                    const hasUp = STAT_KEYS.some(({ key }) => (r[key] || 0) > 0);
                    const hasDown = !hasUp && STAT_KEYS.some(({ key }) => (r[key] || 0) < 0);
                    return (
                      <div key={r.user_id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px',
                        background: isMe ? 'rgba(240,157,81,0.07)' : 'var(--card2)',
                        border: `1px solid ${isMe ? 'rgba(240,157,81,0.25)' : 'var(--border)'}`,
                        borderRadius: 9, marginBottom: 6,
                      }}>
                        <PlayerAvatar profile={p} size={34} borderColor={rankColor} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: isMe ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p?.name || 'Unknown'}
                            </span>
                            {isMe && <span style={{ fontSize: 9, background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.3)', borderRadius: 3, padding: '1px 5px', fontFamily: "'Space Mono'", flexShrink: 0 }}>YOU</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: rankColor }}>{rank}</span>
                            <GoalAssistBadges rating={r} />
                          </div>
                        </div>
                        <div className="summary-chips-col" style={{ flexShrink: 1, minWidth: 0, maxWidth: 130 }}>
                          <StatChips rating={r} size="sm" />
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {hasUp && <FaArrowTrendUp size={22} color="#4ade80" />}
                          {hasDown && <FaArrowTrendDown size={22} color="#f87171" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Nudge for non-top-3 */}
                {myRating && !sortedRatings.slice(0, 3).find(r => r.user_id === userId) && (
                  <div style={{
                    background: 'rgba(240,157,81,0.05)', border: '1px solid rgba(240,157,81,0.18)',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                    fontSize: 13, color: 'var(--muted)', lineHeight: 1.7,
                  }}>
                    Keep playing and earning stats to climb into the top 3 next time!
                  </div>
                )}
              </>
            ) : (
              // Ratings not yet submitted by manager
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '32px 20px', marginBottom: 16, textAlign: 'center',
              }}>
                <GiTrophy size={36} color="var(--muted)" style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>
                  RATINGS PENDING
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                  The manager hasn't submitted ratings yet.<br />Check back shortly for the match summary.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Player list — shown always (collapsed label when ended) */}
        {players.length > 0 && (
          <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            {(() => {
              const avgOvr = Math.round(players.reduce((sum, p) => sum + (p.total_points || 30), 0) / players.length);
              const avgRank = getRank(avgOvr);
              const avgColor = getRankColor(avgRank);
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)' }}>
                    PLAYERS JOINED ({players.length}/{game.slots})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 10, color: 'var(--muted)' }}>AVG</span>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: avgColor, lineHeight: 1 }}>{avgOvr}</span>
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 10, fontWeight: 700, color: avgColor, background: `${avgColor}18`, border: `1px solid ${avgColor}55`, borderRadius: 5, padding: '2px 7px' }}>{avgRank}</span>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 2 }}>
              {players.map((p) => {
                const isMe = p.id === userId;
                const name = p.name || 'Player';
                const initials = name.slice(0, 2).toUpperCase();
                const rank = getRank(p.total_points);
                const rankColor = getRankColor(rank);
                const isVerified = p.is_subscribed && p.subscription_expires_at && new Date(p.subscription_expires_at) > new Date();
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: isMe ? `${rankColor}14` : 'var(--card2)',
                    border: `1px solid ${isMe ? rankColor + '55' : 'var(--border)'}`,
                    borderLeft: `3px solid ${rankColor}`,
                    borderRadius: 10,
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${rankColor}`,
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--card)'
                    }}>
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: rankColor }}>{initials}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: isMe ? rankColor : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </span>
                        {isVerified && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, fontSize: 9, color: '#fff' }}><IoCheckmark size={9} /></span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: rankColor }}>{rank}</span>
                        {p.position && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {p.position}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: rankColor, lineHeight: 1 }}>{p.total_points || 30}</div>
                      <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginTop: 1 }}>OVR</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin rate button — shown when ended and not yet rated */}
        {ended && isAdmin && isOwner && !isRated && (
          <div className="fade-up-2" style={{ marginBottom: 16 }}>
            <button onClick={() => navigate(`/game/${id}/rate`)} style={{
              width: '100%', padding: '13px', background: 'transparent', color: 'var(--accent)',
              border: '1.5px solid var(--accent)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer'
            }}><FaRankingStar /> Rate Players for this Game</button>
          </div>
        )}

        {/* Player feedback CTA — shown when ended, joined, and not yet submitted */}
        {ended && hasJoined && (
          <div className="fade-up-2" style={{ marginBottom: 16 }}>
            {hasFeedback ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', color: 'var(--muted)', fontSize: 13,
              }}><IoCheckmark size={14} /> Feedback submitted for this game</div>
            ) : (
              <button onClick={() => navigate(`/game/${id}/feedback`)} style={{
                width: '100%', padding: '13px', background: 'transparent', color: 'var(--accent)',
                border: '1.5px solid var(--accent)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}>Leave Feedback</button>
            )}
          </div>
        )}

        {game.description && (
          <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>MATCH DESCRIPTION</div>
            <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.8, opacity: 0.8 }}>{game.description}</p>
          </div>
        )}

        <GameRulesDisplay gameRules={game.game_rules} format={game.format} />

        {field?.field_rules && (
          <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>FIELD RULES</div>
            <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', opacity: 0.8 }}>{field.field_rules}</p>
          </div>
        )}

        {game.shoes_type && (
          <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>SHOES REQUIRED</div>
            <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }}>{game.shoes_type}</span>
          </div>
        )}

        {field && (field.has_toilet || field.has_parking || field.has_shop || field.has_shoe_rent) && (
          <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>FACILITIES</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {field.has_toilet && <div style={facilityItem}><LuToilet /> Toilet</div>}
              {field.has_parking && <div style={facilityItem}><FaSquareParking /> Parking</div>}
              {field.has_shop && <div style={facilityItem}><CiShop /> Shop / Canteen</div>}
            </div>
          </div>
        )}

        <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 6 }}><FaLocationDot size={16} /> LOCATION</div>
          <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.8 }}>{field?.address}</p>
          {game.court && (
            <p style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginTop: 6 }}>Head to Court {game.court} on arrival</p>
          )}
        </div>

      </div>
    </div>
  );
}
