import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import { FaRankingStar } from "react-icons/fa6";
import { FaSquareParking } from 'react-icons/fa6';
import { LuToilet } from 'react-icons/lu';
import { CiShop } from 'react-icons/ci';
import { FaLocationDot } from "react-icons/fa6";

export default function GameDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [game, setGame] = useState(null);
  const [field, setField] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  useEffect(() => { fetchGame(); }, [id]);

  const fetchGame = async () => {
    setLoading(true);
    const [gameRes, profileRes] = await Promise.all([
      supabase.from('games').select('*, fields(*)').eq('id', id).single(),
      supabase.from('profiles').select('wallet_balance').eq('id', user.id).single(),
    ]);
    if (gameRes.error || !gameRes.data) { navigate('/home'); return; }
    setGame(gameRes.data);
    setField(gameRes.data.fields);
    setIsOwner(gameRes.data.created_by === user?.id);
    setWalletBalance(profileRes.data?.wallet_balance || 0);

    const { count } = await supabase
      .from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', id);
    setPlayerCount(count || 0);

    const { data: existing } = await supabase
      .from('game_players').select('id').eq('game_id', id).eq('user_id', user.id).maybeSingle();
    setHasJoined(!!existing);
    setLoading(false);
  };

  const handleJoinClick = () => {
    if (hasJoined || !game) return;
    if (walletBalance < game.price) {
      setShowInsufficientModal(true);
      return;
    }
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
  const shortfall = Math.max(0, game.price - walletBalance);

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

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

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
              margin: '0 auto 18px', fontSize: 30
            }}>💸</div>

            <div style={{
              fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2,
              color: 'var(--text)', marginBottom: 8
            }}>INSUFFICIENT BALANCE</div>

            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 22 }}>
              Your wallet doesn't have enough funds to join this game. Top up to continue.
            </p>

            {/* Breakdown */}
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

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => navigate('/home')} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
        }}>← Back to Games</button>

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
          <div className="fade-up" style={{ width: '100%', height: 200, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, fontSize: 48 }}>⚽</div>
        )}

        {/* Title + tags */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}><FaLocationDot size ={25}/> {field?.name} ,{game.area}</h1>
              <p style={{ fontFamily:"Bebas Neue",color: 'var(--text)', fontSize: 30, opacity: 1 }}>{formatDate(game.date)} / {formatTime(game.time)}</p>
              <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.75 }}>{game.title}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)', borderRadius: 6, padding: '4px 14px', fontSize: 13, fontFamily: "'Space Mono'", fontWeight: 700 }}>{game.format}</span>
              <div style={{ marginTop: 6, fontFamily: "'Space Mono'", fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>RM {game.price}</div>
            </div>
          </div>
        </div>

        {/* Wallet balance hint */}
        {!hasJoined && !full && (
          <div style={{
            background: walletBalance >= game.price ? 'rgba(74,222,128,0.06)' : 'rgba(224,62,26,0.06)',
            border: `1px solid ${walletBalance >= game.price ? 'rgba(74,222,128,0.2)' : 'rgba(224,62,26,0.2)'}`,
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13
          }}>
            <span style={{ color: 'var(--muted)' }}>💰 Wallet balance</span>
            <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: walletBalance >= game.price ? '#4ade80' : 'var(--red)' }}>
              RM {walletBalance.toFixed(2)} {walletBalance >= game.price ? '✓' : `— need RM ${shortfall.toFixed(2)} more`}
            </span>
          </div>
        )}

        {/* Slot bar + Join */}
        <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{playerCount}/{game.slots} players joined</span>
            <span style={{ color: full ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
              {full ? 'FULL' : `${open} slots open`}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--red)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>

          <button
            onClick={handleJoinClick}
            disabled={full || hasJoined}
            style={{
              width: '100%', padding: '13px',
              background: hasJoined ? 'transparent' : full ? 'transparent' : 'var(--accent)',
              color: hasJoined ? 'var(--accent)' : full ? 'var(--muted)' : '#fff',
              border: hasJoined ? '1.5px solid var(--accent)' : full ? '1px solid var(--border)' : 'none',
              borderRadius: 10, fontWeight: 700, fontSize: 15, transition: 'all 0.15s',
              cursor: hasJoined || full ? 'default' : 'pointer'
            }}
          >
            {hasJoined ? '✓ Already Joined' : full ? 'Game Full' : 'Join Game'}
          </button>
        </div>

        {/* Admin rate button */}
        {isAdmin && isOwner && (
          <div className="fade-up-2" style={{ marginBottom: 16 }}>
            <button onClick={() => navigate(`/game/${id}/rate`)} style={{
              width: '100%', padding: '13px', background: 'transparent', color: 'var(--accent)',
              border: '1.5px solid var(--accent)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer'
            }}><FaRankingStar /> Rate Players for this Game</button>
          </div>
        )}

        {game.description && (
          <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>MATCH DESCRIPTION</div>
            <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.8, opacity: 0.8 }}>{game.description}</p>
          </div>
        )}

        {game.game_rules && (
          <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>GAME RULES</div>
            <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', opacity: 0.8 }}>{game.game_rules}</p>
          </div>
        )}

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
              {field.has_toilet && <div style={facilityItem}><LuToilet/> Toilet</div>}
              {field.has_parking && <div style={facilityItem}><FaSquareParking/>Parking</div>}
              {field.has_shop && <div style={facilityItem}><CiShop/>Shop / Canteen</div>}
              {field.has_shoe_rent && <div style={facilityItem}> <GiRunningShoe/>Shoe Rent</div>}
            </div>
          </div>
        )}

        <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={sectionTitle}>📍 LOCATION</div>
          <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.8 }}>{field?.address}</p>
        </div>

      </div>
    </div>
  );
}
