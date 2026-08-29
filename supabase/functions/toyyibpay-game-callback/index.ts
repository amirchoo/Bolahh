import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deployed with --no-verify-jwt so ToyyibPay can POST without an auth header.
// Reference format: bolahhgame_{gameId}_{userId}_{amount}_{timestamp}
serve(async (req) => {
  try {
    const form         = await req.formData();
    const status       = (form.get('status_id') ?? form.get('status')) as string | null;
    const referenceNo  = form.get('order_id') as string | null;
    const billCode     = form.get('billcode') as string | null;

    console.log('ToyyibPay game callback received:', { status, referenceNo, billCode });

    if (status !== '1' || !referenceNo || !billCode) return new Response('OK');

    const parts = referenceNo.split('_');
    // parts: ['bolahhgame', gameId, userId, amount, timestamp]
    if (parts.length < 5 || parts[0] !== 'bolahhgame') return new Response('OK');

    const gameId = parts[1];
    const userId = parts[2];
    const amount = parseFloat(parts[3]);
    if (!gameId || !userId || isNaN(amount)) return new Response('OK');

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
