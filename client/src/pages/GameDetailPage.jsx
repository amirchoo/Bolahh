import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {IconLoading } from '../components/Icons';

export default function GameDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [game, setGame] = useState(null);
  const [field, setField] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => { fetchGame(); }, [id]);

  const fetchGame = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('games').select('*, fields(*)').eq('id', id).single();
    if (error || !data) { navigate('/home'); return; }
    setGame(data);
    setField(data.fields);
    setIsOwner(data.created_by === user?.id);

    const { count } = await supabase
      .from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', id);
    setPlayerCount(count || 0);

    const { data: existing } = await supabase
      .from('game_players').select('id').eq('game_id', id).eq('user_id', user.id).single();
    setHasJoined(!!existing);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (hasJoined) return;
    setJoining(true);
    const { error } = await supabase.from('game_players').insert({ game_id: id, user_id: user.id });
    if (!error) { setPlayerCount(prev => prev + 1); setHasJoined(true); setShowSuccess(true); }
    setJoining(false);
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

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => navigate('/home')} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          ← Back to Games
        </button>

        {/* Field images */}
        {field?.images?.length > 0 ? (
          <div className="fade-up" style={{ marginBottom: 24 }}>
            <div style={{
              width: '100%', height: 240, borderRadius: 16, overflow: 'hidden',
              marginBottom: 8, border: '1px solid var(--border)'
            }}>
              <img src={field.images[selectedImage]} alt={field.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {field.images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {field.images.map((url, i) => (
                  <img key={i} src={url} alt={`Field ${i + 1}`} onClick={() => setSelectedImage(i)}
                    style={{
                      width: 72, height: 52, objectFit: 'cover', borderRadius: 8,
                      flexShrink: 0, cursor: 'pointer',
                      border: `2px solid ${selectedImage === i ? 'var(--accent)' : 'var(--border)'}`,
                      transition: 'border 0.15s'
                    }} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="fade-up" style={{
            width: '100%', height: 200, borderRadius: 16,
            background: 'var(--card)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24, fontSize: 48
          }}>⚽</div>
        )}

        {/* Title + tags */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
                {game.title}
              </h1>
              <p style={{ color: 'var(--text)', fontSize: 14, opacity: 0.75 }}>📍 {field?.name} · {game.area}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                background: 'rgba(240,157,81,0.12)', color: 'var(--accent)',
                border: '1px solid rgba(240,157,81,0.25)',
                borderRadius: 6, padding: '4px 14px', fontSize: 13, fontFamily: "'Space Mono'", fontWeight: 700
              }}>{game.format}</span>
              <div style={{ marginTop: 6, fontFamily: "'Space Mono'", fontSize: 16, color: 'var(--tomato)', fontWeight: 700 }}>
                RM {game.price}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <span style={tagStyle}>📅 {game.date}</span>
            <span style={tagStyle}>🕐 {game.time}</span>
            {game.shoes_type && <span style={tagStyle}>👟 {game.shoes_type}</span>}
          </div>
        </div>

        {/* Slot bar + Join */}
        <div className="fade-up-2" style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20, marginBottom: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{playerCount}/{game.slots} players joined</span>
            <span style={{ color: full ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
              {full ? 'FULL' : `${open} slots open`}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--red)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>

          {showSuccess && (
            <div style={{
              background: 'rgba(240,157,81,0.12)', border: '1px solid rgba(240,157,81,0.25)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 14,
              color: 'var(--accent)', fontSize: 13, fontWeight: 600, textAlign: 'center'
            }}>
              🎉 You're in! See you on the pitch.
            </div>
          )}

          <button onClick={handleJoin} disabled={full || hasJoined || joining} style={{
            width: '100%', padding: '13px',
            background: hasJoined ? 'transparent' : full ? 'transparent' : 'var(--accent)',
            color: hasJoined ? 'var(--accent)' : full ? 'var(--muted)' : '#fff',
            border: hasJoined ? '1.5px solid var(--accent)' : full ? '1px solid var(--border)' : 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 15, opacity: joining ? 0.6 : 1, transition: 'all 0.15s'
          }}>
            {joining ? 'Joining...' : hasJoined ? '✓ Already Joined' : full ? 'Game Full' : 'Join Game'}
          </button>
        </div>

        {/* Admin rate button - only shown to game creator */}
        {isAdmin && isOwner && (
          <div className="fade-up-2" style={{ marginBottom: 16 }}>
            <button onClick={() => navigate(`/game/${id}/rate`)} style={{
              width: '100%', padding: '13px',
              background: 'transparent', color: 'var(--accent)',
              border: '1.5px solid var(--accent)', borderRadius: 10,
              fontWeight: 700, fontSize: 14
            }}>
              🎖️ Rate Players for this Game
            </button>
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
            <div style={sectionTitle}>⚽ GAME RULES</div>
            <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', opacity: 0.8 }}>{game.game_rules}</p>
          </div>
        )}

        {field?.field_rules && (
          <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>🏟️ FIELD RULES</div>
            <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', opacity: 0.8 }}>{field.field_rules}</p>
          </div>
        )}

        {game.shoes_type && (
          <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>👟 SHOES REQUIRED</div>
            <span style={{
              background: 'rgba(240,157,81,0.12)', color: 'var(--accent)',
              border: '1px solid rgba(240,157,81,0.25)',
              borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600
            }}>{game.shoes_type}</span>
          </div>
        )}

        {field && (field.has_toilet || field.has_parking || field.has_shop || field.has_shoe_rent) && (
          <div className="fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={sectionTitle}>🏢 FACILITIES</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {field.has_toilet && <div style={facilityItem}>🚽 Toilet</div>}
              {field.has_parking && <div style={facilityItem}>🅿️ Parking</div>}
              {field.has_shop && <div style={facilityItem}>🏪 Shop / Canteen</div>}
              {field.has_shoe_rent && <div style={facilityItem}>👟 Shoe Rent</div>}
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
