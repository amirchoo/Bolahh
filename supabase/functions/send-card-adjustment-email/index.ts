import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mirrors client/src/lib/rankUtils.js — duplicated here (same pattern as
// send-rank-promotion-email) since edge functions can't import from client/src.
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
function getTierKey(rank: string) {
  if (rank === 'Novis') return 'novis';
  if (rank.startsWith('Gangsa')) return 'gangsa';
  if (rank.startsWith('Perak')) return 'perak';
  return 'emas';
}

const TIER_COLORS: Record<string, { color: string; textColor: string }> = {
  novis:  { color: '#7088a0', textColor: '#e8e9eb' },
  gangsa: { color: '#cd7f32', textColor: '#2a1400' },
  perak:  { color: '#6ec8e8', textColor: '#0b1e2b' },
  emas:   { color: '#FFD700', textColor: '#3a2a00' },
};

function buildEmailHtml(opts: { playerName: string; oldRank: string; oldOvr: number; newRank: string; newOvr: number }) {
  const { playerName, oldRank, oldOvr, newRank, newOvr } = opts;
  const tier = TIER_COLORS[getTierKey(newRank)];
  const wentUp = newOvr >= oldOvr;
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
        <div style="font-size:32px; line-height:1; margin-bottom:6px;">🛠️</div>
        <div style="font-family:'Bebas Neue', Arial, sans-serif; font-size:26px; font-weight:400; letter-spacing:1.5px; color:${tier.textColor};">CARD UPDATED</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">Hey ${playerName || 'there'},</p>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
          We manually adjusted your Bolahh Card. It's now sitting at <strong style="color:${tier.color};">${newRank}</strong> (${newOvr} OVR), previously ${oldRank} (${oldOvr} OVR).
        </p>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
          This usually happens when we catch an error in how a recent game got rated. We're sorry for any inconvenience this may cause, but we believe this update reflects your actual skill level on the pitch${wentUp ? ', and we\'re glad it worked out in your favour' : ''}.
        </p>
        <div style="background:#222426; border:1px solid #2e3032; border-radius:10px; padding:16px; margin-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="font-family:'Bebas Neue', Arial, sans-serif; font-size:22px; letter-spacing:1.5px; color:${tier.color};">${newRank}</td>
              <td style="text-align:right; font-family:'Space Mono', 'Courier New', monospace; font-size:13px; font-weight:700; color:${tier.color};">${newOvr} OVR</td>
            </tr>
          </table>
        </div>
        <p style="margin:0 0 20px; font-size:15px; line-height:1.6;">
          Play another game and get rated to keep building your card. Every match still counts.
        </p>
        <div style="text-align:center; margin-bottom:4px;">
          <a href="https://bolahh.com/home" style="display:inline-block; background:${tier.color}; color:${tier.textColor}; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
            Book Your Next Game
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
    const { user_id, old_ovr, new_ovr } = await req.json();
    if (!user_id || old_ovr == null || new_ovr == null) {
      return new Response(JSON.stringify({ error: 'Missing user_id, old_ovr or new_ovr' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Only a super admin (the only role that can reach the Player Stats editor
    // on /admin) can trigger this, verified via their JWT.
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const { data: actingProfile } = await supabase
      .from('profiles').select('is_super_admin').eq('id', user.id).single();
    if (!actingProfile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Nothing actually changed (e.g. re-saving the same values) — nothing to email about.
    if (old_ovr === new_ovr) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase
      .from('profiles').select('name, email').eq('id', user_id).single();

    const oldRank = getRank(old_ovr);
    const newRank = getRank(new_ovr);

    await supabase.from('notifications').insert({
      user_id,
      type: 'admin_card_adjustment',
      title: 'Your Bolahh Card was updated',
      body: `Your rank is now ${newRank} (${new_ovr} OVR), previously ${oldRank} (${old_ovr} OVR).`,
      link: '/profile',
    });

    if (!profile?.email) {
      return new Response(JSON.stringify({ sent: 0, notified: 1 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const fromAddr = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Bolahh <admin@bolahh.com>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddr,
        to: profile.email,
        subject: 'Your Bolahh Card has been updated',
        html: buildEmailHtml({ playerName: profile.name, oldRank, oldOvr: old_ovr, newRank, newOvr: new_ovr }),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend send failed:', text);
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: 1, notified: 1 }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-card-adjustment-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
