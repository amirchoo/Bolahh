import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { IoWallet, IoTrophyOutline, IoCheckmark } from 'react-icons/io5';
import { FaRankingStar, FaLocationDot, FaArrowTrendUp } from 'react-icons/fa6';
import { TbPlayCard7Filled } from 'react-icons/tb';
import { IoSearchCircleOutline } from 'react-icons/io5';
import { GiSoccerBall, GiTrophy } from 'react-icons/gi';

const SECTIONS = [
  { id: 'flow',        label: 'How It Works' },
  { id: 'ranks',       label: 'Ranks'        },
  { id: 'leaderboard', label: 'Leaderboard'  },
  { id: 'ballers',     label: 'Ballers of the Match' },
  { id: 'card',        label: 'Bolahh Card'  },
  { id: 'wallet',      label: 'Wallet'       },
];

const BALLER_STATS = [
  { label: 'Shooting Quality', desc: 'Shot accuracy and technique',      stat: 'SHO', color: '#f87171' },
  { label: 'Passing Quality',  desc: 'Pass accuracy and vision',         stat: 'PAS', color: '#4ade80' },
  { label: 'Good Dribble',     desc: 'Successful dribble past a player', stat: 'DRI', color: '#F09D51' },
  { label: 'Good Defending',   desc: 'Key defensive action',             stat: 'DEF', color: '#a78bfa' },
  { label: 'Good Keeping',     desc: 'Notable save or distribution',     stat: 'PHY', color: '#34d399' },
  { label: 'Good Chance',      desc: 'Created or converted a big chance',stat: 'PAC', color: '#64a0ff' },
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

// Plab-style tiered rank guide, grounded in Bolahh's real OVR bands and 6-stat system.
// Row categories map to the actual tap categories admins rate players on in GameRatingPage
// (Passing Quality, Successful Dribble, Good Defending, Shooting Quality, Good Chance).
// Richer breakdowns unlock at higher tiers, same progressive structure as the reference guide.
const RANK_GROUPS = [
  {
    tier: 'Novis', color: '#7088a0',
    intro: 'Everyone starts here. Play your first game and get rated to reveal where you actually stand.',
    levels: [
      {
        name: 'Novis', badge: '–', ovr: '0–30',
        headline: 'Level not yet revealed.',
        rows: [],
        footnote: 'Every Baller starts at a flat 30 across all 6 stats. Get rated in your first game to unlock your Bolahh Card.',
      },
    ],
  },
  {
    tier: 'Gangsa', color: '#cd7f32',
    intro: "You've started playing and picking up the fundamentals: first touches, first tackles, first real reps.",
    levels: [
      {
        name: 'Gangsa III', badge: 'III', ovr: '31–39',
        headline: 'Just getting comfortable with the ball.',
        rows: [
          { label: 'Passing', desc: 'Gets the ball to a teammate, though not always cleanly.' },
          { label: 'Defending', desc: 'Chases the play but positioning is still a work in progress.' },
        ],
      },
      {
        name: 'Gangsa II', badge: 'II', ovr: '40–49',
        headline: 'Starting to link up play with the team.',
        rows: [
          { label: 'Passing', desc: 'More consistent short passes and first touches.' },
          { label: 'Dribbling', desc: 'Can beat a player one-on-one in space.' },
          { label: 'Defending', desc: 'Better at tracking runs, still learning to hold shape.' },
        ],
      },
      {
        name: 'Gangsa I', badge: 'I', ovr: '50–60',
        headline: 'A dependable bronze-tier Baller.',
        rows: [
          { label: 'Passing', desc: 'Reliable under light pressure, starting to pick out runs.' },
          { label: 'Dribbling', desc: 'Comfortable carrying the ball forward.' },
          { label: 'Defending', desc: 'Positions well and wins the ball back regularly.' },
          { label: 'Finishing', desc: 'Converts clear chances with growing confidence.' },
        ],
      },
    ],
  },
  {
    tier: 'Perak', color: '#6ec8e8',
    intro: 'Consistent, composed, and starting to shape games. Perak players are trusted picks in any lineup.',
    levels: [
      {
        name: 'Perak III', badge: 'III', ovr: '61–69',
        headline: 'Composed on the ball, a level above Gangsa.',
        rows: [
          { label: 'Passing', desc: 'Picks the right pass more often than not, even under pressure.' },
          { label: 'Dribbling', desc: 'Beats defenders with purpose, not just pace.' },
          { label: 'Defending', desc: 'Reads passing lanes and cuts them off.' },
          { label: 'Finishing', desc: 'Clinical in one-on-ones with the keeper.' },
        ],
      },
      {
        name: 'Perak II', badge: 'II', ovr: '70–74',
        headline: 'Sharper decisions, bigger impact on the game.',
        rows: [
          { label: 'Passing', desc: 'Vision to spot the killer pass before it opens up.' },
          { label: 'Attacking Instinct', desc: 'Regularly in the right place to create or finish a chance.' },
          { label: 'Defending', desc: "Anticipates the opponent's next move." },
          { label: 'Finishing', desc: "Efficient, doesn't need many chances to score." },
        ],
      },
      {
        name: 'Perak I', badge: 'I', ovr: '75–79',
        headline: 'One of the most complete players on the pitch.',
        rows: [
          { label: 'Passing', desc: 'Dictates tempo and controls possession.' },
          { label: 'Dribbling', desc: 'Breaks lines under pressure, not just in space.' },
          { label: 'Defending', desc: 'Wins duels and organises the players around them.' },
          { label: 'Attacking Instinct', desc: "A constant threat, knocking on Emas's door." },
        ],
      },
    ],
  },
  {
    tier: 'Emas', color: '#FFD700',
    intro: 'The top of the ladder. Emas players carry games and set the standard everyone else chases.',
    levels: [
      {
        name: 'Emas III', badge: 'III', ovr: '80–85',
        headline: 'Elite floor, every stat is a genuine strength.',
        rows: [
          { label: 'Passing', desc: 'Elite range and accuracy, sets the tempo of the match.' },
          { label: 'Dribbling', desc: 'Unpredictable and hard to dispossess.' },
          { label: 'Defending', desc: "Shuts down the opponent's best player." },
          { label: 'Finishing', desc: 'Ruthless in front of goal.' },
          { label: 'Attacking Instinct', desc: 'Creates danger every time they touch the ball.' },
        ],
      },
      {
        name: 'Emas II', badge: 'II', ovr: '86–94',
        headline: 'Among the best in the Bolahh community.',
        rows: [
          { label: 'Passing', desc: "Vision that unlocks defences most players can't see." },
          { label: 'Dribbling', desc: 'Turns 1v1s into highlight reels.' },
          { label: 'Defending', desc: 'A wall, near-impossible to beat in a duel.' },
          { label: 'Finishing', desc: 'Converts half-chances into goals.' },
          { label: 'Attacking Instinct', desc: 'The player every team wants on their side.' },
        ],
      },
      {
        name: 'Emas I', badge: 'I', ovr: '95–99',
        headline: 'Max tier. The very best of Bolahh.',
        rows: [
          { label: 'Passing', desc: 'Every pass has purpose and precision.' },
          { label: 'Dribbling', desc: 'Beats players at will, in any situation.' },
          { label: 'Defending', desc: 'Dominant physically and positionally.' },
          { label: 'Finishing', desc: 'Clinical from anywhere in the box.' },
          { label: 'Attacking Instinct', desc: 'Game-defining, the standard everyone else chases.' },
        ],
      },
    ],
  },
];

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
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('flow');
  const [activeRankTab, setActiveRankTab] = useState('Novis');

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Support deep links like /guide#ranks (e.g. from the "How does the rank system
  // work?" link on the profile page).
  useEffect(() => {
    const id = location.hash?.slice(1);
    if (id) scrollTo(id);
  }, [location.hash]);

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
                desc: 'Head to the field at the scheduled time. Play your match. Good plays all count towards your post-match rating.',
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

          {/* Tier tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {RANK_GROUPS.map(group => {
              const active = activeRankTab === group.tier;
              return (
                <button
                  key={group.tier}
                  onClick={() => setActiveRankTab(group.tier)}
                  style={{
                    background: active ? `${group.color}22` : 'var(--card)',
                    color: active ? group.color : 'var(--muted)',
                    border: `1.5px solid ${active ? group.color : 'var(--border)'}`,
                    borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 700,
                    fontFamily: "'Bebas Neue'", letterSpacing: 1.5, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{group.tier.toUpperCase()}</button>
              );
            })}
          </div>

          {RANK_GROUPS.filter(g => g.tier === activeRankTab).map(group => (
            <div key={group.tier}>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>{group.intro}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.levels.map(level => {
                  const ts = getTierStyle(level.name);
                  return (
                    <div key={level.name} style={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 14, padding: '18px 20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{
                          flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                          background: ts.bg, border: `1.5px solid ${ts.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Bebas Neue'", fontSize: 13, color: ts.tc,
                        }}>{level.badge}</span>
                        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 1.5, color: 'var(--text)' }}>{level.name}</span>
                        <span style={{
                          marginLeft: 'auto', fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700,
                          color: group.color, background: `${group.color}18`, border: `1px solid ${group.color}40`,
                          borderRadius: 6, padding: '3px 8px',
                        }}>{level.ovr} OVR</span>
                      </div>

                      <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', margin: '0 0 10px' }}>{level.headline}</p>

                      {level.rows.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {level.rows.map(row => (
                            <div key={row.label} style={{ fontSize: 12, lineHeight: 1.6 }}>
                              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{row.label}</span>
                              <span style={{ color: 'var(--muted)' }}>: {row.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {level.footnote && (
                        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 0' }}>{level.footnote}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 20, background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 18px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7,
          }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>How OVR is calculated: </span>
            Your OVR is the average of your 6 Bolahh Card stats (PAC, SHO, PAS, DRI, DEF, PHY). Every rated game nudges those stats up or down, which automatically moves your OVR and your tier. PHY specifically tracks goalkeeping contributions, so it matters most if you play in goal.
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
                desc: 'Narrow the board to players from your area. Kuala Lumpur, Petaling Jaya, Subang, Shah Alam, and Ansan.',
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
             Join more games and perform well. Our trusted manager rates your stats after each match. Good plays push your stats up. Higher stats raise your OVR, which moves you up the board.
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

        {/* ── SECTION 4: BALLERS OF THE MATCH ── */}
        <section>
          <SectionHead id="ballers" sup="TOP 3 EACH GAME" title="BALLERS OF THE MATCH" />
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            After every rated match, the 3 players with the most impact are crowned Ballers of the Match, gold, silver, and bronze.
          </p>

          {/* How it works */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                flexShrink: 0, width: 38, height: 38, borderRadius: 10,
                background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700',
              }}><GiTrophy size={20} /></div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 1.5, color: 'var(--text)', marginBottom: 4 }}>How It Works</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  The manager rates each player after the game. Every stat earned adds points, and the 3 highest totals are crowned Ballers of the Match. The manager can also manually pick the top 3, which overrides the point calculation.
                </p>
              </div>
            </div>
          </div>

          {/* Stat points grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
            {BALLER_STATS.map(({ label, desc, stat, color }) => (
              <div key={stat} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{
                  fontFamily: "'Space Mono'", fontSize: 12, fontWeight: 700,
                  color, flexShrink: 0, minWidth: 30,
                  background: `${color}15`, border: `1px solid ${color}40`,
                  borderRadius: 6, padding: '2px 6px', textAlign: 'center',
                }}>{stat}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trend arrow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
              <FaArrowTrendUp size={22} color="#4ade80" style={{ flexShrink: 0 }} />
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                A green arrow next to a player's name means they earned at least one stat that game, their card is trending up.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/baller-info')}
            style={{
              width: '100%', padding: '13px',
              background: 'var(--card)', color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 12, fontFamily: "'Bebas Neue'", fontSize: 17, letterSpacing: 2,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          ><GiTrophy size={18} /> FULL BALLER BREAKDOWN</button>
        </section>

        {divider}

        {/* ── SECTION 5: BOLAHH CARD ── */}
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

        {/* ── SECTION 6: WALLET ── */}
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
