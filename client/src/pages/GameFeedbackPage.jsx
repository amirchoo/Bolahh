import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IoStar, IoStarOutline, IoCheckmarkCircle, IoCloseCircle, IoRemoveCircle } from 'react-icons/io5';
import { GiSoccerBall } from 'react-icons/gi';
import { TEAM_COLORS, VENUE_TAGS, POSITIVE_PLAYER_TAGS, NEGATIVE_PLAYER_TAGS } from '../lib/feedbackTags';

// ── PREVIEW / DEV MODE ────────────────────────────────────────────────────────
const MOCK_GAME = {
  id: 'preview', title: 'Preview Game',
  fields: { name: 'Futsal Arena KL' },
};
const MOCK_PLAYERS = [
  { id: 'p1', name: 'Amir Hazif',   avatar_url: null, team_assignment: 'A', bib_number: 1 },
  { id: 'p2', name: 'Hafiz Noor',   avatar_url: null, team_assignment: 'A', bib_number: 2 },
  { id: 'p3', name: 'Razif Shah',   avatar_url: null, team_assignment: 'A', bib_number: 3 },
  { id: 'p4', name: 'Danial Amin',  avatar_url: null, team_assignment: 'B', bib_number: 1 },
  { id: 'p5', name: 'Syafiq Rizal', avatar_url: null, team_assignment: 'B', bib_number: 2 },
  { id: 'p6', name: 'Irfan Zaki',   avatar_url: null, team_assignment: 'B', bib_number: 3 },
];
// ──────────────────────────────────────────────────────────────────────────────

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
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1' && isAdmin;

  const [loading, setLoading] = useState(true);
  const [notEligible, setNotEligible] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);

  const [venueRating, setVenueRating] = useState(0);
  const [venueComment, setVenueComment] = useState('');
  const [venueTags, setVenueTags] = useState([]);
  const [sportsmanship, setSportsmanship] = useState({});
  const [sportsmanshipTags, setSportsmanshipTags] = useState({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);

    if (isPreview) {
      setGame(MOCK_GAME);
      setPlayers(MOCK_PLAYERS);
      setLoading(false);
      return;
    }

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
      .from('game_players').select('user_id, team_assignment, bib_number').eq('game_id', id);
    const otherRows = (gamePlayers || []).filter(p => p.user_id !== user.id);
    if (otherRows.length > 0) {
      const otherIds = otherRows.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles').select('id, name, avatar_url').in('id', otherIds);
      const profileMap = {};
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
      setPlayers(otherRows.map(row => ({
        ...profileMap[row.user_id],
        id: row.user_id,
        team_assignment: row.team_assignment,
        bib_number: row.bib_number,
      })));
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

  const toggleVenueTag = (tag) => {
    setVenueTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (!venueRating) return;
    if (isPreview) { setError(''); alert('Preview mode. No data written.'); return; }
    setSaving(true); setError('');
    try {
      const { error: feedbackError } = await supabase.from('game_feedback').insert({
        game_id: id,
        user_id: user.id,
        venue_rating: venueRating,
        venue_comment: venueComment.trim() || null,
        tags: venueTags,
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
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12,
            opacity: venueRating ? 1 : 0.4, transition: 'opacity 0.15s',
          }}>
            {VENUE_TAGS.map(tag => {
              const active = venueTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={!venueRating}
                  onClick={() => toggleVenueTag(tag)}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: active ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: venueRating ? 'pointer' : 'default',
                  }}
                >{tag}</button>
              );
            })}
          </div>
          {!venueRating && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Rate the venue to unlock tags</div>
          )}
        </div>

        {players.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>SPORTSMANSHIP</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Optional. Rate the manner of players you played with or against.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {players.map(p => {
                const rated = (sportsmanship[p.id] || 0) > 0;
                const tagsForPlayer = sportsmanshipTags[p.id] || [];
                const tc = p.team_assignment ? TEAM_COLORS[p.team_assignment] : null;
                return (
                  <div key={p.id} style={{
                    padding: '10px 12px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        {tc && p.bib_number != null && (
                          <span style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                            background: tc.bg, border: `1px solid ${tc.border}`,
                            color: tc.text, fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700,
                          }}>{p.bib_number}</span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Player'}</span>
                      </div>
                      <StarPicker value={sportsmanship[p.id] || 0} onChange={(n) => setSportsmanshipRating(p.id, n)} size={18} />
                    </div>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10,
                      opacity: rated ? 1 : 0.4, transition: 'opacity 0.15s',
                    }}>
                      {POSITIVE_PLAYER_TAGS.map(tag => {
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
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6,
                      opacity: rated ? 1 : 0.4, transition: 'opacity 0.15s',
                    }}>
                      {NEGATIVE_PLAYER_TAGS.map(tag => {
                        const active = tagsForPlayer.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            disabled={!rated}
                            onClick={() => toggleTag(p.id, tag)}
                            style={{
                              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: active ? 'rgba(224,62,26,0.12)' : 'var(--card)',
                              color: active ? 'var(--red)' : 'var(--muted)',
                              border: `1px solid ${active ? 'var(--red)' : 'var(--border)'}`,
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
