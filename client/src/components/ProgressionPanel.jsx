import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import RankBadge from './RankBadge';
import GrowthChart from './GrowthChart';
import { IconLoading } from './Icons';
import { getRank } from '../lib/rankUtils';
import { calcOverall } from './FifaCard';

// Shared by ProgressionPage (full page) and ProfilePage (inline expanding
// panel) so the game_ratings replay logic below only lives in one place.
export default function ProgressionPanel({ showRankBadge = true }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState('Novis');
  const [growthHistory, setGrowthHistory] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetchGrowth();
  }, [user]);

  // Same backward-anchored reconstruction as before: game_ratings' per-game
  // deltas replayed from the profile's actual current card_stats backward, so
  // the graph's endpoint always matches the real card no matter how much
  // older rating history predates the current stat columns.
  const fetchGrowth = async () => {
    setLoading(true);
    const [{ data: ratings }, { data: profileRow }, { data: firstJoin }] = await Promise.all([
      supabase.from('game_ratings')
        .select('created_at, shooting_quality, passing_quality, good_defending, good_keeping, successful_dribble, good_chance')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('card_stats, total_points').eq('id', user.id).single(),
      supabase.from('game_players').select('joined_at').eq('user_id', user.id).order('joined_at', { ascending: true }).limit(1).maybeSingle(),
    ]);

    const currentCardStats = profileRow?.card_stats || { pac: 30, sho: 30, pas: 30, dri: 30, def: 30, phy: 30 };
    setRank(getRank(profileRow?.total_points ?? calcOverall(currentCardStats)));

    if (!ratings || ratings.length === 0) { setGrowthHistory([]); setLoading(false); return; }

    const stats = { pac: 30, sho: 30, pas: 30, dri: 30, def: 30, phy: 30, ...currentCardStats };
    const statMap = [
      ['pac', 'good_chance'], ['sho', 'shooting_quality'], ['pas', 'passing_quality'],
      ['dri', 'successful_dribble'], ['def', 'good_defending'], ['phy', 'good_keeping'],
    ];
    const pointsDesc = ratings.map(row => {
      const point = { date: row.created_at, overall: calcOverall(stats) };
      statMap.forEach(([statKey, col]) => {
        stats[statKey] = Math.max(30, Math.min(99, stats[statKey] - (row[col] || 0)));
      });
      return point;
    });

    const history = pointsDesc.reverse();

    // The ledger only goes as far back as game_ratings has rows — older games
    // rated under a previous scoring system leave no delta trail to replay.
    // But every account provably starts at a flat 30 (Novis), so anchor the
    // graph there using the player's first game join date, rather than
    // letting it silently start mid-climb with no explanation.
    if (history[0].overall !== 30 && firstJoin?.joined_at && new Date(firstJoin.joined_at) < new Date(history[0].date)) {
      history.unshift({ date: firstJoin.joined_at, overall: 30 });
    }

    setGrowthHistory(history);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
        <IconLoading size={48} />
      </div>
    );
  }

  return (
    <>
      {showRankBadge && (
        <div style={{ maxWidth: 220, margin: '0 auto 20px' }}>
          <RankBadge rank={rank} updatedDate={growthHistory[growthHistory.length - 1]?.date} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <GrowthChart history={growthHistory} />
      </div>

      <button
        onClick={() => navigate('/guide#ranks')}
        style={{
          width: '100%', background: 'var(--card)', color: 'var(--accent)',
          border: '1px solid var(--border)', borderRadius: 12, padding: '14px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >View Full Level Guide →</button>
    </>
  );
}
