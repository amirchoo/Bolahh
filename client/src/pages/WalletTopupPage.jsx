import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const TOPUP_OPTIONS = [5, 10, 20, 30, 50, 100];

export default function WalletTopupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) fetchBalance();
  }, [user]);

  const fetchBalance = async () => {
    const { data } = await supabase
      .from('profiles').select('wallet_balance').eq('id', user.id).single();
    setBalance(data?.wallet_balance || 0);
    setLoading(false);
  };

  const handleTopup = async () => {
    if (!selected) return;
    setProcessing(true);

    // ── BILLPLZ INTEGRATION PLACEHOLDER ──────────────────────────
    // TODO: Replace this block with actual Billplz API call once authorized
    //
    // 1. Create a Billplz bill via your backend/edge function:
    //    POST https://www.billplz.com/api/v3/bills
    //    Body: { collection_id, email, name, amount (in cents), description,
    //            redirect_url, callback_url }
    //
    // 2. Redirect user to bill.url for payment:
    //    window.location.href = billResponse.url;
    //
    // 3. On Billplz callback (webhook), verify X-Signature and call confirmTopup()
    //
    // Example edge function call:
    // const res = await fetch('/api/create-bill', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ amount: selected, userId: user.id })
    // });
    // const { url } = await res.json();
    // window.location.href = url;
    // ─────────────────────────────────────────────────────────────

    // TEMP: Simulate successful topup directly (remove when Billplz is live)
    await confirmTopup(selected);
    setProcessing(false);
  };

  const confirmTopup = async (amount) => {
    const newBalance = balance + amount;
    const { error } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    if (!error) {
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'topup',
        amount,
        description: `Wallet topup RM${amount}`,
        balance_after: newBalance,
      });
      setBalance(newBalance);
      setSuccess(true);
      setSelected(null);
      setTimeout(() => setSuccess(false), 3000);
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
            RM {loading ? '—' : balance.toFixed(2)}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div style={{
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: '#4ade80', fontSize: 14, fontWeight: 600, textAlign: 'center'
          }}>
            ✓ Topup successful! Balance updated.
          </div>
        )}

        {/* Amount Selection */}
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

        {/* Billplz notice */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 10
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Secure Payment via Billplz</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              Payment gateway coming soon. Topup is currently simulated for testing.
            </div>
          </div>
        </div>

        {/* Topup Button */}
        <button onClick={handleTopup} disabled={!selected || processing} style={{
          width: '100%', padding: '15px',
          background: selected ? 'var(--accent)' : 'var(--card)',
          color: selected ? '#fff' : 'var(--muted)',
          border: selected ? 'none' : '1px solid var(--border)',
          borderRadius: 12, fontWeight: 700, fontSize: 16, letterSpacing: 2,
          cursor: selected ? 'pointer' : 'not-allowed',
          opacity: processing ? 0.6 : 1, transition: 'all 0.2s',
          fontFamily: "'Bebas Neue'"
        }}>
          {processing ? 'PROCESSING...' : selected ? `TOPUP RM${selected}` : 'SELECT AN AMOUNT'}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          Wallet balance is non-refundable to bank accounts. Cancelled game refunds will be credited to your wallet.
        </p>

      </div>
    </div>
  );
}
