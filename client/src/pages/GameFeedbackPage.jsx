import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IoStar, IoStarOutline, IoCheckmarkCircle, IoCloseCircle, IoRemoveCircle } from 'react-icons/io5';
import { GiSoccerBall } from 'react-icons/gi';

const SPORTSMANSHIP_TAGS = [
  'Good Passing', 'Good Shooting', 'Good Dribbling',
  'Good Defending', 'Great Teammate', 'Good Manner',
];

function StarPicker({ value, onChange, size = 26 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1,
        }}>
          {n <= value
            ? <IoStar size={size} color="var(--accent)" />
            : <IoStarOutline size={size} color="var(--muted)" />}
        </button>
      ))}
    </div>
  );
}

export default function GameFeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notEligible, setNotEligible] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);

  const [venueRating, setVenueRating] = useState(0);
  const [venueComment, setVenueComment] = useState('');
  const [sportsmanship, setSportsmanship] = useState({});
  const [sportsmanshipTags, setSportsmanshipTags] = useState({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);

    const { data: gameData } = await supabase
      .from('games').select('*, fields(name)').eq('id', id).single();
    if (!gameData) { navigate(`/game/${id}`); return; }
    setGame(gameData);

    const { data: joined } = await supabase
      .from('game_players').select('id').eq('game_id', id).eq('user_id', user.id).maybeSingle();
    if (!joined) { setNotEligible(true); setLoading(false); return; }

    const [gh, gm] = (gameData.time || '00:00').split(':').map(Number);
    const [gy, gmo, gd] = gameData.date.split('-').map(Number);
    const gameStart = new Date(Date.UTC(gy, gmo - 1, gd, gh - 8, gm));
    const gameEnd = new Date(gameStart.getTime() + 2 * 60 * 60 * 1000);
    if (new Date() < gameEnd) { setNotEligible(true); setLoading(false); return; }

    const { data: existing } = await supabase
      .from('game_feedback').select('id').eq('game_id', id).eq('user_id', user.id).maybeSingle();
    if (existing) { setAlreadySubmitted(true); setLoading(false); return; }

    const { data: gamePlayers } = await supabase
      .from('game_players').select('user_id').eq('game_id', id);
    const otherIds = (gamePlayers || []).map(p => p.user_id).filter(uid => uid !== user.id);
    if (otherIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles').select('id, name, avatar_url').in('id', otherIds);
      setPlayers(profilesData || []);
    }

    setLoading(false);
  };

  const setSportsmanshipRating = (uid, rating) => {
    setSportsmanship(prev => ({ ...prev, [uid]: rating }));
  };

  const toggleTag = (uid, tag) => {
    setSportsmanshipTags(prev => {
      const current = prev[uid] || [];
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      return { ...prev, [uid]: next };
    });
  };

  const handleSubmit = async () => {
    if (!venueRating) return;
    setSaving(true); setError('');
    try {
      const { error: feedbackError } = await supabase.from('game_feedback').insert({
        game_id: id,
        user_id: user.id,
        venue_rating: venueRating,
        venue_comment: venueComment.trim() || null,
      });
      if (feedbackError) throw new Error(feedbackError.message);

      const ratedEntries = Object.entries(sportsmanship).filter(([, rating]) => rating > 0);
      if (ratedEntries.length > 0) {
        const rows = ratedEntries.map(([rated_id, rating]) => ({
          game_id: id, rater_id: user.id, rated_id, rating,
          tags: sportsmanshipTags[rated_id] || [],
        }));
        const { error: sportsmanshipError } = await supabase.from('player_sportsmanship_ratings').insert(rows);
        if (sportsmanshipError) throw new Error(sportsmanshipError.message);
      }

      navigate(`/game/${id}`);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 };

  if (loading) return (
    <div style={{ minHeight: '100vh' }}><Navbar />
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GiSoccerBall size={32} color="var(--accent)" /></div><p>Loading...</p>
      </div>
    </div>
  );

  if (notEligible) return (
    <div style={{ minHeight: '100vh' }}><Navbar />
      <div className="page-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate(`/game/${id}`)} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 24 }}>← Back</button>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><IoRemoveCircle size={48} color="var(--red)" /></div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>NOT AVAILABLE</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Feedback can only be left by players who joined this game, once it has ended.</p>
        </div>
      </div>
    </div>
  );

  if (alreadySubmitted) return (
    <div style={{ minHeight: '100vh' }}><Navbar />
      <div className="page-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate(`/game/${id}`)} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 24 }}>← Back to Game</button>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><IoCheckmarkCircle size={48} color="var(--accent)" /></div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>THANKS FOR YOUR FEEDBACK</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>You've already submitted feedback for this game.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => navigate(`/game/${id}`)} style={{
          background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 24
        }}>← Back to Game</button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
            GAME FEEDBACK
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{game?.title} · {game?.fields?.name}</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoCloseCircle size={16} /> {error}
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>HOW WAS THE GAME?</div>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Rate the venue and overall experience.</p>
          <StarPicker value={venueRating} onChange={setVenueRating} />
          <textarea
            value={venueComment}
            onChange={e => setVenueComment(e.target.value)}
            placeholder="Optional comments about the field, facilities, or organizer..."
            rows={3}
            style={{
              width: '100%', marginTop: 16, padding: '10px 12px', resize: 'vertical',
              background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
              color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
            }}
          />
        </div>

        {players.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>SPORTSMANSHIP</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Optional. Rate the manner of players you played with or against.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {players.map(p => {
                const rated = (sportsmanship[p.id] || 0) > 0;
                const tagsForPlayer = sportsmanshipTags[p.id] || [];
                return (
                  <div key={p.id} style={{
                    padding: '10px 12px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name || 'Player'}</span>
                      <StarPicker value={sportsmanship[p.id] || 0} onChange={(n) => setSportsmanshipRating(p.id, n)} size={18} />
                    </div>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10,
                      opacity: rated ? 1 : 0.4, transition: 'opacity 0.15s',
                    }}>
                      {SPORTSMANSHIP_TAGS.map(tag => {
                        const active = tagsForPlayer.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            disabled={!rated}
                            onClick={() => toggleTag(p.id, tag)}
                            style={{
                              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: active ? 'rgba(240,157,81,0.15)' : 'var(--card)',
                              color: active ? 'var(--accent)' : 'var(--muted)',
                              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                              cursor: rated ? 'pointer' : 'default',
                            }}
                          >{tag}</button>
                        );
                      })}
                    </div>
                    {!rated && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Rate this player to unlock tags</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button type="button" onClick={handleSubmit} disabled={!venueRating || saving} style={{
          width: '100%', padding: '13px',
          background: venueRating ? 'var(--accent)' : 'var(--card2)',
          color: venueRating ? '#fff' : 'var(--muted)',
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
          opacity: saving ? 0.6 : 1, cursor: venueRating ? 'pointer' : 'default',
        }}>
          {saving ? 'Submitting...' : !venueRating ? 'Rate the game to continue' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
