import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { gameId, userId, userEmail, userName, returnUrl, paymentMethod, couponCode } = await req.json();
    if (!gameId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase     = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Price is derived from the DB, never trusted from the client — a client-supplied
    // amount would let anyone create a valid paid booking for an arbitrary price.
    const { data: game } = await supabase.from('games').select('title, price').eq('id', gameId).single();
    if (!game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Block if the player already has a row for this game (joined, or a payment already pending)
    const { data: existingJoin } = await supabase
      .from('game_players').select('id').eq('game_id', gameId).eq('user_id', userId).maybeSingle();
    if (existingJoin) {
      return new Response(JSON.stringify({ error: 'You already have a booking for this game.' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Independently re-validate the coupon server-side — same rules as the client's
    // display-only check, but this is the copy that actually determines the price.
    let appliedCoupon: any = null;
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons').select('*').eq('code', couponCode).eq('is_active', true).maybeSingle();
      const valid = coupon
        && (coupon.max_uses === null || coupon.uses_count < coupon.max_uses)
        && (!coupon.expires_at || new Date(coupon.expires_at) >= new Date());
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Your coupon is no longer valid.' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
      appliedCoupon = coupon;
    }

    const discountAmount = appliedCoupon
      ? parseFloat((game.price * appliedCoupon.discount_percentage / 100).toFixed(2))
      : 0;
    const amount = parseFloat((game.price - discountAmount).toFixed(2));

    const toyyibBase  = Deno.env.get('TOYYIBPAY_BASE_URL') ?? 'https://toyyibpay.com';
    const isQR         = paymentMethod === 'qr';
    // gameId/userId are UUIDs (no underscores), so splitting this on '_' downstream is safe.
    const referenceNo  = `bolahhgame_${gameId}_${userId}_${amount}_${Date.now()}`;

    const formData = new URLSearchParams({
      userSecretKey:           Deno.env.get('TOYYIBPAY_SECRET_KEY')!,
      categoryCode:            Deno.env.get('TOYYIBPAY_CATEGORY_CODE')!,
      billName:                'Bolahh Game',
      billDescription:         `${game.title}`.slice(0, 100),
      billPriceSetting:        '1',
      billPayorInfo:           '1',
      billAmount:              String(Math.round(amount * 100)),
      billReturnUrl:           returnUrl || 'https://bolahh.com/home',
      billCallbackUrl:         `${supabaseUrl}/functions/v1/toyyibpay-game-callback`,
      billExternalReferenceNo: referenceNo,
      billTo:                  userName || 'Bolahh User',
      billEmail:               userEmail || '',
      billPhone:               '0000000000',
      billSplitPayment:        '0',
      billSplitPaymentArgs:    '',
      billPaymentChannel:      '0', // FPX only — no card option in our flow
      billContentEmail:        `Your Bolahh booking for ${game.title} is confirmed.`,
      billChargeToCustomer:    '1',
      enableDuitNowQR:         isQR ? '1' : '0',
      ...(isQR ? { chargeDuitNowQR: '0' } : {}), // bill owner (Bolahh) absorbs the QR fee
    });

    const res     = await fetch(`${toyyibBase}/index.php/api/createBill`, { method: 'POST', body: formData });
    const rawText = await res.text();
    let json: any;
    try { json = JSON.parse(rawText); } catch { json = rawText; }

    const billCode = Array.isArray(json) ? json[0]?.BillCode : undefined;
    if (!billCode) {
      const msg = Array.isArray(json) && json[0]?.msg ? json[0].msg : JSON.stringify(json);
      return new Response(JSON.stringify({ error: `ToyyibPay: ${msg}` }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Reserve the slot now (mirrors the "pay at court" pending pattern) so it can't
    // be taken while the player is off completing payment on ToyyibPay's page.
    // amount_paid stays 0 until payment is confirmed — refundGamePlayers.js and
    // GameCancelPage.jsx both treat amount_paid as money actually collected, so
    // recording the charge amount here before it's paid would let an abandoned
    // bill be "refunded" to the wallet for money that was never received.
    const { error: joinErr } = await supabase.from('game_players').insert({
      game_id:        gameId,
      user_id:        userId,
      amount_paid:    0,
      payment_method: 'direct',
      payment_status: 'pending',
      payment_ref:    billCode,
    });

    if (joinErr) {
      return new Response(JSON.stringify({ error: 'Could not reserve your slot: ' + joinErr.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (appliedCoupon) {
      await supabase.from('coupons').update({ uses_count: appliedCoupon.uses_count + 1 }).eq('id', appliedCoupon.id);
    }

    return new Response(JSON.stringify({ billCode }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
