import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mirrors client/src/lib/rankUtils.js — duplicated here (same pattern as the tier
// color duplication between FifaCard.jsx and GuidePage.jsx) since edge functions
// can't import from client/src.
const RANKS = [
  { name: 'Novis',      minOvr: 0,  maxOvr: 30 },
  { name: 'Gangsa III', minOvr: 31, maxOvr: 39 },
  { name: 'Gangsa II',  minOvr: 40, maxOvr: 49 },
  { name: 'Gangsa I',   minOvr: 50, maxOvr: 60 },
  { name: 'Perak III',  minOvr: 61, maxOvr: 69 },
  { name: 'Perak II',   minOvr: 70, maxOvr: 74 },
  { name: 'Perak I',    minOvr: 75, maxOvr: 79 },
  { name: 'Emas III',   minOvr: 80, maxOvr: 85 },
  { name: 'Emas II',    minOvr: 86, maxOvr: 94 },
  { name: 'Emas I',     minOvr: 95, maxOvr: 99 },
];
function getRank(ovr: number) {
  if (!ovr || ovr <= 30) return 'Novis';
  if (ovr <= 39) return 'Gangsa III';
  if (ovr <= 49) return 'Gangsa II';
  if (ovr <= 60) return 'Gangsa I';
  if (ovr <= 69) return 'Perak III';
  if (ovr <= 74) return 'Perak II';
  if (ovr <= 79) return 'Perak I';
  if (ovr <= 85) return 'Emas III';
  if (ovr <= 94) return 'Emas II';
  return 'Emas I';
}
function getRankIndex(rank: string) {
  return RANKS.findIndex(r => r.name === rank);
}
function getTierKey(rank: string) {
  if (rank === 'Novis') return 'novis';
  if (rank.startsWith('Gangsa')) return 'gangsa';
  if (rank.startsWith('Perak')) return 'perak';
  return 'emas';
}

// Mirrors the tier intros in GuidePage.jsx's RANK_GROUPS — kept short here since
// the email links out to the full guide for the detailed level-by-level breakdown.
const TIER_INFO: Record<string, { color: string; textColor: string; desc: string }> = {
  novis:  { color: '#7088a0', textColor: '#e8e9eb', desc: "Every Baller starts here. Get rated in your next game to keep building your Bolahh Card." },
  gangsa: { color: '#cd7f32', textColor: '#2a1400', desc: "You've picked up the fundamentals: first touches, first tackles, first real reps." },
  perak:  { color: '#6ec8e8', textColor: '#0b1e2b', desc: 'Consistent, composed, and starting to shape games. A trusted pick in any lineup.' },
  emas:   { color: '#FFD700', textColor: '#3a2a00', desc: 'The top of the ladder. Emas players carry games and set the standard everyone else chases.' },
};

const STAT_KEYS = ['shooting_quality', 'passing_quality', 'good_defending', 'good_keeping', 'successful_dribble', 'good_chance'] as const;

function buildEmailHtml(opts: { playerName: string; oldRank: string; newRank: string; newOvr: number }) {
  const { playerName, oldRank, newRank, newOvr } = opts;
  const tier = TIER_INFO[getTierKey(newRank)];
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
    <div style="max-width:480px; margin:0 auto; background:#1a1b1d; border:1.5px solid ${tier.color}; border-radius:14px; overflow:hidden; box-shadow:0 0 24px ${tier.color}33;">
      <div style="padding:18px 24px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding-right:8px;"><img src="https://bolahh.com/apple-touch-icon.png" width="26" height="26" alt="Bolahh" style="display:block; border-radius:6px;" /></td>
            <td style="font-family:'Bebas Neue', Arial, sans-serif; font-size:18px; letter-spacing:3px; color:#e8e9eb; vertical-align:middle;">B<span style="color:#F09D51;">O</span>LAHH</td>
          </tr>
        </table>
      </div>
      <div style="background:${tier.color}; padding:22px 24px; margin-top:14px; text-align:center;">
        <div style="font-size:32px; line-height:1; margin-bottom:6px;">⬆️</div>
        <div style="font-family:'Bebas Neue', Arial, sans-serif; font-size:26px; font-weight:400; letter-spacing:1.5px; color:${tier.textColor};">RANK UP!</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">Hey ${playerName || 'there'},</p>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
          Nice work out there. You've climbed from <strong>${oldRank}</strong> to <strong style="color:${tier.color};">${newRank}</strong>.
        </p>
        <div style="background:#222426; border:1px solid #2e3032; border-radius:10px; padding:16px; margin-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:10px;">
            <tr>
              <td style="font-family:'Bebas Neue', Arial, sans-serif; font-size:22px; letter-spacing:1.5px; color:${tier.color};">${newRank}</td>
              <td style="text-align:right; font-family:'Space Mono', 'Courier New', monospace; font-size:13px; font-weight:700; color:${tier.color};">${newOvr} OVR</td>
            </tr>
          </table>
          <p style="margin:0; font-size:13px; line-height:1.6; color:#b0b2b4;">${tier.desc}</p>
        </div>
        <p style="margin:0 0 20px; font-size:15px; line-height:1.6;">
          Keep it up, play more games and get rated to level up even further!
        </p>
        <div style="text-align:center; margin-bottom:4px;">
          <a href="https://bolahh.com/guide#ranks" style="display:inline-block; background:${tier.color}; color:${tier.textColor}; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
            View Full Rank Guide
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

    const { data: game } = await supabase.from('games').select('created_by').eq('id', game_id).single();
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
      .select('user_id, shooting_quality, passing_quality, good_defending, good_keeping, successful_dribble, good_chance')
      .eq('game_id', game_id);

    if (!ratingRows || ratingRows.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Sum deltas per user in case of multiple rows for the same game/user.
    const deltas: Record<string, Record<string, number>> = {};
    ratingRows.forEach(r => {
      if (!deltas[r.user_id]) deltas[r.user_id] = { shooting_quality: 0, passing_quality: 0, good_defending: 0, good_keeping: 0, successful_dribble: 0, good_chance: 0 };
      STAT_KEYS.forEach(k => { deltas[r.user_id][k] += (r as any)[k] || 0; });
    });

    const userIds = Object.keys(deltas);
    const { data: profiles } = await supabase
      .from('profiles').select('id, name, email, card_stats, total_points').in('id', userIds);

    const promoted: { name: string; email: string; oldRank: string; newRank: string; newOvr: number }[] = [];
    // Every promoted player, regardless of whether they have an email on file —
    // the in-app notification is a separate channel from the Resend email below.
    const promotedForNotification: { userId: string; newRank: string; newOvr: number }[] = [];

    (profiles || []).forEach(p => {
      const d = deltas[p.id];
      const current = p.card_stats || {};
      // current values are already the post-rating (new) stats — reconstruct the
      // pre-rating snapshot by subtracting this game's deltas back out.
      const oldPac = (current.pac ?? 30) - (d.good_chance || 0);
      const oldSho = (current.sho ?? 30) - (d.shooting_quality || 0);
      const oldPas = (current.pas ?? 30) - (d.passing_quality || 0);
      const oldDri = (current.dri ?? 30) - (d.successful_dribble || 0);
      const oldDef = (current.def ?? 30) - (d.good_defending || 0);
      const oldPhy = (current.phy ?? 30) - (d.good_keeping || 0);
      const oldOvr = Math.round((oldPac + oldSho + oldPas + oldDri + oldDef + oldPhy) / 6);
      const newOvr = p.total_points ?? oldOvr;

      const oldRank = getRank(oldOvr);
      const newRank = getRank(newOvr);

      if (getRankIndex(newRank) > getRankIndex(oldRank)) {
        promotedForNotification.push({ userId: p.id, newRank, newOvr });
        if (p.email) promoted.push({ name: p.name, email: p.email, oldRank, newRank, newOvr });
      }
    });

    if (promotedForNotification.length > 0) {
      await supabase.from('notifications').insert(
        promotedForNotification.map(w => ({
          user_id: w.userId,
          type: 'rank_promotion',
          title: `You've ranked up to ${w.newRank}!`,
          body: `Your OVR is now ${w.newOvr}. Keep playing to climb even further.`,
          link: '/guide#ranks',
        }))
      );
    }

    if (promoted.length === 0) {
      return new Response(JSON.stringify({ sent: 0, notified: promotedForNotification.length }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const fromAddr = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Bolahh <admin@bolahh.com>';

    const emails = promoted.map(w => ({
      from: fromAddr,
      to: w.email,
      subject: `You've ranked up to ${w.newRank}!`,
      html: buildEmailHtml({ playerName: w.name, oldRank: w.oldRank, newRank: w.newRank, newOvr: w.newOvr }),
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

    return new Response(JSON.stringify({ sent: promoted.length, notified: promotedForNotification.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-rank-promotion-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
