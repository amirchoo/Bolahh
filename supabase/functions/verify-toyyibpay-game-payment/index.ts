import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { billCode, gameId, userId } = await req.json();
    if (!billCode || !gameId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing billCode, gameId or userId' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const toyyibBase = Deno.env.get('TOYYIBPAY_BASE_URL') ?? 'https://toyyibpay.com';

    const verifyRes = await fetch(`${toyyibBase}/index.php/api/getBillTransactions`, {
      method: 'POST',
      body: new URLSearchParams({
        userSecretKey: Deno.env.get('TOYYIBPAY_SECRET_KEY')!,
        billCode,
      }),
    });

    const txList = await verifyRes.json();
    console.log('ToyyibPay getBillTransactions response:', JSON.stringify(txList));

    const tx = Array.isArray(txList) ? txList.find((t: any) => String(t.billpaymentStatus) === '1') : null;

    if (!tx) {
      return new Response(JSON.stringify({ error: 'Payment not confirmed by ToyyibPay' }), {
        status: 402, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ToyyibPay sometimes returns the amount in cents (e.g. 2000) vs RM (e.g. 20.00) —
    // large values are cents.
    const toyyibRaw = parseFloat(tx.billpaymentAmount ?? '0');
    const amount    = toyyibRaw >= 100 ? toyyibRaw / 100 : toyyibRaw;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotent — same condition as the callback, so whichever path runs first wins.
    // Two calls because the booker's row (holds the full group amount) and any guest
    // rows reserved alongside it (booked_by = userId, amount stays 0) are matched differently.
    const { error } = await supabase
      .from('game_players')
      .update({ payment_status: 'paid', amount_paid: amount })
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .eq('payment_ref', billCode)
      .eq('payment_status', 'pending');

    if (error) {
      return new Response(JSON.stringify({ error: 'Could not confirm booking: ' + error.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { error: guestError } = await supabase
      .from('game_players')
      .update({ payment_status: 'paid' })
      .eq('game_id', gameId)
      .eq('booked_by', userId)
      .eq('payment_ref', billCode)
      .eq('payment_status', 'pending');

    if (guestError) {
      return new Response(JSON.stringify({ error: 'Could not confirm guest bookings: ' + guestError.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ confirmed: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
