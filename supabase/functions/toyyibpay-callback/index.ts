import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deployed with --no-verify-jwt so ToyyibPay can POST without an auth header.
// Reference format: bolahh_{userId}_{amount}_{timestamp}
serve(async (req) => {
  try {
    // ToyyibPay sends multipart/form-data — req.formData() handles both multipart and url-encoded.
    const form      = await req.formData();
    const status    = (form.get('status_id') ?? form.get('status')) as string | null;
    // order_id is our billExternalReferenceNo (bolahh_userId_amount_timestamp)
    const referenceNo = form.get('order_id') as string | null;
    const billCode    = form.get('billcode') as string | null;

    console.log('ToyyibPay callback received:', { status, referenceNo, billCode });

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
