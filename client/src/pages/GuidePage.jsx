import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { RANKS } from '../lib/rankUtils';
import { IoWallet, IoTrophyOutline, IoCheckmark } from 'react-icons/io5';
import { FaRankingStar, FaLocationDot } from 'react-icons/fa6';
import { TbPlayCard7Filled } from 'react-icons/tb';
import { IoSearchCircleOutline } from 'react-icons/io5';
import { GiSoccerBall } from 'react-icons/gi';

const SECTIONS = [
  { id: 'flow',        label: 'How It Works' },
  { id: 'ranks',       label: 'Ranks'        },
  { id: 'leaderboard', label: 'Leaderboard'  },
  { id: 'card',        label: 'Bolahh Card'  },
  { id: 'wallet',      label: 'Wallet'       },
];

const STATS = [
  { key: 'PAC', label: 'Pace',     color: '#60a5fa', desc: 'Speed and acceleration on the pitch' },
  { key: 'SHO', label: 'Shooting', color: '#f87171', desc: 'Shot accuracy and finishing' },
  { key: 'PAS', label: 'Passing',  color: '#4ade80', desc: 'Short and long range passing' },
  { key: 'DRI', label: 'Dribbling',color: '#fbbf24', desc: 'Ball control and dribbling skill' },
  { key: 'DEF', label: 'Defence',  color: '#a78bfa', desc: 'Tackling and defensive positioning' },
  { key: 'PHY', label: 'Physical', color: '#fb923c', desc: 'Strength and stamina' },
];

const RANK_TIER_STYLE = {
  novis:  { bg: 'linear-gradient(145deg,#2a2d30,#3d4144)', border: '#555',    tc: '#e8e9eb', muted: '#888' },
  gangsa: { bg: 'linear-gradient(145deg,#7c4a1a,#cd7f32)', border: '#cd7f32', tc: '#2a1400', muted: '#5a3010' },
  perak:  { bg: 'linear-gradient(145deg,#3a7a96,#aadaef)', border: '#6ec8e8', tc: '#0b1e2b', muted: '#1a3c50' },
  emas:   { bg: 'linear-gradient(145deg,#b8860b,#ffd700)', border: '#ffd700', tc: '#3a2a00', muted: '#6b4e00' },
};

function getTierStyle(name) {
  if (name === 'Novis')          return RANK_TIER_STYLE.novis;
  if (name.startsWith('Gangsa')) return RANK_TIER_STYLE.gangsa;
  if (name.startsWith('Perak'))  return RANK_TIER_STYLE.perak;
  return RANK_TIER_STYLE.emas;
}

function getRankColor(name) {
  if (name === 'Novis')          return '#7088a0';
  if (name.startsWith('Gangsa')) return '#cd7f32';
  if (name.startsWith('Perak'))  return '#6ec8e8';
  return '#FFD700';
}

function rankOvr(r) {
  return `${r.minOvr}–${r.maxOvr}`;
}

function SectionHead({ id, sup, title }) {
  return (
    <div id={id} style={{ marginBottom: 28, scrollMarginTop: 88 }}>
      <div style={{ fontFamily: "'Space Mono'", fontSize: 10, color: 'var(--accent)', letterSpacing: 3, marginBottom: 6 }}>{sup}</div>
      <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 30, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>{title}</h2>
    </div>
  );
}

export default function GuidePage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('flow');

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '48px 0' }} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div className="page-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 16px', fontSize: 13, marginBottom: 32,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}
        >← Back to Games</button>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 44, letterSpacing: 3, color: 'var(--text)', marginBottom: 8 }}>
            BOLAHH GUIDE
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
            Everything you need to know, from booking your first game to building your Bolahh card.
          </p>
        </div>

        {/* Table of contents */}
        <div className="fade-up" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 48 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                background: activeSection === s.id ? 'rgba(240,157,81,0.12)' : 'var(--card)',
                color: activeSection === s.id ? 'var(--accent)' : 'var(--muted)',
                border: `1px solid ${activeSection === s.id ? 'rgba(240,157,81,0.35)' : 'var(--border)'}`,
                borderRadius: 8, padding: '6px 16px', fontSize: 12,
                fontFamily: "'Space Mono'", cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{s.label}</button>
          ))}
        </div>

        {/* ── SECTION 1: HOW IT WORKS ── */}
        <section>
          <SectionHead id="flow" sup="THE PROCESS" title="HOW IT WORKS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                num: '01', icon: <IoSearchCircleOutline size={22} />, title: 'Find a Game',
                desc: 'Browse upcoming futsal sessions from the home screen. Filter by area, format (5v5, 6v6, 7v7) or date to find the right match.',
              },
              {
                num: '02', icon: <IoWallet size={22} />, title: 'Join & Pay via Wallet',
                desc: 'Top up your Bolahh wallet then tap "Join Game". The price is deducted instantly and your slot is confirmed. No repeated payment steps every time.',
              },
              {
                num: '03', icon: <GiSoccerBall size={22} />, title: 'Show Up & Play',
                desc: 'Head to the field at the scheduled time. Play your match. Goals, assists, and good plays all count towards your post-match rating.',
              },
              {
                num: '04', icon: <FaRankingStar size={22} />, title: 'Get Rated & Build Your OVR',
                desc: 'After the match, the organiser rates each player\'s stats. Your OVR updates automatically and determines your rank tier.',
              },
            ].map((step, i) => (
              <div
                key={step.num}
                className={`fade-up-${i + 1}`}
                style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '18px 20px',
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                }}
              >
                <div style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(240,157,81,0.1)', border: '1px solid rgba(240,157,81,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)',
                }}>{step.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--accent)', opacity: 0.7 }}>{step.num}</span>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 1.5, color: 'var(--text)' }}>{step.title}</span>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {divider}

        {/* ── SECTION 2: RANKS ── */}
        <section>
          <SectionHead id="ranks" sup="10 TIERS" title="THE RANK SYSTEM" />
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            Every player starts as <span style={{ color: '#7088a0', fontWeight: 600 }}>Novis</span>. Get rated after games to build your OVR and climb through Gangsa, Perak, and Emas tiers. Each tier has its own card theme.
          </p>

          {/* Tier groups */}
          {[
            { tier: 'Novis',  color: '#7088a0', desc: 'New players. No card customisation yet. Unlock your card by playing your first game.' },
            { tier: 'Gangsa', color: '#cd7f32', desc: 'Bronze tier (31–60 OVR). You\'ve played and your card is unlocked. Build up your stats and start climbing.' },
            { tier: 'Perak',  color: '#6ec8e8', desc: 'Silver tier (61–79 OVR). Consistent performers. Your card reflects real skill at this point.' },
            { tier: 'Emas',   color: '#FFD700', desc: 'Gold tier (80–99 OVR). Top of the ladder. Near-max stats and the coveted gold card theme.' },
          ].map(group => {
            const groupRanks = RANKS.filter(r =>
              group.tier === 'Novis' ? r.name === 'Novis' : r.name.startsWith(group.tier)
            );
            return (
              <div key={group.tier} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, boxShadow: `0 0 8px ${group.color}`, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 1.5, color: group.color }}>{group.tier.toUpperCase()}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{group.desc}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 20 }}>
                  {groupRanks.map(r => {
                    const ts = getTierStyle(r.name);
                    return (
                      <div key={r.name} style={{
                        background: ts.bg, border: `1.5px solid ${ts.border}`,
                        borderRadius: 10, padding: '8px 14px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        minWidth: 80,
                      }}>
                        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 13, letterSpacing: 1, color: ts.tc }}>{r.name}</span>
                        <span style={{ fontFamily: "'Space Mono'", fontSize: 9, color: ts.muted, fontWeight: 700 }}>{rankOvr(r)} OVR</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{
            marginTop: 16, background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 18px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7,
          }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>Note: </span>
            You must have played at least 1 game to move out of Novis.
          </div>
        </section>

        {divider}

        {/* ── SECTION 3: LEADERBOARD ── */}
        <section>
          <SectionHead id="leaderboard" sup="GLOBAL RANKINGS" title="LEADERBOARD" />
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            The leaderboard ranks every Bolahh player by OVR, highest first. Play games, get rated, and watch your position climb.
          </p>

          {/* How ranking works */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              {
                icon: <IoTrophyOutline size={20} />,
                title: 'OVR-Based Ranking',
                desc: 'Players are sorted by their overall rating (OVR). The top 3 earn gold, silver, and bronze medals. Everyone else is shown by position number.',
                color: '#FFD700',
              },
              {
                icon: <FaLocationDot size={18} />,
                title: 'Filter by Area',
                desc: 'Narrow the board to players from your area. Subang, Petaling Jaya, KL, Shah Alam, Cheras, Ampang, and more.',
                color: 'var(--accent)',
              },
              {
                icon: <FaRankingStar size={20} />,
                title: 'Filter by Position',
                desc: 'Compare within your position. Filter by Attacker, Midfielder, Defender, or Goalkeeper to see where you stack up among players who play your role.',
                color: '#a78bfa',
              },
            ].map(item => (
              <div key={item.title} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '16px 20px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{
                  flexShrink: 0, width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: item.color,
                }}>{item.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 1.5, color: 'var(--text)', marginBottom: 4 }}>{item.title}</div>
                  <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          
          {/* How to climb */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 18px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20,
          }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>How to climb: </span>
             Join more games and perform well. Our trusted manager rates your stats after each match. Goals, assists, and good plays push your stats up. Higher stats raise your OVR, which moves you up the board.
          </div>

          <button
            onClick={() => navigate('/leaderboard')}
            style={{
              width: '100%', padding: '13px',
              background: 'var(--card)', color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 12, fontFamily: "'Bebas Neue'", fontSize: 17, letterSpacing: 2,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          ><IoTrophyOutline size={18} /> VIEW LEADERBOARD</button>
        </section>

        {divider}

        {/* ── SECTION 4: BOLAHH CARD ── */}
        <section>
          <SectionHead id="card" sup="YOUR IDENTITY" title="BOLAHH CARD" />
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            Every player has a Bolahh Card, a gamified-style card that reflects your rank and in-game performance across 6 attributes. The card theme upgrades automatically as you climb tiers.
          </p>

          {/* Theme overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { tier: 'Novis',  style: RANK_TIER_STYLE.novis,  note: 'Locked until first game' },
              { tier: 'Gangsa', style: RANK_TIER_STYLE.gangsa, note: 'Bronze theme' },
              { tier: 'Perak',  style: RANK_TIER_STYLE.perak,  note: 'Silver theme' },
              { tier: 'Emas',   style: RANK_TIER_STYLE.emas,   note: 'Gold theme, max tier' },
            ].map(({ tier, style, note }) => (
              <div key={tier} style={{
                background: style.bg, border: `1.5px solid ${style.border}`,
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 1.5, color: style.tc }}>{tier}</span>
                <span style={{ fontSize: 11, color: style.muted, fontFamily: "'DM Sans'" }}>{note}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 2, color: 'var(--text)', marginBottom: 12 }}>THE 6 STATS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {STATS.map(s => (
              <div key={s.key} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{
                  fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700,
                  color: s.color, flexShrink: 0, minWidth: 36,
                }}>{s.key}</span>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 1, color: 'var(--text)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {divider}

        {/* ── SECTION 5: WALLET ── */}
        <section>
          <SectionHead id="wallet" sup="PAYMENTS" title="WALLET" />
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            Bolahh uses an in-app wallet so you never have to enter payment details every time you join a game.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                title: 'Top Up',
                desc: 'Add credit to your wallet from the Wallet page. Available amounts: RM 5, RM 10, RM 20, RM 50, RM 100.',
                color: '#4ade80',
              },
              {
                title: 'Joining a Game',
                desc: 'When you join a game, the entry fee is deducted from your wallet instantly. If your balance is too low, you\'ll be prompted to top up first.',
                color: 'var(--accent)',
              },
              {
                title: 'Cancellations',
                desc: 'If a game is cancelled due to insufficient players before it starts, your entry fee is refunded to your wallet automatically.',
                color: '#60a5fa',
              },
            ].map(item => (
              <div key={item.title} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px 20px',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: item.color,
                  flexShrink: 0, marginTop: 6,
                }} />
                <div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 1.5, color: 'var(--text)', marginBottom: 4 }}>{item.title}</div>
                  <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/wallet/topup')}
            style={{
              marginTop: 20, width: '100%', padding: '13px',
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 12, fontFamily: "'Bebas Neue'", fontSize: 17, letterSpacing: 2,
              cursor: 'pointer',
            }}
          >TOP UP WALLET</button>
        </section>

      </div>
    </div>
  );
}
