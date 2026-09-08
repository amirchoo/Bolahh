import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // amount: our stored RM value from the pending record — more reliable than ToyyibPay's billpaymentAmount
    const { billCode, userId, pendingTxId, amount: pendingAmount } = await req.json();
    if (!billCode || !userId) {
      return new Response(JSON.stringify({ error: 'Missing billCode or userId' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const toyyibBase = Deno.env.get('TOYYIBPAY_BASE_URL') ?? 'https://toyyibpay.com';

    // Confirm with ToyyibPay that this bill was actually paid
    const verifyRes = await fetch(`${toyyibBase}/index.php/api/getBillTransactions`, {
      method: 'POST',
      body: new URLSearchParams({
        userSecretKey: Deno.env.get('TOYYIBPAY_SECRET_KEY')!,
        billCode,
      }),
    });

    const txList = await verifyRes.json();
    console.log('ToyyibPay getBillTransactions response:', JSON.stringify(txList));

    // Use String() cast — ToyyibPay sometimes returns numeric 1 instead of '1'
    const tx = Array.isArray(txList) ? txList.find((t: any) => String(t.billpaymentStatus) === '1') : null;

    if (!tx) {
      return new Response(JSON.stringify({ error: 'Payment not confirmed by ToyyibPay' }), {
        status: 402, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Use our stored amount (pendingAmount in RM) if available.
    // Fallback: ToyyibPay billpaymentAmount — try both RM and cents interpretations.
    const toyyibRaw = parseFloat(tx.billpaymentAmount ?? '0');
    // If raw value is large (e.g. 500 for RM5), it's in cents → divide by 100.
    // If it's small (e.g. 5.00 for RM5), it's already in RM → use as-is.
    const toyyibAmount = toyyibRaw >= 100 ? toyyibRaw / 100 : toyyibRaw;
    const amount = (pendingAmount && pendingAmount > 0) ? pendingAmount : toyyibAmount;

    console.log(`Amount to credit: ${amount} (pendingAmount=${pendingAmount}, toyyibRaw=${toyyibRaw})`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency — keyed on billCode (ToyyibPay's own unique bill id), NOT on
    // billExternalReferenceNo: ToyyibPay silently truncates that field (observed ~50 chars),
    // and our reference (bolahh_{uuid}_{amount}_{timestamp}) is long enough that the
    // truncated tail only keeps the first few digits of the millisecond timestamp — which
    // barely change for months. Two different real top-ups of the same RM amount by the
    // same user can come back with an IDENTICAL truncated referenceNo, so matching on that
    // string was silently treating a genuinely new, paid top-up as an already-credited
    // duplicate and skipping it.
    const referenceNo = tx.billExternalReferenceNo as string | undefined;
    {
      const { data: existing } = await supabase
        .from('wallet_transactions')
        .select('id, balance_after')
        .eq('user_id', userId)
        .eq('type', 'topup')
        .eq('bill_code', billCode)
        .maybeSingle();

      if (existing && (existing.balance_after ?? 0) > 0) {
        // Already credited and balance_after looks correct — just clean up and return
        if (pendingTxId) {
          await supabase.from('wallet_transactions').delete().eq('id', pendingTxId);
        }
        const { data: profile } = await supabase
          .from('profiles').select('wallet_balance').eq('id', userId).single();
        return new Response(JSON.stringify({ newBalance: profile?.wallet_balance ?? 0 }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
      // If existing but balance_after is 0, the previous credit was incomplete — fall through to re-credit
    }

    // Credit the wallet
    const { data: profile, error: profileErr } = await supabase
      .from('profiles').select('wallet_balance').eq('id', userId).single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const newBalance = (profile.wallet_balance ?? 0) + amount;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateErr) {
      console.error('Profile update failed:', updateErr);
      return new Response(JSON.stringify({ error: 'Balance update failed: ' + updateErr.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('wallet_transactions').insert({
      user_id:       userId,
      type:          'topup',
      amount,
      description:   `Wallet topup RM${amount} [${referenceNo ?? billCode}]`,
      balance_after: newBalance,
      bill_code:     billCode,
    });

    if (pendingTxId) {
      await supabase.from('wallet_transactions').delete().eq('id', pendingTxId);
    }

    return new Response(JSON.stringify({ newBalance }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
