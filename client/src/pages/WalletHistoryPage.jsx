import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { IconLoading } from '../components/Icons';
import {
  IoAdd, IoArrowUp, IoArrowDown, IoReceipt,
} from 'react-icons/io5';

const TYPE_META = {
  topup:            { label: 'Wallet Top Up',      credit: true },
  refund:           { label: 'Refund',              credit: true },
  payment:          { label: 'Game Payment',        credit: false },
  subscription:     { label: 'Bolahh Verified',     credit: false },
  admin_adjustment: { label: 'Admin Adjustment',     credit: null }, // sign comes from amount
};

export default function WalletHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [balance,      setBalance]      = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profile }, { data: tx }] = await Promise.all([
      supabase.from('profiles').select('wallet_balance').eq('id', user.id).single(),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
    ]);
    setBalance(profile?.wallet_balance || 0);
    setTransactions(tx || []);
    setLoading(false);
  };

  const isCredit = (tx) => {
    const meta = TYPE_META[tx.type];
    if (!meta) return (tx.amount || 0) >= 0;
    return meta.credit === null ? (tx.amount || 0) >= 0 : meta.credit;
  };

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // Group consecutive transactions by calendar day for a bank-statement feel.
  const grouped = transactions.reduce((acc, tx) => {
    const { date } = formatDateTime(tx.created_at);
    if (!acc.length || acc[acc.length - 1].date !== date) acc.push({ date, items: [] });
    acc[acc.length - 1].items.push(tx);
    return acc;
  }, []);

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

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => navigate('/profile')} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
        }}>← Back</button>

        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
          MY WALLET
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Your balance and full transaction history
        </p>

        {/* Balance card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
          borderRadius: 20, padding: '28px 24px', marginBottom: 20,
          boxShadow: '0 8px 32px rgba(240,157,81,0.25)', position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 8, fontWeight: 700, letterSpacing: 1.5, fontFamily: "'Space Mono'" }}>
              CURRENT BALANCE
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 46, color: '#fff', lineHeight: 1, letterSpacing: 2 }}>
              RM {balance.toFixed(2)}
            </div>
          </div>
          <button onClick={() => navigate('/wallet/topup')} style={{
            background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, position: 'relative',
          }}>
            <IoAdd size={16} /> Top Up
          </button>
        </div>

        {/* Transaction history */}
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 2, color: 'var(--muted)', marginBottom: 12 }}>
          TRANSACTION HISTORY
        </div>

        {transactions.length === 0 ? (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
            padding: '48px 24px', textAlign: 'center', color: 'var(--muted)',
          }}>
            <IoReceipt size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
            <div style={{ fontSize: 14 }}>No transactions yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {grouped.map(group => (
              <div key={group.date}>
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1, marginBottom: 8, paddingLeft: 2 }}>
                  {group.date}
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  {group.items.map((tx, i) => {
                    const credit = isCredit(tx);
                    const meta = TYPE_META[tx.type];
                    const { time } = formatDateTime(tx.created_at);
                    return (
                      <div key={tx.id} style={{
                        padding: '14px 18px',
                        borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: credit ? 'rgba(74,222,128,0.1)' : 'rgba(240,101,67,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {credit
                            ? <IoArrowDown size={15} color="#4ade80" />
                            : <IoArrowUp size={15} color="var(--red)" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {meta?.label || tx.type}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, wordBreak: 'break-word' }}>
                            {tx.description || '—'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{time}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontFamily: "'Space Mono'", fontWeight: 700, fontSize: 14,
                            color: credit ? '#4ade80' : 'var(--red)',
                          }}>
                            {credit ? '+' : '−'} RM {Math.abs(tx.amount || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                            Bal RM {(tx.balance_after ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {transactions.length === 200 && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 16 }}>
            Showing your 200 most recent transactions.
          </p>
        )}

      </div>
    </div>
  );
}
