import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IoCheckmark, IoClose } from 'react-icons/io5';

const SUBSCRIPTION_COST = 10;

const BENEFITS = [
  'Verified tick badge on your Bolahh card',
  'Upload GIF as your avatar, animated profile photo',
  'Stand out in friend lists and search',
  'Show your commitment to the Bolahh community',
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile,    setProfile]    = useState(null);
  const [balance,    setBalance]    = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');
  const [expiresAt,  setExpiresAt]  = useState(null);

  const isActive = (p) =>
    p?.is_subscribed && p?.subscription_expires_at && new Date(p.subscription_expires_at) > new Date();

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('is_subscribed, subscription_expires_at, wallet_balance')
      .eq('id', user.id)
      .single();
    setProfile(data);
    setBalance(data?.wallet_balance ?? 0);
    if (data?.subscription_expires_at) setExpiresAt(data.subscription_expires_at);
    setLoading(false);
  };

  const handleSubscribe = async () => {
    setProcessing(true);
    setError('');
    try {
      // Re-fetch live balance to avoid stale state
      const { data: fresh } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      const currentBalance = fresh?.wallet_balance ?? 0;
      if (currentBalance < SUBSCRIPTION_COST) {
        setError(`Insufficient balance. You need RM${SUBSCRIPTION_COST} but have RM${currentBalance.toFixed(2)}.`);
        return;
      }

      const newBalance = currentBalance - SUBSCRIPTION_COST;
      const newExpiry  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          wallet_balance:          newBalance,
          is_subscribed:           true,
          subscription_expires_at: newExpiry,
        })
        .eq('id', user.id);

      if (updateErr) throw new Error(updateErr.message);

      await supabase.from('wallet_transactions').insert({
        user_id:      user.id,
        type:         'subscription',
        amount:       SUBSCRIPTION_COST,
        description:  'Bolahh Verified subscription (1 month)',
        balance_after: newBalance,
      });

      setBalance(newBalance);
      setExpiresAt(newExpiry);
      setProfile(prev => ({ ...prev, is_subscribed: true, subscription_expires_at: newExpiry }));
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const daysLeft = (dateStr) => {
    if (!dateStr) return 0;
    return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)));
  };

  const subscribed = isActive(profile) || success;
  const expiry     = expiresAt || profile?.subscription_expires_at;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => navigate('/profile')} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>← Back</button>

        <h1 style={{
          fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3,
          color: 'var(--text)', marginBottom: 4,
        }}>BOLAHH VERIFIED</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Get the verified tick on your Bolahh card
        </p>

        {/* Subscription status */}
        <div style={{
          borderRadius: 20, padding: '24px', marginBottom: 20,
          position: 'relative', overflow: 'hidden',
          background: subscribed
            ? 'linear-gradient(135deg, #0f3824, #1a5c3a)'
            : 'linear-gradient(135deg, #1c1e21, #27292d)',
          border: subscribed
            ? '1px solid rgba(74,222,128,0.3)'
            : '1px solid rgba(240,157,81,0.25)',
          boxShadow: subscribed ? '0 8px 32px rgba(74,222,128,0.1)' : '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: subscribed ? '#4ade8033' : 'rgba(255,255,255,0.06)',
              border: subscribed ? '2px solid #4ade8066' : '2px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: subscribed ? '#4ade80' : 'var(--muted)',
            }}><IoCheckmark size={18} /></div>
            <div>
              <div style={{
                fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2,
                color: subscribed ? '#4ade80' : 'var(--muted)',
              }}>
                {loading ? 'CHECKING...' : subscribed ? 'VERIFIED ACTIVE' : 'NOT SUBSCRIBED'}
              </div>
              {subscribed && expiry && (
                <div style={{ fontSize: 12, color: 'rgba(74,222,128,0.7)', marginTop: 2 }}>
                  Expires {formatExpiry(expiry)} · {daysLeft(expiry)} days left
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wallet balance */}
        {!subscribed && (
          <div style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
            borderRadius: 16, padding: '18px 20px', marginBottom: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 4px 20px rgba(240,157,81,0.2)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontFamily: "'Space Mono'", fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>WALLET BALANCE</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 38, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
                RM {loading ? '—' : balance.toFixed(2)}
              </div>
            </div>
            {!loading && balance < SUBSCRIPTION_COST && (
              <button onClick={() => navigate('/wallet/topup')} style={{
                background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 12,
                cursor: 'pointer', fontFamily: "'Bebas Neue'", letterSpacing: 1.5, flexShrink: 0,
              }}>+ TOPUP</button>
            )}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: '#4ade80', fontSize: 14, fontWeight: 600, textAlign: 'center',
          }}>
            <IoCheckmark size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Verified! RM{SUBSCRIPTION_COST} deducted from your wallet.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: 'var(--red)', fontSize: 14,
          }}>
            <IoClose size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {error}
          </div>
        )}

        {/* Benefits */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Space Mono'", letterSpacing: 2, fontWeight: 700, marginBottom: 14 }}>
            WHAT YOU GET
          </div>
          {BENEFITS.map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i < BENEFITS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: '#4a9eff', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#fff', fontWeight: 900,
              }}><IoCheckmark size={12} /></div>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>{b}</span>
            </div>
          ))}
        </div>

        {/* Price */}
        {!subscribed && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px', marginBottom: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Space Mono'", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>MONTHLY PRICE</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>RM</span>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 48, color: 'var(--accent)', letterSpacing: 2, lineHeight: 1 }}>10</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>/month</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Deducted from your Bolahh wallet</div>
            </div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#4a9eff22', border: '2px solid #4a9eff44',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}><IoCheckmark size={24} /></div>
          </div>
        )}

        {/* CTA */}
        {subscribed ? (
          <button onClick={() => navigate('/profile')} style={{
            width: '100%', padding: '14px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15,
            letterSpacing: 1.5, cursor: 'pointer', fontFamily: "'Bebas Neue'",
          }}>
            BACK TO PROFILE
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={processing || loading || balance < SUBSCRIPTION_COST}
            style={{
              width: '100%', padding: '15px',
              background: balance >= SUBSCRIPTION_COST ? 'var(--accent)' : 'var(--card)',
              color: balance >= SUBSCRIPTION_COST ? '#fff' : 'var(--muted)',
              border: balance >= SUBSCRIPTION_COST ? 'none' : '1px solid var(--border)',
              borderRadius: 12, fontWeight: 700, fontSize: 16, letterSpacing: 2,
              cursor: balance >= SUBSCRIPTION_COST ? 'pointer' : 'not-allowed',
              opacity: processing || loading ? 0.6 : 1,
              transition: 'all 0.2s', fontFamily: "'Bebas Neue'",
            }}
          >
            {processing ? 'PROCESSING...' : balance < SUBSCRIPTION_COST ? 'INSUFFICIENT BALANCE' : 'SUBSCRIBE FOR RM10/MONTH'}
          </button>
        )}

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          RM10 will be deducted from your wallet. Valid for 30 days. Non-refundable.
          Resubscribe monthly to keep your verified badge.
        </p>

      </div>
    </div>
  );
}
