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
  feedbackUrl: string;
}) {
  const { playerName, gameTitle, fieldName, dateStr, timeStr, gameUrl, feedbackUrl } = opts;
  // Colors/fonts match the app 1:1 (client/src/styles/globals.css) and the
  // send-game-reminder function's template, for a consistent look across emails.
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
        <div style="font-family:'Bebas Neue', Arial, sans-serif; font-size:26px; font-weight:400; letter-spacing:1.5px; color:#111213;">GAME SUMMARY IS HERE</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">Hey ${playerName || 'there'},</p>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
          Thanks for playing <strong style="color:#F09D51;">${gameTitle}</strong>. Your match summary, including stats, ratings and MVP awards, is now ready to view.
        </p>
        <div style="background:#222426; border:1px solid #2e3032; border-radius:10px; padding:14px 16px; margin-bottom:20px; font-family:'Space Mono', 'Courier New', monospace; font-size:13px; line-height:1.9; color:#e8e9eb;">
          <div>📍 ${fieldName}</div>
          <div>📅 ${dateStr}</div>
          <div>🕒 ${timeStr}</div>
        </div>
        <div style="text-align:center; margin-bottom:20px;">
          <a href="${gameUrl}" style="display:inline-block; background:#F09D51; color:#111213; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
            View Match Summary
          </a>
        </div>
        <p style="margin:0 0 12px; font-size:14px; line-height:1.6; color:#6b6d6f;">
          Got a minute? Let us know how the venue was and rate your teammates' sportsmanship. It helps us make every game better.
        </p>
        <div style="text-align:center;">
          <a href="${feedbackUrl}" style="color:#F09D51; font-size:13px; font-weight:600; text-decoration:none;">
            Give Feedback →
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
    const { game_id } = await req.json();
    if (!game_id) {
      return new Response(JSON.stringify({ error: 'Missing game_id' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Only the manager assigned to the game (or the super-admin) can trigger this,
    // verified via their JWT.
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { data: game } = await supabase
      .from('games').select('*, fields(name)').eq('id', game_id).single();

    if (!game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (game.assigned_manager_id !== user.id) {
      const { data: actingProfile } = await supabase
        .from('profiles').select('is_super_admin').eq('id', user.id).single();
      if (!actingProfile?.is_super_admin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: gamePlayers } = await supabase
      .from('game_players').select('user_id').eq('game_id', game_id);

    const userIds = (gamePlayers || []).map(p => p.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { data: profiles } = await supabase
      .from('profiles').select('id, name, email').in('id', userIds);

    const recipients = (profiles || []).filter(p => !!p.email);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const fromAddr = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Bolahh <admin@bolahh.com>';

    const dateStr = new Date(`${game.date}T00:00:00`).toLocaleDateString('en-MY', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const timeStr = game.time ? formatTime12h(game.time) : '';
    const gameUrl = `https://bolahh.com/game/${game_id}`;
    const feedbackUrl = `${gameUrl}/feedback`;

    const emails = recipients.map(p => ({
      from: fromAddr,
      to: p.email,
      subject: `Game Summary for ${game.title} is here!`,
      html: buildEmailHtml({
        playerName: p.name,
        gameTitle: game.title,
        fieldName: game.fields?.name || game.area || 'the venue',
        dateStr, timeStr, gameUrl, feedbackUrl,
      }),
    }));

    // Resend's batch endpoint accepts up to 100 emails per call — plenty for a single game roster.
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emails),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend batch send failed:', text);
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: recipients.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-game-summary error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
