import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const TOPUP_OPTIONS = [5, 10, 20, 30, 50, 100];

export default function WalletTopupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const returnStatus   = searchParams.get('status');
  const returnBillCode = searchParams.get('billcode');

  useEffect(() => {
    if (user) fetchBalance();
  }, [user]);

  // Handle return from ToyyibPay
  useEffect(() => {
    if (!user || !returnStatus) return;
    if (returnStatus === '1' && returnBillCode) {
      creditWallet(returnBillCode);
    } else if (returnStatus !== '1') {
      setError('Payment was not completed. Please try again.');
    }
  }, [returnStatus, returnBillCode, user]);

  const fetchBalance = async () => {
    const { data } = await supabase
      .from('profiles').select('wallet_balance').eq('id', user.id).single();
    setBalance(data?.wallet_balance ?? 0);
    setLoading(false);
  };

  const creditWallet = async (billCode) => {
    setVerifying(true);
    try {
      // ToyyibPay sends back order_id = bolahh_{userId}_{amount}_{timestamp}
      const orderId   = searchParams.get('order_id') ?? '';
      const parts     = orderId.split('_');
      const refUserId = parts[1];
      const amount    = parseFloat(parts[2]);

      if (parts[0] !== 'bolahh' || !refUserId || isNaN(amount) || amount <= 0) {
        setError(`Could not parse payment reference. order_id="${orderId}". Contact support.`);
        return;
      }
      if (refUserId !== user.id) {
        setError(`User mismatch. Contact support. (ref: ${refUserId.slice(0,8)}… you: ${user.id.slice(0,8)}…)`);
        return;
      }

      // Idempotency — skip if already credited
      const { data: existing } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'topup')
        .ilike('description', `%[${billCode}]%`)
        .maybeSingle();

      if (existing) {
        await fetchBalance();
        setSuccess(true);
        return;
      }

      // Fetch latest balance
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('wallet_balance').eq('id', user.id).single();

      if (profileErr) {
        setError('Could not fetch profile: ' + profileErr.message);
        return;
      }

      const newBalance = (profile?.wallet_balance ?? 0) + amount;

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (updateErr) {
        setError('Balance update failed: ' + updateErr.message + ' — contact support, your payment was received.');
        return;
      }

      const { error: txErr } = await supabase.from('wallet_transactions').insert({
        user_id:       user.id,
        type:          'topup',
        amount,
        description:   `Wallet topup RM${amount} [${billCode}]`,
        balance_after: newBalance,
      });

      if (txErr) console.warn('Transaction log failed (balance was updated):', txErr.message);

      setBalance(newBalance);
      setSuccess(true);
    } catch (err) {
      setError('Unexpected error: ' + String(err) + ' — contact support if money was deducted.');
    } finally {
      setVerifying(false);
    }
  };

  const handleTopup = async () => {
    if (!selected) return;
    setProcessing(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).single();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-toyyibpay-bill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            amount: selected,
            userId: user.id,
            userEmail: user.email,
            userName: profile?.username || user.email,
            returnUrl: window.location.origin + '/wallet/topup',
          }),
        }
      );

      const { billCode, error: fnError } = await res.json();
      if (fnError || !billCode) throw new Error(fnError || 'Could not create payment bill.');

      const toyyibBase = import.meta.env.VITE_TOYYIBPAY_BASE_URL ?? 'https://toyyibpay.com';
      window.location.href = `${toyyibBase}/${billCode}`;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => navigate('/profile')} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
        }}>← Back</button>

        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
          WALLET TOPUP
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Add funds to your Bolahh wallet
        </p>

        {/* Current Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
          borderRadius: 20, padding: '28px 24px', marginBottom: 28,
          boxShadow: '0 8px 32px rgba(240,157,81,0.25)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 8, fontWeight: 700, letterSpacing: 1.5, fontFamily: "'Space Mono'" }}>
            CURRENT BALANCE
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, color: '#fff', lineHeight: 1, letterSpacing: 2 }}>
            RM {loading || verifying ? '—' : balance.toFixed(2)}
          </div>
          {verifying && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
              Confirming payment...
            </div>
          )}
        </div>

        {/* Success message */}
        {success && (
          <div style={{
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: '#4ade80', fontSize: 14, fontWeight: 600, textAlign: 'center'
          }}>
            ✓ Topup successful! Your balance has been updated.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: 'var(--red)', fontSize: 14, fontWeight: 600
          }}>
            ✕ {error}
          </div>
        )}

        {/* Amount Selection */}
        {!success && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 14, fontWeight: 700, fontFamily: "'Space Mono'" }}>
                SELECT AMOUNT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {TOPUP_OPTIONS.map(amt => (
                  <button key={amt} onClick={() => setSelected(amt)} style={{
                    background: selected === amt ? 'rgba(240,157,81,0.15)' : 'var(--card)',
                    border: `2px solid ${selected === amt ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '16px 8px', cursor: 'pointer',
                    transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                  }}>
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 10, color: selected === amt ? 'var(--accent)' : 'var(--muted)', fontWeight: 700 }}>RM</span>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: 1, color: selected === amt ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{amt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ToyyibPay notice */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px', marginBottom: 24,
              display: 'flex', alignItems: 'flex-start', gap: 10
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Secure Payment via ToyyibPay</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  FPX online banking &amp; credit card accepted. You will be redirected to ToyyibPay to complete payment.
                </div>
              </div>
            </div>

            {/* Topup Button */}
            <button onClick={handleTopup} disabled={!selected || processing || verifying} style={{
              width: '100%', padding: '15px',
              background: selected ? 'var(--accent)' : 'var(--card)',
              color: selected ? '#fff' : 'var(--muted)',
              border: selected ? 'none' : '1px solid var(--border)',
              borderRadius: 12, fontWeight: 700, fontSize: 16, letterSpacing: 2,
              cursor: selected ? 'pointer' : 'not-allowed',
              opacity: processing || verifying ? 0.6 : 1, transition: 'all 0.2s',
              fontFamily: "'Bebas Neue'"
            }}>
              {processing ? 'PROCESSING...' : selected ? `TOPUP RM${selected}` : 'SELECT AN AMOUNT'}
            </button>

            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
              Wallet balance is non-refundable to bank accounts. Cancelled game refunds will be credited to your wallet.
            </p>
          </>
        )}

        {success && (
          <button onClick={() => navigate('/profile')} style={{
            width: '100%', padding: '14px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 700,
            fontSize: 15, letterSpacing: 1.5, cursor: 'pointer',
            fontFamily: "'Bebas Neue'"
          }}>
            BACK TO PROFILE
          </button>
        )}

      </div>
    </div>
  );
}
