import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import { LuRecycle } from "react-icons/lu";
import { MdOutlineCancel } from "react-icons/md";
import { IoWarningOutline } from "react-icons/io5";
import { RiRefund2Line } from "react-icons/ri";



export default function GameCheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [field, setField] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [gameRes, profileRes, joinedRes] = await Promise.all([
      supabase.from('games').select('*, fields(*)').eq('id', id).single(),
      supabase.from('profiles').select('wallet_balance').eq('id', user.id).single(),
      supabase.from('game_players').select('id').eq('game_id', id).eq('user_id', user.id).maybeSingle(),
    ]);
    if (gameRes.error || !gameRes.data) { navigate('/home'); return; }
    // If already joined, redirect back
    if (joinedRes.data) { navigate(`/game/${id}`); return; }
    // Block checkout if within 10 minutes of game start
    const g = gameRes.data;
    const [gy, gm, gd] = g.date.split('-').map(Number);
    const [gh, gmin] = (g.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
    if (new Date() >= new Date(gameStart.getTime() - 10 * 60 * 1000)) {
      navigate(`/game/${id}`);
      return;
    }
    setGame(gameRes.data);
    setField(gameRes.data.fields);
    setWalletBalance(profileRes.data?.wallet_balance || 0);
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!agreed) { setError('Please agree to the terms before confirming.'); return; }
    setConfirming(true);
    setError('');

    // Re-check locked state in case window passed while user was on this page
    const [gy, gm, gd] = game.date.split('-').map(Number);
    const [gh, gmin] = (game.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
    if (new Date() >= new Date(gameStart.getTime() - 10 * 60 * 1000)) {
      setError('Booking is now closed — game starts in less than 10 minutes.');
      setConfirming(false);
      return;
    }

    // Re-fetch balance live to prevent race condition
    const { data: freshProfile } = await supabase
      .from('profiles').select('wallet_balance').eq('id', user.id).single();
    const freshBalance = freshProfile?.wallet_balance || 0;

    if (freshBalance < game.price) {
      setError('Insufficient wallet balance. Please top up first.');
      setConfirming(false);
      return;
    }

    const newBalance = freshBalance - game.price;

    // Deduct wallet balance
    const { error: balanceErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    if (balanceErr) { setError('Payment failed. Please try again.'); setConfirming(false); return; }

    // Join the game
    const { error: joinErr } = await supabase
      .from('game_players')
      .insert({ game_id: id, user_id: user.id });

    if (joinErr) {
      // Refund the deduction if join failed
      await supabase.from('profiles').update({ wallet_balance: freshBalance }).eq('id', user.id);
      setError('Failed to join game. Your balance has been restored.');
      setConfirming(false);
      return;
    }

    // Log transaction
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'payment',
      amount: game.price,
      description: `Joined game: ${game.title}`,
      balance_after: newBalance,
    });

    setWalletBalance(newBalance);
    setSuccess(true);
    setConfirming(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${timeStr}${ampm}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}><IconLoading size={16} /></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const balanceAfter = walletBalance - (game?.price || 0);

  // ── Success Screen ──
  if (success) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(74,222,128,0.12)', border: '1.5px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 36
          }}>🎉</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 8 }}>
            YOU'RE IN!
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
            Successfully joined <strong style={{ color: 'var(--text)' }}>{game.title}</strong>.<br />
            RM {Number(game.price).toFixed(2)} has been deducted from your wallet.
          </p>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: 'var(--muted)' }}>Amount paid</span>
              <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--tomato)' }}>− RM {Number(game.price).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Remaining balance</span>
              <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--text)' }}>RM {walletBalance.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={() => navigate(`/game/${id}`)} style={{
            width: '100%', padding: '14px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15,
            cursor: 'pointer', marginBottom: 10, fontFamily: "'Bebas Neue'", letterSpacing: 2
          }}>VIEW GAME</button>
          <button onClick={() => navigate('/home')} style={{
            width: '100%', padding: '12px', background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, cursor: 'pointer'
          }}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => navigate(`/game/${id}`)} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
        }}>← Back</button>

        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
          CONFIRM BOOKING
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Review your booking details before confirming payment.
        </p>

        {/* Game summary card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 16
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 12 }}>GAME DETAILS</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>{field?.name} . {game.area}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}> {game.title}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[`📅 ${formatDate(game.date)}`, `🕐 ${formatTime(game.time)}`, `⚽ ${game.format}`].map(t => (
              <span key={t} style={{
                background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 10px', fontSize: 12, fontFamily: "'Space Mono'"
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Payment breakdown */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 16
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>PAYMENT SUMMARY</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: 'var(--text)' }}>Game fee</span>
            <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--text)' }}>RM {Number(game.price).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: 'var(--text)' }}>Current wallet balance</span>
            <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--text)' }}>RM {walletBalance.toFixed(2)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Balance after payment</span>
            <span style={{
              fontFamily: "'Space Mono'", fontWeight: 700,
              color: balanceAfter >= 0 ? '#4ade80' : 'var(--red)'
            }}>
              RM {balanceAfter.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Refund policy */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 16
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>
            📋 REFUND & CANCELLATION POLICY
          </div>

          {[
            {
              icon: <RiRefund2Line />,
              title: 'Full Refund — Game Cancelled by Organiser',
              desc: 'If the organiser cancels the game, 100% of the game fee will be refunded to your Bolahh wallet within 24 hours.',
            },
            {
              icon: <RiRefund2Line />,
              title: 'Full Refund — Cancelled 24hrs Before',
              desc: 'You may cancel your booking up to 24 hours before the game start time for a full refund to your wallet.',
            },
            {
              icon: <IoWarningOutline />,
              title: '50% Refund — Cancelled 2–24hrs Before',
              desc: 'Cancellations made between 2 and 24 hours before the game will receive a 50% refund to your wallet.',
            },
            {
              icon: <MdOutlineCancel />,
              title: 'No Refund — Cancelled Under 2hrs / No-Show',
              desc: 'Cancellations within 2 hours of the game or no-shows are not eligible for a refund.',
            },
            {
              icon: <LuRecycle />,
              title: 'Wallet Refunds Only',
              desc: 'All refunds are credited to your Bolahh wallet. Refunds to bank accounts are not available.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, marginBottom: i < 4 ? 14 : 0,
              paddingBottom: i < 4 ? 14 : 0,
              borderBottom: i < 4 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Agree checkbox */}
        <div
          onClick={() => setAgreed(!agreed)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: agreed ? 'rgba(240,157,81,0.06)' : 'var(--card)',
            border: `1.5px solid ${agreed ? 'rgba(240,157,81,0.4)' : 'var(--border)'}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
            cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
            background: agreed ? 'var(--accent)' : 'transparent',
            border: `2px solid ${agreed ? 'var(--accent)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', fontSize: 12, color: '#fff'
          }}>
            {agreed && '✓'}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
            I have read and agree to the refund & cancellation policy. I understand that my wallet will be charged <strong>RM {Number(game.price).toFixed(2)}</strong> upon confirming.
          </span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(224,62,26,0.1)', border: '1px solid rgba(224,62,26,0.25)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            color: 'var(--red)', fontSize: 13, fontWeight: 600
          }}>{error}</div>
        )}

        <button
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            width: '100%', padding: '15px',
            background: agreed ? 'var(--accent)' : 'var(--card)',
            color: agreed ? '#fff' : 'var(--muted)',
            border: agreed ? 'none' : '1px solid var(--border)',
            borderRadius: 12, fontWeight: 700, fontSize: 16,
            cursor: agreed && !confirming ? 'pointer' : 'not-allowed',
            opacity: confirming ? 0.6 : 1, transition: 'all 0.2s',
            fontFamily: "'Bebas Neue'", letterSpacing: 2
          }}
        >
          {confirming ? 'PROCESSING...' : `CONFIRM & PAY RM ${Number(game.price).toFixed(2)}`}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 14 }}>
          Payment is deducted instantly from your Bolahh wallet.
        </p>

      </div>
    </div>
  );
}
