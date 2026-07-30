import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mirrors GameDetailPage.jsx's STAT_KEYS/calcAwardPoints exactly, so the winners emailed
// here are always the same 3 players shown as Ballers of the Match in-app.
const STAT_KEYS = [
  { key: 'shooting_quality',   weight: 3 },
  { key: 'passing_quality',    weight: 2 },
  { key: 'successful_dribble', weight: 1 },
  { key: 'good_defending',     weight: 1 },
  { key: 'good_keeping',       weight: 1 },
  { key: 'good_chance',        weight: 1 },
];
const calcAwardPoints = (r: Record<string, number>) =>
  STAT_KEYS.reduce((sum, { key, weight }) => sum + (r[key] || 0) * weight, 0);

// Every winner gets the same celebratory treatment — no 1st/2nd/3rd distinction shown,
// just a shared gold "Baller of the Match" theme, deliberately distinct from the regular
// brand-orange emails so it reads as a special occasion.
const GOLD = '#FFD700';

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
}) {
  const { playerName, gameTitle, fieldName, dateStr, timeStr, gameUrl } = opts;
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
    <div style="max-width:480px; margin:0 auto; background:#1a1b1d; border:1.5px solid ${GOLD}; border-radius:14px; overflow:hidden; box-shadow:0 0 24px rgba(255,215,0,0.15);">
      <div style="padding:18px 24px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding-right:8px;"><img src="https://bolahh.com/apple-touch-icon.png" width="26" height="26" alt="Bolahh" style="display:block; border-radius:6px;" /></td>
            <td style="font-family:'Bebas Neue', Arial, sans-serif; font-size:18px; letter-spacing:3px; color:#e8e9eb; vertical-align:middle;">B<span style="color:#F09D51;">O</span>LAHH</td>
          </tr>
        </table>
      </div>
      <div style="background:${GOLD}; padding:22px 24px; margin-top:14px; text-align:center;">
        <div style="font-size:32px; line-height:1; margin-bottom:6px;">🏆</div>
        <div style="font-family:'Bebas Neue', Arial, sans-serif; font-size:26px; font-weight:400; letter-spacing:1.5px; color:#111213;">BALLER OF THE MATCH</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">Hey ${playerName || 'there'},</p>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
          Congrats! You're the Baller of the Match for <strong style="color:#F09D51;">${gameTitle}</strong>. Your performance stood out today, nice work out there.
        </p>
        <div style="background:#222426; border:1px solid #2e3032; border-radius:10px; padding:14px 16px; margin-bottom:20px; font-family:'Space Mono', 'Courier New', monospace; font-size:13px; line-height:1.9; color:#e8e9eb;">
          <div>📍 ${fieldName}</div>
          <div>📅 ${dateStr}</div>
          <div>🕒 ${timeStr}</div>
        </div>
        <div style="text-align:center; margin-bottom:4px;">
          <a href="${gameUrl}" style="display:inline-block; background:${GOLD}; color:#111213; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
            View Match Summary
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

    // Only the admin who created the game (verified via their JWT) can trigger this.
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
    if (game.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { data: ratingRows } = await supabase
      .from('game_ratings')
      .select('user_id, shooting_quality, passing_quality, good_defending, good_keeping, successful_dribble, good_chance, admin_bonus')
      .eq('game_id', game_id);

    if (!ratingRows || ratingRows.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const agg: Record<string, any> = {};
    ratingRows.forEach(r => {
      if (!agg[r.user_id]) {
        agg[r.user_id] = {
          user_id: r.user_id, shooting_quality: 0, passing_quality: 0,
          good_defending: 0, good_keeping: 0, successful_dribble: 0, good_chance: 0, admin_bonus: 0,
        };
      }
      STAT_KEYS.forEach(({ key }) => { agg[r.user_id][key] += r[key as keyof typeof r] || 0; });
      if ((r.admin_bonus || 0) > 0) agg[r.user_id].admin_bonus = r.admin_bonus;
    });

    const aggValues = Object.values(agg);
    const hasOfficialMotm = aggValues.some((r: any) => r.admin_bonus > 0);
    let sorted;
    if (hasOfficialMotm) {
      const motmOrder = aggValues.filter((r: any) => r.admin_bonus > 0).sort((a: any, b: any) => a.admin_bonus - b.admin_bonus);
      const others = aggValues.filter((r: any) => !r.admin_bonus).sort((a: any, b: any) => calcAwardPoints(b) - calcAwardPoints(a));
      sorted = [...motmOrder, ...others];
    } else {
      sorted = [...aggValues].sort((a: any, b: any) => calcAwardPoints(b) - calcAwardPoints(a));
    }

    const winners = sorted.slice(0, 3).filter((r: any) => calcAwardPoints(r) > 0 || r.admin_bonus > 0);
    if (winners.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const winnerIds = winners.map((w: any) => w.user_id);
    const { data: profiles } = await supabase
      .from('profiles').select('id, name, email').in('id', winnerIds);
    const profileMap: Record<string, { name: string; email: string }> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const recipients = winners
      .map((w: any) => ({ ...w, profile: profileMap[w.user_id] }))
      .filter((w: any) => !!w.profile?.email);

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

    const emails = recipients.map((w: any) => ({
      from: fromAddr,
      to: w.profile.email,
      subject: `Congrats, you're the Baller of the Match!`,
      html: buildEmailHtml({
        playerName: w.profile.name,
        gameTitle: game.title,
        fieldName: game.fields?.name || game.area || 'the venue',
        dateStr, timeStr, gameUrl,
      }),
    }));

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
    console.error('send-award-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
