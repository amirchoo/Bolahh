import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import { clearCached } from '../lib/dataCache';
import { LuRecycle, LuTag } from "react-icons/lu";
import { MdOutlineCancel, MdOutlineStadium } from "react-icons/md";
import { IoWarningOutline, IoCalendar, IoTime, IoDocumentText, IoCheckmark, IoShieldCheckmark, IoPeople, IoHeart, IoAlertCircle, IoClose, IoWallet, IoQrCode, IoCard } from "react-icons/io5";
import { RiRefund2Line } from "react-icons/ri";
import { LuPartyPopper } from 'react-icons/lu';
import { GiSoccerBall } from 'react-icons/gi';



export default function GameCheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [game, setGame] = useState(null);
  const [field, setField] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [insufficientShortfall, setInsufficientShortfall] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [directSubMethod, setDirectSubMethod] = useState('fpx'); // 'fpx' | 'qr'
  const [pendingDirect, setPendingDirect] = useState(null); // { id, payment_ref } — reserved slot awaiting ToyyibPay confirmation
  const [verifyingDirect, setVerifyingDirect] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [joinedCount, setJoinedCount] = useState(0);
  const [bookingMode, setBookingMode] = useState('solo'); // 'solo' | 'group'
  const [guestNames, setGuestNames] = useState(['']);

  const returnStatus = searchParams.get('status_id'); // ToyyibPay redirects with status_id

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    if (pendingDirect && returnStatus === '1') completeDirectPay(pendingDirect);
  }, [pendingDirect, returnStatus]);

  const fetchData = async () => {
    setLoading(true);
    const [gameRes, profileRes, joinedRes, countRes] = await Promise.all([
      supabase.from('games').select('*, fields(*)').eq('id', id).single(),
      supabase.from('profiles').select('wallet_balance, name').eq('id', user.id).single(),
      supabase.from('game_players').select('id, payment_method, payment_status, payment_ref').eq('game_id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', id),
    ]);
    setJoinedCount(countRes.count || 0);
    if (gameRes.error || !gameRes.data) { navigate('/home'); return; }
    if (joinedRes.data) {
      if (joinedRes.data.payment_method === 'direct' && joinedRes.data.payment_status === 'pending') {
        // Slot already reserved, awaiting ToyyibPay confirmation — stay on this page to verify.
        setPendingDirect(joinedRes.data);
      } else {
        // Already joined some other way — nothing left to do here.
        navigate(`/game/${id}`);
        return;
      }
    }
    // Block checkout if within 10 minutes of game start
    const g = gameRes.data;
    const [gy, gm, gd] = g.date.split('-').map(Number);
    const [gh, gmin] = (g.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
    if (new Date() >= new Date(gameStart.getTime() - 10 * 60 * 1000) && !joinedRes.data) {
      navigate(`/game/${id}`);
      return;
    }
    setGame(gameRes.data);
    setField(gameRes.data.fields);
    setWalletBalance(profileRes.data?.wallet_balance || 0);
    setProfileName(profileRes.data?.name || '');
    setLoading(false);
  };

  const completeDirectPay = async (row) => {
    setVerifyingDirect(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-toyyibpay-game-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ billCode: row.payment_ref, gameId: id, userId: user.id }),
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error || `Verification failed (${res.status}). Please try again.`);
        return;
      }
      clearCached(`game_${id}`);
      setPaymentMethod('direct');
      setSuccess(true);
      setPendingDirect(null);
    } catch (err) {
      setError('Unexpected error: ' + String(err));
    } finally {
      setVerifyingDirect(false);
    }
  };

  const cancelPendingDirect = async () => {
    if (!pendingDirect) return;
    setVerifyingDirect(true);
    // Removes the booker's row and any guest rows reserved alongside it in the same bill.
    await supabase.from('game_players').delete()
      .eq('game_id', id).eq('payment_ref', pendingDirect.payment_ref).eq('payment_status', 'pending');
    setPendingDirect(null);
    setVerifyingDirect(false);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponData(null);

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      setCouponError('Invalid or expired coupon code.');
      setCouponLoading(false);
      return;
    }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      setCouponError('This coupon has reached its usage limit.');
      setCouponLoading(false);
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError('This coupon has expired.');
      setCouponLoading(false);
      return;
    }

    setCouponData(data);
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setCouponData(null);
    setCouponInput('');
    setCouponError('');
  };

  const addGuest = () => setGuestNames(prev => [...prev, '']);
  const removeGuest = (i) => setGuestNames(prev => prev.filter((_, idx) => idx !== i));
  const updateGuestName = (i, value) => setGuestNames(prev => prev.map((n, idx) => idx === i ? value : n));

  const handleConfirm = async () => {
    if (!agreed) { setError('Please agree to the terms before confirming.'); return; }

    const trimmedGuestNames = bookingMode === 'group' ? guestNames.map(n => n.trim()) : [];
    if (bookingMode === 'group' && (trimmedGuestNames.length === 0 || trimmedGuestNames.some(n => !n))) {
      setError('Please enter a name for every friend you\'re booking for.');
      return;
    }
    const totalSeats = 1 + trimmedGuestNames.length;
    if (joinedCount + totalSeats > game.slots) {
      setError(`Only ${Math.max(0, game.slots - joinedCount)} slot(s) left — reduce your guest count.`);
      return;
    }

    setConfirming(true);
    setError('');

    // Re-check locked state in case window passed while user was on this page
    const [gy, gm, gd] = game.date.split('-').map(Number);
    const [gh, gmin] = (game.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(gy, gm - 1, gd, gh - 8, gmin));
    if (new Date() >= new Date(gameStart.getTime() - 10 * 60 * 1000)) {
      setError('Booking closed. Game starts in less than 10 minutes.');
      setConfirming(false);
      return;
    }

    const guestRows = trimmedGuestNames.map(name => ({
      game_id: id, user_id: null, is_guest: true, guest_name: name, booked_by: user.id,
      amount_paid: 0,
    }));

    // Pay at Court: skip wallet balance checks/deduction, just hold the slot as pending cash
    if (paymentMethod === 'cash') {
      const { error: joinErr } = await supabase
        .from('game_players')
        .insert([
          { game_id: id, user_id: user.id, amount_paid: 0, payment_method: 'cash', payment_status: 'pending' },
          ...guestRows.map(g => ({ ...g, payment_method: 'cash', payment_status: 'pending' })),
        ]);

      if (joinErr) { setError('Failed to join game. Please try again.'); setConfirming(false); return; }

      clearCached(`game_${id}`);
      setSuccess(true);
      setConfirming(false);
      return;
    }

    // Re-validate coupon if applied
    let validatedCoupon = null;
    if (couponData) {
      const { data: freshCoupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', couponData.id)
        .eq('is_active', true)
        .maybeSingle();
      if (
        !freshCoupon ||
        (freshCoupon.max_uses !== null && freshCoupon.uses_count >= freshCoupon.max_uses) ||
        (freshCoupon.expires_at && new Date(freshCoupon.expires_at) < new Date())
      ) {
        setError('Your coupon is no longer valid. Please remove it and try again.');
        setConfirming(false);
        return;
      }
      validatedCoupon = freshCoupon;
    }

    const discountAmount = validatedCoupon
      ? parseFloat((game.price * totalSeats * validatedCoupon.discount_percentage / 100).toFixed(2))
      : 0;
    const chargeAmount = parseFloat((game.price * totalSeats - discountAmount).toFixed(2));

    // Online Pay: create a ToyyibPay bill scoped to this game, reserve the slot(s) as
    // pending, then redirect. Confirmed via callback or the verify step on return.
    // Price and coupon are re-validated server-side in create-toyyibpay-game-bill —
    // chargeAmount here is only used for the on-screen summary, not sent as the price.
    if (paymentMethod === 'direct') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-toyyibpay-game-bill`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              gameId:        id,
              userId:        user.id,
              userEmail:     user.email,
              userName:      profileName || user.email,
              couponCode:    validatedCoupon?.code || null,
              paymentMethod: directSubMethod,
              guestNames:    trimmedGuestNames,
              returnUrl:     window.location.origin + `/game/${id}/checkout`,
            }),
          }
        );
        const { billCode, error: fnError } = await res.json();
        if (fnError || !billCode) throw new Error(fnError || 'Could not create payment bill.');

        const toyyibBase = import.meta.env.VITE_TOYYIBPAY_BASE_URL ?? 'https://toyyibpay.com';
        window.location.href = `${toyyibBase}/${billCode}`;
      } catch (err) {
        setError(err.message || 'Something went wrong. Please try again.');
        setConfirming(false);
      }
      return;
    }

    // Re-fetch balance live to prevent race condition
    const { data: freshProfile } = await supabase
      .from('profiles').select('wallet_balance').eq('id', user.id).single();
    const freshBalance = freshProfile?.wallet_balance || 0;

    if (freshBalance < chargeAmount) {
      setInsufficientShortfall(parseFloat((chargeAmount - freshBalance).toFixed(2)));
      setShowInsufficientModal(true);
      setConfirming(false);
      return;
    }

    const newBalance = parseFloat((freshBalance - chargeAmount).toFixed(2));

    // Deduct wallet balance
    const { error: balanceErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    if (balanceErr) { setError('Payment failed. Please try again.'); setConfirming(false); return; }

    // Join the game
    const { error: joinErr } = await supabase
      .from('game_players')
      .insert([
        { game_id: id, user_id: user.id, amount_paid: chargeAmount },
        ...guestRows,
      ]);

    if (joinErr) {
      // Refund the deduction if join failed
      await supabase.from('profiles').update({ wallet_balance: freshBalance }).eq('id', user.id);
      setError('Failed to join game. Your balance has been restored.');
      setConfirming(false);
      return;
    }

    // Increment coupon uses_count
    if (validatedCoupon) {
      await supabase
        .from('coupons')
        .update({ uses_count: validatedCoupon.uses_count + 1 })
        .eq('id', validatedCoupon.id);
    }

    // Log transaction
    const guestSuffix = trimmedGuestNames.length > 0 ? ` (+${trimmedGuestNames.length} guest${trimmedGuestNames.length > 1 ? 's' : ''})` : '';
    const description = validatedCoupon
      ? `Joined game: ${game.title}${guestSuffix} (${validatedCoupon.discount_percentage}% off with code ${validatedCoupon.code})`
      : `Joined game: ${game.title}${guestSuffix}`;
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'payment',
      amount: chargeAmount,
      description,
      balance_after: newBalance,
    });

    clearCached(`game_${id}`);
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
          <IconLoading size={56} />
        </div>
      </div>
    );
  }

  const trimmedGuestNamesDisplay = bookingMode === 'group' ? guestNames.map(n => n.trim()).filter(Boolean) : [];
  const totalSeats = 1 + trimmedGuestNamesDisplay.length;
  const maxGuests = Math.max(0, game.slots - joinedCount - 1);
  const groupPrice = parseFloat((game.price * totalSeats).toFixed(2));
  const discountAmount = couponData
    ? parseFloat((groupPrice * couponData.discount_percentage / 100).toFixed(2))
    : 0;
  const finalPrice = parseFloat((groupPrice - discountAmount).toFixed(2));
  const balanceAfter = walletBalance - finalPrice;

  // ── Success Screen ──
  if (success) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="page-wrap" style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(74,222,128,0.12)', border: '1.5px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <LuPartyPopper size={36} color="#4ade80" />
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 8 }}>
            YOU'RE IN!
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: trimmedGuestNamesDisplay.length > 0 ? 12 : 28, lineHeight: 1.7 }}>
            Successfully joined <strong style={{ color: 'var(--text)' }}>{game.title}</strong>.<br />
            {paymentMethod === 'cash'
              ? <>Pay <strong style={{ color: 'var(--text)' }}>RM {groupPrice.toFixed(2)}</strong> by cash or QR at the court before kickoff.</>
              : paymentMethod === 'direct'
              ? <>RM {finalPrice.toFixed(2)} has been paid via ToyyibPay.</>
              : <>RM {finalPrice.toFixed(2)} has been deducted from your wallet.</>}
          </p>
          {trimmedGuestNamesDisplay.length > 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
              Booked with {trimmedGuestNamesDisplay.length} friend{trimmedGuestNamesDisplay.length > 1 ? 's' : ''}: <strong style={{ color: 'var(--text)' }}>{trimmedGuestNamesDisplay.join(', ')}</strong>
            </p>
          )}
          {paymentMethod === 'cash' ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Amount due at court</span>
                <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--accent)' }}>RM {groupPrice.toFixed(2)}</span>
              </div>
            </div>
          ) : (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left'
          }}>
            {discountAmount > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: 'var(--muted)' }}>Original fee</span>
                  <span style={{ fontFamily: "'Space Mono'", color: 'var(--muted)', textDecoration: 'line-through' }}>RM {groupPrice.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: '#4ade80' }}>Coupon discount ({couponData?.discount_percentage}% off)</span>
                  <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: '#4ade80' }}>− RM {discountAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: paymentMethod === 'direct' ? 0 : 8 }}>
              <span style={{ color: 'var(--muted)' }}>Amount paid</span>
              <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--tomato)' }}>− RM {finalPrice.toFixed(2)}</span>
            </div>
            {paymentMethod !== 'direct' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Remaining balance</span>
                <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--text)' }}>RM {walletBalance.toFixed(2)}</span>
              </div>
            )}
          </div>
          )}
          {/* Game Rules */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--accent)', marginBottom: 4 }}>
              Bolahh Game Rules
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              Bolahh is a community for all levels, from first-timers to seasoned ballers. We expect every player to uphold the spirit of the game.
            </p>

            {[
              {
                icon: <IoShieldCheckmark size={15} />,
                color: '#4ade80',
                title: 'Fair Play',
                rules: [
                  'No slide tackles. Keep your feet on the ground at all times.',
                  'No aggressive challenges, hard fouls, or reckless physical contact.',
                  'No barging, pushing, or holding opponents.',
                  'Futsal is about skill and movement. Let the ball do the work.',
                ],
              },
              {
                icon: <IoPeople size={15} />,
                color: '#60a5fa',
                title: 'Respect & Conduct',
                rules: [
                  'Respect all players regardless of skill level. New players are always welcome here.',
                  'No trash talk, taunting, or unsportsmanlike behaviour.',
                  'Disputes are settled calmly. No shouting, arguing, or confrontation.',
                  'Good manner is tracked on your Bolahh Card. Play with integrity.',
                ],
              },
              {
                icon: <IoHeart size={15} />,
                color: '#f87171',
                title: 'Safety First',
                rules: [
                  'Proper futsal shoes only. No cleats or barefoot play.',
                  'If a player is injured, stop play immediately.',
                  'Do not continue a challenge if the opponent has clearly lost the ball.',
                ],
              },
              {
                icon: <IoAlertCircle size={15} />,
                color: '#fb923c',
                title: 'Consequences',
                rules: [
                  'Repeated rough play or poor conduct will result in removal from the session.',
                  'Serious violations will lead to a permanent ban from the Bolahh platform.',
                  'The session manager has full authority to remove any player at any time.',
                ],
              },
            ].map((section, si) => (
              <div key={si} style={{ marginBottom: si < 3 ? 18 : 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  marginBottom: 10,
                }}>
                  <span style={{ color: section.color }}>{section.icon}</span>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 1.5, color: 'var(--text)' }}>
                    {section.title}
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {section.rules.map((rule, ri) => (
                    <li key={ri} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: section.color, flexShrink: 0, marginTop: 6 }} />
                      {rule}
                    </li>
                  ))}
                </ul>
                {si < 3 && <div style={{ height: 1, background: 'var(--border)', marginTop: 18 }} />}
              </div>
            ))}

            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
              textAlign: 'center', fontFamily: "'Bebas Neue'", fontSize: 14,
              letterSpacing: 2, color: 'var(--accent)',
            }}>
              Play hard. Play fair. Play Bolahh.
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

  // ── Pending direct-pay screen — slot is reserved, waiting on ToyyibPay confirmation ──
  if (pendingDirect) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="page-wrap" style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(240,157,81,0.12)', border: '1.5px solid rgba(240,157,81,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <IoCard size={34} color="var(--accent)" />
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 3, color: 'var(--text)', marginBottom: 8 }}>
            {verifyingDirect ? 'CONFIRMING PAYMENT…' : 'PAYMENT PENDING'}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
            Your slot for <strong style={{ color: 'var(--text)' }}>{game.title}</strong> is reserved while we confirm your ToyyibPay payment.
          </p>

          {error && (
            <div style={{
              background: 'rgba(224,62,26,0.1)', border: '1px solid rgba(224,62,26,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              color: 'var(--red)', fontSize: 13, fontWeight: 600, textAlign: 'left'
            }}>{error}</div>
          )}

          <button
            onClick={() => completeDirectPay(pendingDirect)}
            disabled={verifyingDirect}
            style={{
              width: '100%', padding: '15px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, letterSpacing: 2,
              cursor: verifyingDirect ? 'not-allowed' : 'pointer', opacity: verifyingDirect ? 0.6 : 1,
              fontFamily: "'Bebas Neue'", marginBottom: 10
            }}
          >{verifyingDirect ? 'CHECKING…' : "I'VE PAID — VERIFY NOW"}</button>

          <button
            onClick={cancelPendingDirect}
            disabled={verifyingDirect}
            style={{
              width: '100%', padding: '12px', background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 12, fontSize: 14,
              cursor: verifyingDirect ? 'not-allowed' : 'pointer'
            }}
          >Cancel & choose another payment method</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {showInsufficientModal && (
        <div
          onClick={e => e.target === e.currentTarget && setShowInsufficientModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
            zIndex: 1000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 16
          }}
        >
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 360,
            textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'rgba(224,62,26,0.1)', border: '1.5px solid rgba(224,62,26,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <IoWallet size={30} color="#e03e1a" />
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>
              INSUFFICIENT BALANCE
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 22 }}>
              Your wallet doesn't have enough funds to pay for this game. Top up to continue.
            </p>
            <div style={{
              background: 'var(--card2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '16px 18px', marginBottom: 22, textAlign: 'left'
            }}>
              {[
                { label: 'Your balance', value: `RM ${walletBalance.toFixed(2)}`, color: 'var(--text)' },
                { label: 'Amount due', value: `RM ${finalPrice.toFixed(2)}`, color: 'var(--tomato)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 10px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>You need</span>
                <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--red)' }}>+ RM {insufficientShortfall.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/wallet/topup')}
              style={{
                width: '100%', padding: '14px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer',
                fontFamily: "'Bebas Neue'", letterSpacing: 2, marginBottom: 10,
                transition: 'opacity 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >TOPUP NOW</button>
            <button
              onClick={() => setShowInsufficientModal(false)}
              style={{
                width: '100%', padding: '12px',
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 12,
                fontSize: 14, cursor: 'pointer'
              }}
            >Maybe Later</button>
          </div>
        </div>
      )}

      <div className="page-wrap" style={{ maxWidth: 520, margin: '0 auto', padding: '32px 24px' }}>

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
            {[
              { icon: <IoCalendar size={11} />, text: formatDate(game.date) },
              { icon: <IoTime size={11} />, text: formatTime(game.time) },
              { icon: <GiSoccerBall size={11} />, text: game.format },
              ...(game.court ? [{ icon: <MdOutlineStadium size={11} />, text: `Court ${game.court}` }] : []),
            ].map((item, i) => (
              <span key={i} style={{
                background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 10px', fontSize: 12, fontFamily: "'Space Mono'",
                display: 'inline-flex', alignItems: 'center', gap: 5
              }}>{item.icon}{item.text}</span>
            ))}
          </div>
        </div>

        {/* Bringing friends? */}
        {maxGuests > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 16
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>BOOKING FOR</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: bookingMode === 'group' ? 16 : 0 }}>
            {[
              { key: 'solo', label: 'Just Me' },
              { key: 'group', label: 'Bringing Friends' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setBookingMode(opt.key)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: bookingMode === opt.key ? 'rgba(240,157,81,0.1)' : 'var(--card2)',
                color: bookingMode === opt.key ? 'var(--accent)' : 'var(--muted)',
                border: `1.5px solid ${bookingMode === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 8px', cursor: 'pointer'
              }}>
                <IoPeople size={15} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {bookingMode === 'group' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                You'll pay for everyone. {maxGuests} more slot{maxGuests !== 1 ? 's' : ''} available.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {guestNames.map((name, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder={`Friend ${i + 1} name`}
                      value={name}
                      onChange={e => updateGuestName(i, e.target.value)}
                      style={{ flex: 1, fontSize: 13, height: 38 }}
                    />
                    {guestNames.length > 1 && (
                      <button type="button" onClick={() => removeGuest(i)} style={{
                        background: 'transparent', border: 'none', color: 'var(--muted)',
                        cursor: 'pointer', display: 'flex', padding: 6, flexShrink: 0
                      }}><IoClose size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addGuest}
                disabled={guestNames.length >= maxGuests}
                style={{
                  background: 'var(--card2)', color: guestNames.length >= maxGuests ? 'var(--muted)' : 'var(--accent)',
                  border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px',
                  fontSize: 12, fontWeight: 700,
                  cursor: guestNames.length >= maxGuests ? 'not-allowed' : 'pointer',
                  opacity: guestNames.length >= maxGuests ? 0.5 : 1,
                }}
              >+ Add another friend</button>
            </>
          )}
        </div>
        )}

        {/* Payment method selector */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 16
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>PAYMENT METHOD</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'wallet', label: 'Bolahh Wallet', icon: <IoWallet size={15} />, desc: 'Charged now' },
              { key: 'direct', label: 'Online Pay', icon: <IoQrCode size={15} />, desc: 'FPX / DuitNow QR' },
              ...(game.allow_pay_at_court ? [{ key: 'cash', label: 'Pay at Court', icon: <MdOutlineStadium size={15} />, desc: 'Book now, pay later' }] : []),
            ].map(opt => (
              <button key={opt.key} onClick={() => setPaymentMethod(opt.key)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: paymentMethod === opt.key ? 'rgba(240,157,81,0.1)' : 'var(--card2)',
                color: paymentMethod === opt.key ? 'var(--accent)' : 'var(--muted)',
                border: `1.5px solid ${paymentMethod === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 8px', cursor: 'pointer'
              }}>
                {opt.icon}
                <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                <span style={{ fontSize: 11, opacity: 0.75 }}>{opt.desc}</span>
              </button>
            ))}
          </div>

          {paymentMethod === 'direct' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {[
                { key: 'fpx', label: 'Online Banking', icon: <IoCard size={14} /> },
                { key: 'qr', label: 'DuitNow QR', icon: <IoQrCode size={14} /> },
              ].map(opt => (
                <button key={opt.key} onClick={() => setDirectSubMethod(opt.key)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: directSubMethod === opt.key ? 'rgba(240,157,81,0.1)' : 'var(--card2)',
                  color: directSubMethod === opt.key ? 'var(--accent)' : 'var(--muted)',
                  border: `1.5px solid ${directSubMethod === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700
                }}>
                  {opt.icon}{opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        {paymentMethod === 'cash' ? (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px', marginBottom: 16
          }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>PAYMENT SUMMARY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>Due at court{totalSeats > 1 ? ` (${totalSeats} slots)` : ''}</span>
              <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--accent)' }}>RM {groupPrice.toFixed(2)}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
              No wallet charge now. Pay the full amount by cash or QR at the venue before kickoff.
            </p>
          </div>
        ) : (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 16
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>PAYMENT SUMMARY</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: 'var(--text)' }}>Game fee{totalSeats > 1 ? ` (${totalSeats} slots)` : ''}</span>
            <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: couponData ? 'var(--muted)' : 'var(--text)', textDecoration: couponData ? 'line-through' : 'none' }}>RM {groupPrice.toFixed(2)}</span>
          </div>

          {/* Coupon section */}
          {!couponData ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <LuTag size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    placeholder="Promo code"
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    style={{ paddingLeft: 30, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, height: 38 }}
                  />
                </div>
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  style={{
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 700,
                    cursor: couponLoading || !couponInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: couponLoading || !couponInput.trim() ? 0.5 : 1,
                    fontFamily: "'Bebas Neue'", letterSpacing: 1, whiteSpace: 'nowrap'
                  }}
                >{couponLoading ? '...' : 'APPLY'}</button>
              </div>
              {couponError && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6, paddingLeft: 2 }}>{couponError}</div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 10, background: 'rgba(74,222,128,0.07)',
              border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, padding: '7px 12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <LuTag size={13} color="#4ade80" />
                <span style={{ fontSize: 13, color: '#4ade80', fontFamily: "'Space Mono'", fontWeight: 700 }}>{couponData.code}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{couponData.discount_percentage}% off</span>
              </div>
              <button onClick={removeCoupon} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <IoClose size={15} />
              </button>
            </div>
          )}

          {couponData && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: '#4ade80' }}>Discount ({couponData.discount_percentage}% off)</span>
              <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: '#4ade80' }}>− RM {discountAmount.toFixed(2)}</span>
            </div>
          )}

          {paymentMethod === 'direct' ? (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Total to pay</span>
                <span style={{ fontFamily: "'Space Mono'", fontWeight: 700, color: 'var(--accent)' }}>RM {finalPrice.toFixed(2)}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
                You'll be redirected to ToyyibPay to pay via {directSubMethod === 'qr' ? 'DuitNow QR' : 'Online Banking (FPX)'}. Your wallet is not charged.
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        )}

        {/* Refund policy */}
        {paymentMethod === 'cash' ? (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px', marginBottom: 16
          }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoDocumentText size={14} /> CANCELLATION POLICY
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              Since no payment is taken now, there's nothing to refund. Please cancel your slot as early as possible if you can't make it, so the manager can offer it to someone else.
            </p>
          </div>
        ) : (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 16
        }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoDocumentText size={14} /> REFUND & CANCELLATION POLICY
          </div>

          {[
            {
              icon: <RiRefund2Line />,
              title: 'Full Refund (game cancelled by organiser)',
              desc: 'If the organiser cancels, you get 100% back to your Bolahh wallet within 24 hours.',
            },
            {
              icon: <RiRefund2Line />,
              title: 'Full Refund (cancel 24hrs before)',
              desc: 'Cancel at least 24 hours before kickoff and get a full refund to your wallet.',
            },
            {
              icon: <IoWarningOutline />,
              title: '50% Refund (cancel 2 to 24hrs before)',
              desc: 'Cancel between 2 and 24 hours before the game and get half your money back.',
            },
            {
              icon: <MdOutlineCancel />,
              title: 'No Refund (under 2hrs or no-show)',
              desc: 'Cancelling within 2 hours of the game or not showing up gets no refund.',
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
        )}

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
            {agreed && <IoCheckmark size={12} />}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
            {paymentMethod === 'cash' ? (
              <>I have read and agree to the cancellation policy. I understand I must pay <strong>RM {groupPrice.toFixed(2)}</strong> by cash or QR at the court before playing.</>
            ) : paymentMethod === 'direct' ? (
              <>
                I have read and agree to the refund & cancellation policy. I understand I will be redirected to ToyyibPay to pay{' '}
                {couponData ? (
                  <>
                    <strong style={{ color: 'var(--muted)', textDecoration: 'line-through' }}>RM {groupPrice.toFixed(2)}</strong>{' '}
                    <strong style={{ color: '#4ade80' }}>RM {finalPrice.toFixed(2)}</strong>
                  </>
                ) : (
                  <strong>RM {finalPrice.toFixed(2)}</strong>
                )}{' '}
                , and any refund will be credited to my Bolahh wallet.
              </>
            ) : (
              <>
                I have read and agree to the refund & cancellation policy. I understand that my wallet will be charged{' '}
                {couponData ? (
                  <>
                    <strong style={{ color: 'var(--muted)', textDecoration: 'line-through' }}>RM {groupPrice.toFixed(2)}</strong>{' '}
                    <strong style={{ color: '#4ade80' }}>RM {finalPrice.toFixed(2)}</strong>
                  </>
                ) : (
                  <strong>RM {finalPrice.toFixed(2)}</strong>
                )}{' '}
                upon confirming.
              </>
            )}
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
          {confirming
            ? 'PROCESSING...'
            : paymentMethod === 'cash' ? 'CONFIRM BOOKING' : `CONFIRM & PAY RM ${finalPrice.toFixed(2)}`}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 14 }}>
          {paymentMethod === 'cash'
            ? 'No wallet charge. Pay by cash or QR at the court before kickoff.'
            : paymentMethod === 'direct'
            ? "You'll be redirected to ToyyibPay to complete payment."
            : 'Payment is deducted instantly from your Bolahh wallet.'}
        </p>

      </div>
    </div>
  );
}
