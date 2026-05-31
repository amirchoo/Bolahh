import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import { clearCached } from '../lib/dataCache';
import { RiRefund2Line } from 'react-icons/ri';
import { IoWarningOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { MdOutlineCancel } from 'react-icons/md';
import { MdDateRange, MdAccessTime } from 'react-icons/md';
import { FaLocationDot } from 'react-icons/fa6';

function getRefundTier(hoursUntilGame) {
  if (hoursUntilGame >= 24) return { pct: 1.0,   label: 'Full Refund',  color: '#4ade80', icon: 'full' };
  if (hoursUntilGame >= 2)  return { pct: 0.5,   label: '50% Refund',   color: 'var(--accent)', icon: 'half' };
  return                           { pct: 0,     label: 'No Refund',    color: 'var(--red)', icon: 'none' };
}

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
  return `${timeStr} ${ampm}`;
};

export default function GameCancelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
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
    if (!joinedRes.data) { navigate(`/game/${id}`); return; }
    setGame(gameRes.data);
    setWalletBalance(profileRes.data?.wallet_balance || 0);
    setLoading(false);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');

    const [gy, gm, gd] = game.date.split('-').map(Number);
    const [gh, gmin] = (game.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
    const hoursUntilGame = (gameStart - new Date()) / (1000 * 60 * 60);
    const { pct, label } = getRefundTier(hoursUntilGame);
    const refundAmount = parseFloat((game.price * pct).toFixed(2));

    const { error: leaveErr, count } = await supabase
      .from('game_players')
      .delete({ count: 'exact' })
      .eq('game_id', id)
      .eq('user_id', user.id);

    if (leaveErr || count === 0) {
      console.error('Cancel failed:', leaveErr, 'rows deleted:', count);
      setError('Failed to cancel booking. Please try again.');
      setConfirming(false);
      return;
    }

    if (refundAmount > 0) {
      const { data: freshProfile } = await supabase
        .from('profiles').select('wallet_balance').eq('id', user.id).single();
      const freshBalance = freshProfile?.wallet_balance || 0;
      const newBalance = parseFloat((freshBalance + refundAmount).toFixed(2));

      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'refund',
        amount: refundAmount,
        description: `Cancelled: ${game.title} (${label})`,
        balance_after: newBalance,
      });
    }

    clearCached(`game_${id}`);
    setSuccess(true);
    setConfirming(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
          <IconLoading size={16} />
          <p style={{ marginTop: 12 }}>Loading...</p>
        </div>
      </div>
    );
  }

  const [gy, gm, gd] = game.date.split('-').map(Number);
  const [gh, gmin] = (game.time || '00:00').split(':').map(Number);
  const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
  const hoursUntilGame = (gameStart - new Date()) / (1000 * 60 * 60);
  const tier = getRefundTier(hoursUntilGame);
  const refundAmount = parseFloat((game.price * tier.pct).toFixed(2));
  const balanceAfter = parseFloat((walletBalance + refundAmount).toFixed(2));

  const sectionTitle = {
    fontFamily: "'Bebas Neue'", fontSize: 13,
    letterSpacing: 2, color: 'var(--muted)', marginBottom: 14
  };

  const policyRows = [
    { icon: <RiRefund2Line />, label: '24+ hours before',  desc: 'Full refund to wallet',  color: '#4ade80',        active: hoursUntilGame >= 24 },
    { icon: <IoWarningOutline />, label: '2 to 24 hours before', desc: '50% refund to wallet', color: 'var(--accent)',   active: hoursUntilGame >= 2 && hoursUntilGame < 24 },
    { icon: <MdOutlineCancel />, label: 'Under 2 hours',    desc: 'No refund',              color: 'var(--red)',      active: hoursUntilGame < 2 },
  ];

  if (success) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="page-wrap" style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><IoCheckmarkCircle size={52} color="#4ade80" /></div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>
            Booking Cancelled
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
            {refundAmount > 0
              ? `RM ${refundAmount.toFixed(2)} has been refunded to your Bolahh wallet.`
              : 'Your booking has been cancelled. No refund applies.'}
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 32px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer'
            }}
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>

        <button onClick={() => navigate(`/game/${id}`)} style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0
        }}>← Back to Game</button>

        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>
          Cancel Booking
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          Review your refund before cancelling
        </p>

        {/* Game summary */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={sectionTitle}>GAME</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{game.fields?.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>{game.title}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { icon: <FaLocationDot />, label: game.area },
              { icon: <MdDateRange />, label: formatDate(game.date) },
              { icon: <MdAccessTime />, label: formatTime(game.time) },
            ].map(({ icon, label }) => (
              <span key={label} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 10px', fontSize: 12, fontFamily: "'Space Mono'"
              }}>{icon}{label}</span>
            ))}
          </div>
        </div>

        {/* Refund breakdown */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={sectionTitle}>REFUND BREAKDOWN</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: 'var(--text)' }}>Amount paid</span>
            <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--text)' }}>RM {Number(game.price).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: 'var(--text)' }}>Refund rate</span>
            <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: tier.color }}>
              {tier.pct === 1 ? '100%' : tier.pct === 0.5 ? '50%' : '0%'}
            </span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>You will receive</span>
            <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: tier.color }}>
              RM {refundAmount.toFixed(2)}
            </span>
          </div>
          {refundAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}>
              <span style={{ color: 'var(--muted)' }}>Wallet balance after</span>
              <span style={{ fontFamily: "'Space Mono'", color: 'var(--muted)' }}>RM {balanceAfter.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Policy rows */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={sectionTitle}>CANCELLATION POLICY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {policyRows.map(({ icon, label, desc, color, active }) => (
              <div key={label} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '10px 14px', borderRadius: 10,
                background: active ? `${color}18` : 'var(--card2)',
                border: `1px solid ${active ? color : 'var(--border)'}`,
                opacity: active ? 1 : 0.45,
              }}>
                <span style={{ color, fontSize: 16, marginTop: 1, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: active ? color : 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                </div>
                {active && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono'",
                    color, background: `${color}22`, border: `1px solid ${color}`,
                    borderRadius: 6, padding: '2px 8px', flexShrink: 0
                  }}>APPLIES</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(224,62,26,0.08)', border: '1px solid rgba(224,62,26,0.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            color: 'var(--red)', fontSize: 13
          }}>{error}</div>
        )}

        <button
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            width: '100%', padding: '13px',
            background: tier.pct === 0 ? 'transparent' : 'var(--red)',
            color: tier.pct === 0 ? 'var(--red)' : '#fff',
            border: tier.pct === 0 ? '1.5px solid var(--red)' : 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 15,
            cursor: confirming ? 'default' : 'pointer',
            opacity: confirming ? 0.6 : 1, transition: 'all 0.15s'
          }}
        >
          {confirming ? 'Cancelling...' : tier.pct === 0 ? 'Cancel with No Refund' : `Cancel & Receive RM ${refundAmount.toFixed(2)}`}
        </button>

      </div>
    </div>
  );
}
