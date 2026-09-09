import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deployed with --no-verify-jwt so ToyyibPay can POST without an auth header — which also
// means this URL is publicly reachable by anyone, not just ToyyibPay. The POST body
// (status_id/order_id/billcode) is therefore untrusted and MUST NOT be used on its own to
// decide payment status: gameId/userId/billCode are all visible to the player in their own
// browser, so a forged POST here would otherwise mark any booking "paid" for free. Instead,
// treat the callback purely as a "check now" trigger and independently confirm with
// ToyyibPay's own getBillTransactions API before writing anything — same as
// verify-toyyibpay-game-payment.
// Reference format: bolahhgame_{gameId}_{userId}_{amount}_{timestamp}
serve(async (req) => {
  try {
    const form         = await req.formData();
    const referenceNo  = form.get('order_id') as string | null;
    const billCode     = form.get('billcode') as string | null;

    console.log('ToyyibPay game callback received:', { referenceNo, billCode });

    if (!referenceNo || !billCode) return new Response('OK');

    const parts = referenceNo.split('_');
    // parts: ['bolahhgame', gameId, userId, amount, timestamp]
    if (parts.length < 5 || parts[0] !== 'bolahhgame') return new Response('OK');

    const gameId = parts[1];
    const userId = parts[2];
    if (!gameId || !userId) return new Response('OK');

    const toyyibBase = Deno.env.get('TOYYIBPAY_BASE_URL') ?? 'https://toyyibpay.com';
    const verifyRes = await fetch(`${toyyibBase}/index.php/api/getBillTransactions`, {
      method: 'POST',
      body: new URLSearchParams({
        userSecretKey: Deno.env.get('TOYYIBPAY_SECRET_KEY')!,
        billCode,
      }),
    });

    let txList: any;
    try { txList = await verifyRes.json(); } catch { txList = null; }
    const tx = Array.isArray(txList) ? txList.find((t: any) => String(t.billpaymentStatus) === '1') : null;

    if (!tx) {
      console.log('ToyyibPay game callback: no confirmed transaction for bill', billCode);
      return new Response('OK');
    }

    // Amount comes from ToyyibPay's own confirmed transaction, never from the client-visible
    // referenceNo — ToyyibPay sometimes reports it in cents (e.g. 2000) vs RM (e.g. 20.00).
    const toyyibRaw = parseFloat(tx.billpaymentAmount ?? '0');
    const amount    = toyyibRaw >= 100 ? toyyibRaw / 100 : toyyibRaw;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotent: only flips rows still 'pending' for this exact bill. Already-processed
    // callbacks (retries) or verify-endpoint races just find 0 rows and no-op.
    // Two calls because the booker's row (holds the full group amount) and any guest
    // rows reserved alongside it (booked_by = userId, amount stays 0) are matched differently.
    const { data: updated, error } = await supabase
      .from('game_players')
      .update({ payment_status: 'paid', amount_paid: amount })
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .eq('payment_ref', billCode)
      .eq('payment_status', 'pending')
      .select('id');

    const { data: updatedGuests, error: guestError } = await supabase
      .from('game_players')
      .update({ payment_status: 'paid' })
      .eq('game_id', gameId)
      .eq('booked_by', userId)
      .eq('payment_ref', billCode)
      .eq('payment_status', 'pending')
      .select('id');

    if (error || guestError) console.error('Game payment update failed:', error || guestError);
    else console.log(`Game payment confirmed: game=${gameId} user=${userId} rows=${updated?.length} guestRows=${updatedGuests?.length}`);

    return new Response('OK');
  } catch (err) {
    console.error('Game callback error:', err);
    return new Response('OK');
  }
});
