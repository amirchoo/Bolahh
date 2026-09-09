import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deployed with --no-verify-jwt so ToyyibPay can POST without an auth header — which also
// means this URL is publicly reachable by anyone, not just ToyyibPay. The POST body
// (status_id/order_id/billcode) is therefore untrusted and MUST NOT be used on its own to
// decide payment status: userId is visible to the account holder themselves, so a forged
// POST here would otherwise credit any wallet for free. Instead, treat the callback purely
// as a "check now" trigger and independently confirm with ToyyibPay's own
// getBillTransactions API before crediting anything — same as verify-toyyibpay-payment.
// Reference format: bolahh_{userId}_{amount}_{timestamp}
serve(async (req) => {
  try {
    // ToyyibPay sends multipart/form-data — req.formData() handles both multipart and url-encoded.
    const form      = await req.formData();
    // order_id is our billExternalReferenceNo (bolahh_userId_amount_timestamp)
    const referenceNo = form.get('order_id') as string | null;
    const billCode    = form.get('billcode') as string | null;

    console.log('ToyyibPay callback received:', { referenceNo, billCode });

    if (!referenceNo || !billCode) return new Response('OK');

    const parts = referenceNo.split('_');
    // parts: ['bolahh', userId, amount, timestamp]
    if (parts.length < 4 || parts[0] !== 'bolahh') return new Response('OK');

    const userId = parts[1];
    if (!userId) return new Response('OK');

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
      console.log('ToyyibPay callback: no confirmed transaction for bill', billCode);
      return new Response('OK');
    }

    // Amount comes from ToyyibPay's own confirmed transaction, never from the client-visible
    // referenceNo — ToyyibPay sometimes reports it in cents (e.g. 2000) vs RM (e.g. 20.00).
    const toyyibRaw = parseFloat(tx.billpaymentAmount ?? '0');
    const amount    = toyyibRaw >= 100 ? toyyibRaw / 100 : toyyibRaw;
    if (isNaN(amount)) return new Response('OK');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency — skip if already credited for this exact bill. Keyed on billCode
    // (ToyyibPay's own unique bill id, echoed back verbatim), NOT on referenceNo: ToyyibPay
    // silently truncates billExternalReferenceNo (observed ~50 chars), and our reference
    // (bolahh_{uuid}_{amount}_{timestamp}) is long enough that the truncated tail only keeps
    // the first few digits of the millisecond timestamp — which barely change for months.
    // Two different real top-ups of the same RM amount by the same user can therefore come
    // back with an IDENTICAL truncated referenceNo, and matching on that string silently
    // swallowed the second (genuinely paid) top-up as a false "already credited" duplicate.
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'topup')
      .eq('bill_code', billCode)
      .maybeSingle();

    if (existing) {
      console.log('Idempotency: already credited for bill', billCode);
      return new Response('OK');
    }

    const { data: profile, error: profileFetchErr } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (profileFetchErr || !profile) {
      console.error('Profile not found for userId:', userId, profileFetchErr);
      return new Response('ERROR', { status: 404 });
    }

    const newBalance = (profile.wallet_balance ?? 0) + amount;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateErr) {
      console.error('Profile update failed:', updateErr);
      return new Response('ERROR', { status: 500 });
    }

    console.log(`Wallet credited: userId=${userId} +${amount} => ${newBalance}`);

    await supabase.from('wallet_transactions').insert({
      user_id:      userId,
      type:         'topup',
      amount,
      description:  `Wallet topup RM${amount} [${referenceNo}]`,
      balance_after: newBalance,
      bill_code:    billCode,
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
