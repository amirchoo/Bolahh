import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Same assumed match duration used by GameFeedbackPage.jsx's own eligibility check.
const GAME_DURATION_MS = 2 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Invoked by a scheduled cron job (pg_cron -> pg_net), not a logged-in user.
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const nowUtc = new Date();
    // games.date/time are Malaysia (UTC+8) local wall-clock values, so pull candidates
    // by local calendar date first, then precisely filter below.
    const todayStr = nowUtc.toISOString().slice(0, 10);
    const yesterdayStr = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: candidateGames } = await supabase
      .from('games')
      .select('id, title, date, time')
      .in('date', [yesterdayStr, todayStr]);

    const endedGames = (candidateGames || []).filter(g => {
      if (!g.time) return false;
      const [gy, gm, gd] = g.date.split('-').map(Number);
      const [gh, gmin] = g.time.split(':').map(Number);
      const gameStartUtc = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
      const gameEndUtc = new Date(gameStartUtc.getTime() + GAME_DURATION_MS);
      return gameEndUtc <= nowUtc;
    });

    if (endedGames.length === 0) {
      return new Response(JSON.stringify({ gamesProcessed: 0, notified: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    let totalNotified = 0;

    for (const game of endedGames) {
      const { data: players } = await supabase
        .from('game_players')
        .select('id, user_id')
        .eq('game_id', game.id)
        .is('feedback_notified_at', null);

      if (!players || players.length === 0) continue;

      const { data: existingFeedback } = await supabase
        .from('game_feedback').select('user_id').eq('game_id', game.id);
      const alreadySubmitted = new Set((existingFeedback || []).map(f => f.user_id));

      const pending = players.filter(p => !alreadySubmitted.has(p.user_id));
      if (pending.length === 0) continue;

      // Guests (no user_id — no account to notify) never owe feedback, but still get
      // flagged notified below so they drop out of this query on future runs.
      const notifiable = pending.filter(p => p.user_id);
      if (notifiable.length > 0) {
        const rows = notifiable.map(p => ({
          user_id: p.user_id,
          type: 'game_feedback',
          title: 'How was your game?',
          body: `Rate the venue and your teammates from ${game.title}.`,
          link: `/game/${game.id}/feedback`,
        }));

        const { error: insertErr } = await supabase.from('notifications').insert(rows);
        if (insertErr) { console.error('Notification insert failed for game', game.id, insertErr); continue; }
      }

      await supabase
        .from('game_players')
        .update({ feedback_notified_at: new Date().toISOString() })
        .in('id', pending.map(p => p.id));

      totalNotified += pending.length;
    }

    return new Response(JSON.stringify({ gamesProcessed: endedGames.length, notified: totalNotified }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-feedback-notifications error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
