import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { billCode, userId } = await req.json();
    if (!billCode || !userId) {
      return new Response(JSON.stringify({ error: 'Missing billCode or userId' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const toyyibBase = Deno.env.get('TOYYIBPAY_BASE_URL') ?? 'https://toyyibpay.com';

    // Verify payment status with ToyyibPay
    const verifyRes = await fetch(`${toyyibBase}/index.php/api/getBillTransactions`, {
      method: 'POST',
      body: new URLSearchParams({
        userSecretKey: Deno.env.get('TOYYIBPAY_SECRET_KEY')!,
        billCode,
      }),
    });

    const txList = await verifyRes.json();
    const tx = Array.isArray(txList) ? txList.find((t: any) => t.billpaymentStatus === '1') : null;

    if (!tx) {
      return new Response(JSON.stringify({ error: 'Payment not confirmed by ToyyibPay' }), {
        status: 402, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const referenceNo = tx.billExternalReferenceNo as string;
    const amount = parseFloat(tx.billpaymentAmount) / 100; // cents → RM

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency — don't double-credit if callback already ran
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id, balance_after')
      .eq('user_id', userId)
      .eq('type', 'topup')
      .like('description', `%${referenceNo}%`)
      .maybeSingle();

    if (existing) {
      // Already credited — just return the current balance
      const { data: profile } = await supabase
        .from('profiles').select('wallet_balance').eq('id', userId).single();
      return new Response(JSON.stringify({ newBalance: profile?.wallet_balance }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Credit the wallet
    const { data: profile } = await supabase
      .from('profiles').select('wallet_balance').eq('id', userId).single();

    const newBalance = (profile?.wallet_balance ?? 0) + amount;

    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
    await supabase.from('wallet_transactions').insert({
      user_id:      userId,
      type:         'topup',
      amount,
      description:  `Wallet topup RM${amount} [${referenceNo}]`,
      balance_after: newBalance,
    });

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
