import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deployed with --no-verify-jwt so ToyyibPay can POST without an auth header.
// Reference format: bolahh_{userId}_{amount}_{timestamp}
serve(async (req) => {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const status      = params.get('status_id') ?? params.get('status');
    // ToyyibPay server-side callback sends our billExternalReferenceNo in 'refno'.
    // 'order_id' in the callback is ToyyibPay's internal transaction ID, not ours.
    const referenceNo = params.get('refno') ?? params.get('order_id');
    const billCode    = params.get('billcode');

    console.log('ToyyibPay callback received:', { status, referenceNo, billCode, body });

    if (status !== '1' || !referenceNo) return new Response('OK');

    const parts = referenceNo.split('_');
    // parts: ['bolahh', userId, amount, timestamp]
    if (parts.length < 4 || parts[0] !== 'bolahh') return new Response('OK');

    const userId = parts[1];
    const amount = parseFloat(parts[2]);
    if (!userId || isNaN(amount)) return new Response('OK');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency — skip if already credited for this reference
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'topup')
      .like('description', `%${referenceNo}%`)
      .maybeSingle();

    if (existing) return new Response('OK');

    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    const newBalance = (profile?.wallet_balance ?? 0) + amount;

    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
    await supabase.from('wallet_transactions').insert({
      user_id:      userId,
      type:         'topup',
      amount,
      description:  `Wallet topup RM${amount} [${referenceNo}]`,
      balance_after: newBalance,
    });

    // Clean up the pending placeholder created by create-toyyibpay-bill
    if (billCode) {
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'topup_pending')
        .eq('description', billCode);
    }

    return new Response('OK');
  } catch (err) {
    console.error('Callback error:', err);
    return new Response('OK');
  }
});
