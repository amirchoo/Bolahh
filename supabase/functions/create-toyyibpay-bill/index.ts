import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { amount, userId, userEmail, userName, returnUrl } = await req.json();
    if (!amount || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const toyyibBase   = Deno.env.get('TOYYIBPAY_BASE_URL') ?? 'https://toyyibpay.com';
    const referenceNo  = `bolahh_${userId}_${amount}_${Date.now()}`;

    const formData = new URLSearchParams({
      userSecretKey:           Deno.env.get('TOYYIBPAY_SECRET_KEY')!,
      categoryCode:            Deno.env.get('TOYYIBPAY_CATEGORY_CODE')!,
      billName:                'Bolahh Wallet',
      billDescription:         `Topup RM${amount}`,
      billPriceSetting:        '1',
      billPayorInfo:           '1',
      billAmount:              String(amount * 100),
      billReturnUrl:           returnUrl || 'https://bolahh.com/wallet/topup',
      billCallbackUrl:         `${supabaseUrl}/functions/v1/toyyibpay-callback`,
      billExternalReferenceNo: referenceNo,
      billTo:                  userName || 'Bolahh User',
      billEmail:               userEmail || '',
      billPhone:               '0000000000',
      billSplitPayment:        '0',
      billSplitPaymentArgs:    '',
      billPaymentChannel:      '0',
      billContentEmail:        `Your Bolahh wallet has been topped up with RM${amount}.`,
      billChargeToCustomer:    '1',
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

    // Store the pending payment in the database so the frontend can find it on return
    // even if URL params are lost.
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await supabase.from('wallet_transactions').insert({
      user_id:       userId,
      type:          'topup_pending',
      amount,
      description:   billCode,   // store bill code here — we look this up on return
      balance_after: 0,
    });

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
