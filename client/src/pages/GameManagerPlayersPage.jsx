import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import { clearCached } from '../lib/dataCache';
import { MdDateRange, MdAccessTime } from 'react-icons/md';
import { FaLocationDot } from 'react-icons/fa6';
import { IoWalletOutline, IoQrCodeOutline, IoCallOutline } from 'react-icons/io5';

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

export default function GameManagerPlayersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingPaidId, setMarkingPaidId] = useState(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: gameData } = await supabase.from('games').select('*, fields(name)').eq('id', id).single();
    if (!gameData || gameData.created_by !== user.id) { navigate('/manager'); return; }
    setGame(gameData);

    const { data: playerRows } = await supabase
      .from('game_players')
      .select('id, user_id, amount_paid, payment_method, payment_status, joined_at')
      .eq('game_id', id)
      .order('joined_at', { ascending: true });

    const userIds = [...new Set((playerRows || []).map(p => p.user_id))];
    let profileMap = {};
    let phoneMap = {};
    if (userIds.length > 0) {
      const [{ data: profilesData }, { data: phoneData }] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_url').in('id', userIds),
        supabase.from('player_phone_numbers').select('user_id, phone_number').in('user_id', userIds),
      ]);
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
      (phoneData || []).forEach(p => { phoneMap[p.user_id] = p.phone_number; });
    }

    setRows((playerRows || []).map(p => ({ ...p, profile: profileMap[p.user_id], phone: phoneMap[p.user_id] })));
    setLoading(false);
  };

  const handleCopyPhone = async (row) => {
    try {
      await navigator.clipboard.writeText(row.phone);
    } catch {
      return;
    }
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(prev => (prev === row.id ? null : prev)), 1500);
  };

  const handleMarkPaid = async (row) => {
    setMarkingPaidId(row.id);
    const { error: updateErr } = await supabase
      .from('game_players')
      .update({ payment_status: 'paid', amount_paid: game.price })
      .eq('id', row.id);
    setMarkingPaidId(null);
    if (updateErr) { setError(updateErr.message); return; }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, payment_status: 'paid', amount_paid: game.price } : r));
    clearCached('manager_data');
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

  const paidCount = rows.filter(r => r.payment_status === 'paid').length;
  const pendingCount = rows.length - paidCount;

  const sectionTitle = {
    fontFamily: "'Bebas Neue'", fontSize: 13,
    letterSpacing: 2, color: 'var(--muted)', marginBottom: 14
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>

        <button onClick={() => navigate('/manager')} style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0
        }}>← Back to Manager</button>

        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>
          {game.title}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>{game.fields?.name}</p>

        {/* Game summary */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
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
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: 'var(--text)' }}>{rows.length}/{game.slots}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Players</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: '#4ade80' }}>{paidCount}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Paid</div>
            </div>
            {pendingCount > 0 && (
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: 'var(--accent)' }}>{pendingCount}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Pending</div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(224,62,26,0.08)', border: '1px solid rgba(224,62,26,0.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            color: 'var(--red)', fontSize: 13
          }}>{error}</div>
        )}

        {/* Player list */}
        <div style={sectionTitle}>PLAYER LIST</div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {rows.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No players have booked yet.</div>
          ) : rows.map((row, i) => {
            const isCash = row.payment_method === 'cash';
            const isPending = row.payment_status === 'pending';
            return (
              <div key={row.id} style={{
                padding: '14px 20px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {row.profile?.avatar_url
                      ? <img src={row.profile.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : (
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', background: 'var(--card2)',
                          border: '1px solid var(--border)', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: 'var(--muted)',
                        }}>{(row.profile?.name?.[0] || '?').toUpperCase()}</div>
                      )
                    }
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.profile?.name || 'Player'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
                        {isCash ? <IoQrCodeOutline size={12} /> : <IoWalletOutline size={12} />}
                        {isCash ? 'Cash / QR at court' : 'Wallet'}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: isPending ? 'rgba(240,157,81,0.12)' : 'rgba(74,222,128,0.1)',
                    color: isPending ? 'var(--accent)' : '#4ade80',
                    border: `1px solid ${isPending ? 'rgba(240,157,81,0.3)' : 'rgba(74,222,128,0.3)'}`,
                    borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{isPending ? 'PENDING' : 'PAID'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {row.phone && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(row)}
                        title="Tap to copy"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: copiedId === row.id ? 'rgba(74,222,128,0.1)' : 'var(--card2)',
                          color: copiedId === row.id ? '#4ade80' : 'var(--text)',
                          border: `1px solid ${copiedId === row.id ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                          borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: "'Space Mono'",
                        }}
                      >{copiedId === row.id ? 'Copied!' : row.phone}</button>
                      <a href={`tel:${row.phone}`} title={`Call ${row.phone}`} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, flexShrink: 0,
                        background: 'var(--card2)', color: 'var(--accent)',
                        border: '1px solid var(--border)', borderRadius: 8,
                      }}><IoCallOutline size={14} /></a>
                    </>
                  )}
                  {isCash && isPending && (
                    <button
                      onClick={() => handleMarkPaid(row)}
                      disabled={markingPaidId === row.id}
                      style={{
                        background: 'rgba(74,222,128,0.1)', color: '#4ade80',
                        border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8,
                        padding: '6px 12px', fontSize: 12, fontWeight: 700,
                        opacity: markingPaidId === row.id ? 0.6 : 1, marginLeft: 'auto',
                      }}
                    >{markingPaidId === row.id ? 'Saving...' : 'Mark Paid'}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
