import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatTime12h(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function buildEmailHtml(opts: {
  playerName: string;
  gameTitle: string;
  fieldName: string;
  dateStr: string;
  timeStr: string;
  gameUrl: string;
  shoesType: string | null;
}) {
  const { playerName, gameTitle, fieldName, dateStr, timeStr, gameUrl, shoesType } = opts;
  const shoesLine = shoesType
    ? `Required for this pitch: <strong>${shoesType}</strong>.`
    : `Bring appropriate footwear for the pitch surface.`;
  // Colors match the app's CSS custom properties 1:1 (client/src/styles/globals.css):
  // --bg #111213, --card #1a1b1d, --card2 #222426, --border #2e3032, --muted #6b6d6f,
  // --text #e8e9eb, --accent #F09D51. Fonts are the same Google Fonts family the app
  // loads (Bebas Neue / DM Sans / Space Mono) — most mail clients ignore the <link> and
  // fall back to the stacks below, which is expected for HTML email.
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0; background:#111213;">
  <div style="font-family:'DM Sans', Arial, sans-serif; background:#111213; padding:32px 16px; color:#e8e9eb;">
    <div style="max-width:480px; margin:0 auto; background:#1a1b1d; border:1px solid #2e3032; border-radius:14px; overflow:hidden;">
      <div style="padding:18px 24px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding-right:8px;"><img src="https://bolahh.com/apple-touch-icon.png" width="26" height="26" alt="Bolahh" style="display:block; border-radius:6px;" /></td>
            <td style="font-family:'Bebas Neue', Arial, sans-serif; font-size:18px; letter-spacing:3px; color:#e8e9eb; vertical-align:middle;">B<span style="color:#F09D51;">O</span>LAHH</td>
          </tr>
        </table>
      </div>
      <div style="background:#F09D51; padding:20px 24px; margin-top:14px;">
        <div style="font-family:'Bebas Neue', Arial, sans-serif; font-size:26px; font-weight:400; letter-spacing:1.5px; color:#111213;">GAME CONFIRMED</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">Hey ${playerName || 'there'},</p>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
          Your game <strong style="color:#F09D51;">${gameTitle}</strong> is confirmed and kicking off soon. We can't wait to see you there!
        </p>
        <div style="background:#222426; border:1px solid #2e3032; border-radius:10px; padding:14px 16px; margin-bottom:16px; font-family:'Space Mono', 'Courier New', monospace; font-size:13px; line-height:1.9; color:#e8e9eb;">
          <div>📍 ${fieldName}</div>
          <div>📅 ${dateStr}</div>
          <div>🕒 ${timeStr}</div>
        </div>
        <div style="background:rgba(224,62,26,0.08); border:1px solid rgba(224,62,26,0.3); border-radius:10px; padding:14px 16px; margin-bottom:20px;">
          <div style="font-family:'Bebas Neue', Arial, sans-serif; font-size:16px; letter-spacing:1px; color:#e03e1a; margin-bottom:5px;">⏰ BE ON TIME</div>
          <div style="font-size:13px; line-height:1.6; color:#e8e9eb;">
            Please arrive at least <strong>10 minutes early</strong> so kickoff isn't delayed for everyone else. Repeated lateness may result in points deducted from your player rating.
          </div>
        </div>
        <div style="background:rgba(240,157,81,0.08); border:1px solid rgba(240,157,81,0.25); border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:13px; line-height:1.7; color:#e8e9eb;">
          <div style="margin-bottom:6px;">💧 Hydrate well and bring a bottle of water for the match.</div>
          <div>👟 ${shoesLine}</div>
        </div>
        <div style="text-align:center; margin-bottom:4px;">
          <a href="${gameUrl}" style="display:inline-block; background:#F09D51; color:#111213; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
            View Game Details
          </a>
        </div>
      </div>
      <div style="padding:16px 24px; border-top:1px solid #2e3032; font-family:'Space Mono', 'Courier New', monospace; font-size:11px; color:#6b6d6f;">
        Bolahh · bolahh.com
      </div>
    </div>
  </div>
  </body>
  </html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Invoked by a scheduled cron job (pg_cron -> pg_net), not a logged-in user, so
    // authorization is a shared secret rather than a JWT check.
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const nowUtc = new Date();
    const windowEnd = new Date(nowUtc.getTime() + 5 * 60 * 60 * 1000);

    // games.date/time are Malaysia (UTC+8) local wall-clock values with no tz info attached,
    // so candidates are pulled by local calendar date first, then precisely filtered below
    // by converting each game's date+time into its actual UTC instant.
    const todayStr = nowUtc.toISOString().slice(0, 10);
    const tomorrowStr = new Date(nowUtc.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: candidateGames } = await supabase
      .from('games')
      .select('id, title, area, date, time, shoes_type, fields(name)')
      .in('date', [todayStr, tomorrowStr])
      .is('reminder_sent_at', null);

    const dueGames = (candidateGames || []).filter(g => {
      if (!g.time) return false;
      const [gy, gm, gd] = g.date.split('-').map(Number);
      const [gh, gmin] = g.time.split(':').map(Number);
      const gameStartUtc = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
      return gameStartUtc > nowUtc && gameStartUtc <= windowEnd;
    });

    if (dueGames.length === 0) {
      return new Response(JSON.stringify({ gamesProcessed: 0, sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const fromAddr = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Bolahh <admin@bolahh.com>';
    let totalSent = 0;

    for (const game of dueGames) {
      const { data: gamePlayers } = await supabase
        .from('game_players').select('user_id').eq('game_id', game.id);
      // Guests (booked by someone else, no account) have no user_id to notify.
      const userIds = (gamePlayers || []).map(p => p.user_id).filter(Boolean);

      if (userIds.length > 0) {
        // In-app notification — independent of whether the player has an email on
        // file, unlike the Resend batch below.
        const timeStrShort = formatTime12h(game.time);
        await supabase.from('notifications').insert(
          userIds.map(uid => ({
            user_id: uid,
            type: 'game_reminder',
            title: 'Game starting soon',
            body: `${game.title} kicks off soon, at ${timeStrShort}.`,
            link: `/game/${game.id}`,
          }))
        );
      }

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, name, email').in('id', userIds);
        const recipients = (profiles || []).filter(p => !!p.email);

        if (recipients.length > 0) {
          const dateStr = new Date(`${game.date}T00:00:00`).toLocaleDateString('en-MY', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          });
          const timeStr = formatTime12h(game.time);
          const gameUrl = `https://bolahh.com/game/${game.id}`;

          const emails = recipients.map(p => ({
            from: fromAddr,
            to: p.email,
            subject: `Your game is confirmed: ${game.title}`,
            html: buildEmailHtml({
              playerName: p.name,
              gameTitle: game.title,
              fieldName: game.fields?.name || game.area || 'the venue',
              dateStr, timeStr, gameUrl,
              shoesType: game.shoes_type || null,
            }),
          }));

          const res = await fetch('https://api.resend.com/emails/batch', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(emails),
          });

          if (res.ok) totalSent += recipients.length;
          else console.error('Resend batch send failed for game', game.id, await res.text());
        }
      }

      await supabase.from('games').update({ reminder_sent_at: new Date().toISOString() }).eq('id', game.id);
    }

    return new Response(JSON.stringify({ gamesProcessed: dueGames.length, sent: totalSent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-game-reminder error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
