import { useState, useEffect, useRef } from 'react';
import { FaUserFriends } from 'react-icons/fa';
import { IoMdFootball } from 'react-icons/io';
import { TbPlayCard7Filled } from 'react-icons/tb';
import { useNavigate } from 'react-router-dom';
import { IoStatsChart, IoWallet } from "react-icons/io5";
import { FaRankingStar } from "react-icons/fa6";
import { FaClipboardList } from "react-icons/fa";
import { IoSearchCircleOutline } from "react-icons/io5";
import { GiUpgrade } from "react-icons/gi";
import { MdOutlineAutoMode } from "react-icons/md";
import { LiaUserFriendsSolid } from "react-icons/lia";

const RANKS = [
  { name: 'Novis',     color: '#888880', bg: 'linear-gradient(145deg,#2a2d30,#3d4144)', border: '#555',    pts: '< 30'   },
  { name: 'Gangsa III',color: '#cd7f32', bg: 'linear-gradient(145deg,#7c4a1a,#cd7f32)', border: '#cd7f32', pts: '30–89'  },
  { name: 'Gangsa II', color: '#cd7f32', bg: 'linear-gradient(145deg,#7c4a1a,#cd7f32)', border: '#cd7f32', pts: '90–149' },
  { name: 'Gangsa I',  color: '#cd7f32', bg: 'linear-gradient(145deg,#7c4a1a,#cd7f32)', border: '#cd7f32', pts: '150–209'},
  { name: 'Perak V',   color: '#c0c0c0', bg: 'linear-gradient(145deg,#6e7275,#c0c0c0)', border: '#c0c0c0', pts: '210–269'},
  { name: 'Perak IV',  color: '#c0c0c0', bg: 'linear-gradient(145deg,#6e7275,#c0c0c0)', border: '#c0c0c0', pts: '270–329'},
  { name: 'Perak III', color: '#c0c0c0', bg: 'linear-gradient(145deg,#6e7275,#c0c0c0)', border: '#c0c0c0', pts: '330–389'},
  { name: 'Perak II',  color: '#c0c0c0', bg: 'linear-gradient(145deg,#6e7275,#c0c0c0)', border: '#c0c0c0', pts: '390–449'},
  { name: 'Perak I',   color: '#c0c0c0', bg: 'linear-gradient(145deg,#6e7275,#c0c0c0)', border: '#c0c0c0', pts: '450–509'},
  { name: 'Emas III',  color: '#FFD700', bg: 'linear-gradient(145deg,#b8860b,#ffd700)', border: '#ffd700', pts: '510–539'},
  { name: 'Emas II',   color: '#FFD700', bg: 'linear-gradient(145deg,#b8860b,#ffd700)', border: '#ffd700', pts: '540–569'},
  { name: 'Emas I',    color: '#FFD700', bg: 'linear-gradient(145deg,#b8860b,#ffd700)', border: '#ffd700', pts: '570–594'},
];

const STEPS = [
  { num: '01', icon: <IoSearchCircleOutline />, title: 'Find a Game', desc: 'Browse upcoming futsal sessions near you. Filter by area, format, and price.' },
  { num: '02', icon: <IoWallet/>, title: 'Top Up & Join', desc: 'Add funds to your Bolahh wallet and book your slot in one tap. No payment hassle every time.' },
  { num: '03', icon: <FaRankingStar />, title: 'Play & Get Rated', desc: 'After the match, the organiser rates your performance. Earn points, climb the ranks.' },
];

const FEATURES = [
  { icon: <IoMdFootball/>,      title: 'Smart Booking',    desc: 'Browse, filter and join games in seconds. Real-time slot tracking.' },
  { icon: <IoWallet/>,          title: 'Bolahh Wallet',    desc: 'Top up once, play anytime. Instant refunds to your wallet if a game is cancelled.' },
  { icon: <FaRankingStar />,    title: '12-Tier Rank',     desc: 'From Novis to Emas I — your rank reflects your real performance on the pitch.' },
  { icon: <TbPlayCard7Filled/>, title: 'Bolahh Card',      desc: 'Customise your PAC, SHO, PAS, DRI, DEF, PHY stats within your point budget.' },
  { icon: <FaUserFriends/>,     title: 'Friends System',   desc: 'Add friends, view their cards, track their rank progress.' },
  { icon: <FaClipboardList/>,   title: 'Manager Tools',    desc: 'Organisers get a full dashboard to manage venues, games and post-match ratings.' },
];

// Inline demo card (no external imports needed)
function DemoCard({ floatOffset }) {
  const stats = { pac: 88, sho: 82, pas: 79, dri: 91, def: 74, phy: 85 };
  const overall = Math.round(Object.values(stats).reduce((a,b)=>a+b,0)/6);
  return (
    <div style={{
      width: 220, height: 330, borderRadius: 16, flexShrink: 0,
      background: 'linear-gradient(145deg,#b8860b,#ffd700,#b8860b)',
      border: '2px solid #ffd700',
      boxShadow: '0 32px 80px rgba(255,215,0,0.25), 0 8px 32px rgba(0,0,0,0.6)',
      position: 'relative', overflow: 'hidden',
      transform: `translateY(${floatOffset}px) rotate(-4deg)`,
      transition: 'transform 0.1s linear',
    }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 50%)', pointerEvents:'none', zIndex:2 }} />
      <div style={{ position:'absolute', top:12, left:14, zIndex:3 }}>
        <div style={{ fontFamily:"'Bebas Neue'", fontSize:44, color:'#3a2a00', lineHeight:1, letterSpacing:1 }}>{overall}</div>
        <div style={{ fontFamily:"'Space Mono'", fontSize:11, color:'#3a2a00', fontWeight:700, letterSpacing:1, marginTop:2 }}>MF</div>
      </div>
      <div style={{ position:'absolute', top:12, right:12, zIndex:3, fontFamily:"'Bebas Neue'", fontSize:10, color:'#6b4e00', letterSpacing:1 }}>EMAS I</div>
      <div style={{
        position:'absolute', top:44, left:'50%', transform:'translateX(-50%)',
        width:108, height:108, borderRadius:'50%', overflow:'hidden',
        border:'3px solid #ffd700', background:'rgba(0,0,0,0.2)', zIndex:3,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <span style={{ fontFamily:"'Space Mono'", fontSize:28, fontWeight:700, color:'#3a2a00' }}>CH</span>
      </div>
      <div style={{ position:'absolute', top:160, left:0, right:0, textAlign:'center', zIndex:3, fontFamily:"'Bebas Neue'", fontSize:17, color:'#3a2a00', letterSpacing:1.5 }}>CHONALDO7</div>
      <div style={{ position:'absolute', top:182, left:16, right:16, height:1, background:'rgba(255,215,0,0.4)', zIndex:3 }} />
      <div style={{ position:'absolute', top:190, left:10, right:10, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, zIndex:3 }}>
        {[['pac',88],['sho',82],['pas',79],['dri',91],['def',74],['phy',85]].map(([k,v]) => (
          <div key={k} style={{ background:'rgba(0,0,0,0.2)', borderRadius:5, padding:'4px', textAlign:'center' }}>
            <div style={{ fontFamily:"'Space Mono'", fontSize:14, fontWeight:700, color:'#3a2a00', lineHeight:1 }}>{v}</div>
            <div style={{ fontFamily:"'Space Mono'", fontSize:8, color:'#6b4e00', letterSpacing:0.5, marginTop:1 }}>{k.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <div style={{ position:'absolute', bottom:8, left:10, right:10, display:'flex', justifyContent:'space-between', zIndex:3, borderTop:'1px solid rgba(255,215,0,0.4)', paddingTop:5 }}>
        <div style={{ fontFamily:"'Space Mono'", fontSize:8, color:'#6b4e00' }}><span style={{ fontWeight:700, color:'#3a2a00' }}>12</span> GAMES PLAYED</div>
        <div style={{ fontFamily:"'Space Mono'", fontSize:8, color:'#6b4e00' }}><span style={{ fontWeight:700, color:'#3a2a00' }}>580</span> POINTS</div>
      </div>
    </div>
  );
}

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [floatOffset, setFloatOffset] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [activeRank, setActiveRank] = useState(null);

  // Floating card animation
  useEffect(() => {
    let frame;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const t = (ts - start) / 1000;
      setFloatOffset(Math.sin(t * 0.8) * 12);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Scroll tracking for parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [heroRef, heroVisible] = useScrollReveal();
  const [stepsRef, stepsVisible] = useScrollReveal();
  const [rankRef, rankVisible] = useScrollReveal();
  const [cardRef, cardVisible] = useScrollReveal();
  const [featRef, featVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  return (
    <div style={{ minHeight: '100vh', background: '#0e0f10', color: '#e8e9eb', overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .hex-bg {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V18L28 2l28 16v32z' fill='none' stroke='rgba(240,157,81,0.06)' stroke-width='1'/%3E%3Cpath d='M28 100L0 84V52l28-16 28 16v32z' fill='none' stroke='rgba(240,157,81,0.06)' stroke-width='1'/%3E%3C/svg%3E");
        }

        .reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        .reveal-delay-5 { transition-delay: 0.5s; }

        .rank-pill {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .rank-pill:hover { transform: translateY(-4px) scale(1.05); }

        .feat-card {
          transition: border-color 0.2s, transform 0.2s;
        }
        .feat-card:hover { border-color: rgba(240,157,81,0.4) !important; transform: translateY(-3px); }

        .cta-btn {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .cta-btn:hover { opacity: 0.88; transform: translateY(-2px); }

        .nav-link {
          color: rgba(232,233,235,0.6);
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
        }
        .nav-link:hover { color: #F09D51; }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #F09D51, #ffd700, #F06543, #F09D51);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; text-align: center !important; align-items: center !important; }
          .hero-title { font-size: 72px !important; }
          .steps-grid { flex-direction: column !important; }
          .feat-grid { grid-template-columns: 1fr 1fr !important; }
          .nav-links { display: none !important; }
          .hero-badge { justify-content: center !important; }
          .hero-desc { max-width: 100% !important; }
          .hero-stats { justify-content: center !important; }
          .hero-btns { justify-content: center !important; width: 100% !important; }
          .hero-btns button { flex: 1 !important; min-width: 140px !important; max-width: 200px !important; }
        }
        @media (max-width: 480px) {
          .hero-title { font-size: 58px !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .hero-btns { flex-direction: row !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 40 ? 'rgba(14,15,16,0.92)' : 'transparent',
        backdropFilter: scrollY > 40 ? 'blur(12px)' : 'none',
        borderBottom: scrollY > 40 ? '1px solid rgba(240,157,81,0.1)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 3, color: '#F09D51' }}>BOLAHH</div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span className="nav-link" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</span>
          <span className="nav-link" onClick={() => document.getElementById('ranks')?.scrollIntoView({ behavior: 'smooth' })}>Ranks</span>
          <span className="nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="cta-btn" onClick={() => navigate('/login')} style={{
            background: 'transparent', color: '#F09D51', border: '1.5px solid #F09D51',
            borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600,
            fontFamily: "'DM Sans'"
          }}>Log In</button>
          <button className="cta-btn" onClick={() => navigate('/signup')} style={{
            background: '#F09D51', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700,
            fontFamily: "'DM Sans'"
          }}>Sign Up</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hex-bg" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '100px 32px 60px',
        position: 'relative', overflow: 'hidden',
        background: '#0e0f10',
      }}>
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url('/images/hero-bg.jpg')`, backgroundSize:'cover', backgroundPosition:'center', opacity: heroVisible ? 0.4 : 0, transition:'opacity 1.4s ease', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'rgba(0,0,0,0.5)', pointerEvents:'none' }} />
        {/* Background glow */}
        <div style={{ position:'absolute', top:'20%', left:'10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(240,157,81,0.08) 0%, transparent 70%)', pointerEvents:'none', zIndex:1 }} />
        <div style={{ position:'absolute', bottom:'10%', right:'5%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(240,101,67,0.06) 0%, transparent 70%)', pointerEvents:'none', zIndex:1 }} />

        <div ref={heroRef} className="hero-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64, width: '100%', position:'relative', zIndex:2 }}>

          {/* Left — text */}
          <div style={{ flex: 1 }}>
            <div className={`reveal ${heroVisible ? 'visible' : ''} hero-badge`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(240,157,81,0.1)', border: '1px solid rgba(240,157,81,0.25)',
              borderRadius: 20, padding: '5px 14px', marginBottom: 24,
              fontSize: 12, fontFamily: "'Space Mono'", color: '#F09D51', fontWeight: 700, letterSpacing: 1
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#F09D51', display:'inline-block', position:'relative' }}>
                <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#F09D51', animation:'pulse-ring 1.5s ease-out infinite' }} />
              </span>
              MALAYSIA'S FIRST FOOTBALL PLATFORM
            </div>

            <h1 className={`reveal ${heroVisible ? 'visible' : ''} reveal-delay-1 hero-title`} style={{
              fontFamily: "'Bebas Neue'", fontSize: 88, lineHeight: 0.9,
              letterSpacing: 3, marginBottom: 24, color: '#e8e9eb'
            }}>
              ANYWHERE.<br />
              <span className="shimmer-text">ANYONE.</span><br />
              ANYTIME.
            </h1>

            <p className={`reveal ${heroVisible ? 'visible' : ''} reveal-delay-2 hero-desc`} style={{
              fontSize: 17, color: 'rgba(232,233,235,0.6)', lineHeight: 1.7,
              maxWidth: 440, marginBottom: 36, fontFamily: "'DM Sans'"
            }}>
              Book futsal games, build your Bolahh card, and compete! from Novis all the way to Emas I.
            </p>

            <div className={`reveal ${heroVisible ? 'visible' : ''} reveal-delay-3 hero-btns`} style={{ display: 'flex', gap: 12 }}>
              <button className="cta-btn" onClick={() => navigate('/signup')} style={{
                background: 'linear-gradient(135deg, #F09D51, #F06543)',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '14px 0', fontSize: 15, fontWeight: 700,
                fontFamily: "'Bebas Neue'", letterSpacing: 2,
                boxShadow: '0 8px 32px rgba(240,157,81,0.3)',
                flex: 1, minWidth: 160,
              }}>GET STARTED FREE</button>
              <button className="cta-btn" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} style={{
                background: 'transparent', color: '#e8e9eb',
                border: '1px solid rgba(232,233,235,0.2)', borderRadius: 12,
                padding: '14px 0', fontSize: 14, fontWeight: 600,
                fontFamily: "'DM Sans'",
                flex: 1, minWidth: 160,
              }}>How It Works ↓</button>
            </div>

            <div className={`reveal ${heroVisible ? 'visible' : ''} reveal-delay-4 hero-stats`} style={{ display: 'flex', gap: 32, marginTop: 40 }}>
              {[['20+', 'Courts/Field'], ['100+', 'Active Players'], ['3', 'Game Formats']].map(([num, label]) => (
                <div key={label}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: '#F09D51', lineHeight: 1, letterSpacing: 1 }}>{num}</div>
                  <div style={{ fontSize: 12, color: 'rgba(232,233,235,0.5)', fontFamily: "'DM Sans'" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating card */}
          <div className={`reveal ${heroVisible ? 'visible' : ''} reveal-delay-2`} style={{ flexShrink: 0, position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -40,
              background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)',
              pointerEvents: 'none', borderRadius: '50%'
            }} />
            <DemoCard floatOffset={floatOffset} />
            {/* Floating badges */}
            <div style={{
              position:'absolute', top: -10, right: -30,
              background:'rgba(14,15,16,0.9)', border:'1px solid rgba(255,215,0,0.3)',
              borderRadius:12, padding:'8px 14px', fontSize:12,
              fontFamily:"'Space Mono'", color:'#ffd700', fontWeight:700,
              transform:`translateY(${floatOffset * 0.3}px)`
            }}>EMAS I</div>
            <div style={{
              position:'absolute', bottom: 20, left: -40,
              background:'rgba(14,15,16,0.9)', border:'1px solid rgba(240,157,81,0.3)',
              borderRadius:12, padding:'8px 14px', fontSize:12,
              fontFamily:"'Space Mono'", color:'#F09D51', fontWeight:700,
              transform:`translateY(${floatOffset * -0.5}px)`
            }}>580 PTS</div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '100px 32px', background: '#0e0f10', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url('/images/howitworks-bg.jpg')`, backgroundSize:'cover', backgroundPosition:'center', opacity: stepsVisible ? 0.4 : 0, transition:'opacity 1.4s ease', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'rgba(0,0,0,0.55)', pointerEvents:'none' }} />
        <div ref={stepsRef} style={{ maxWidth: 1000, margin: '0 auto', position:'relative', zIndex:2 }}>
          <div className={`reveal ${stepsVisible ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontFamily:"'Space Mono'", fontSize:11, color:'#F09D51', letterSpacing:3, marginBottom:12 }}>THE PROCESS</div>
            <h2 style={{ fontFamily:"'Bebas Neue'", fontSize:52, letterSpacing:3, color:'#e8e9eb' }}>HOW IT WORKS</h2>
          </div>

          <div className="steps-grid" style={{ display:'flex', gap:24, alignItems:'stretch' }}>
            {STEPS.map((step, i) => (
              <div key={i} className={`reveal ${stepsVisible ? 'visible' : ''} reveal-delay-${i+1}`} style={{ flex:1 }}>
                <div style={{
                  background:'linear-gradient(145deg, #161718, #1e1f21)',
                  border:'1px solid rgba(240,157,81,0.15)',
                  borderRadius:20, padding:32, height:'100%',
                  position:'relative', overflow:'hidden'
                }}>
                  {/* Step number watermark */}
                  <div style={{
                    position:'absolute', top:-10, right:16,
                    fontFamily:"'Bebas Neue'", fontSize:80, color:'rgba(240,157,81,0.06)',
                    letterSpacing:2, lineHeight:1, userSelect:'none'
                  }}>{step.num}</div>
                  <div style={{ fontSize:36, marginBottom:16 }}>{step.icon}</div>
                  <div style={{ fontFamily:"'Bebas Neue'", fontSize:22, letterSpacing:2, color:'#e8e9eb', marginBottom:10 }}>{step.title}</div>
                  <div style={{ fontSize:14, color:'rgba(232,233,235,0.55)', lineHeight:1.7, fontFamily:"'DM Sans'" }}>{step.desc}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      position:'absolute', right:-12, top:'50%', transform:'translateY(-50%)',
                      fontSize:20, color:'rgba(240,157,81,0.3)', zIndex:2,
                      display:'none' // hidden on mobile, shown via desktop layout
                    }}>→</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RANK SYSTEM ── */}
      <section id="ranks" style={{ padding: '100px 32px', background: '#0e0f10', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url('/images/rank-bg.jpg')`, backgroundSize:'cover', backgroundPosition:'center', opacity: rankVisible ? 0.4 : 0, transition:'opacity 1.4s ease', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'rgba(0,0,0,0.55)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,215,0,0.04) 0%, transparent 70%)', pointerEvents:'none', zIndex:1 }} />

        <div ref={rankRef} style={{ maxWidth: 1000, margin: '0 auto', position:'relative', zIndex:2 }}>
          <div className={`reveal ${rankVisible ? 'visible' : ''}`} style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ fontFamily:"'Space Mono'", fontSize:11, color:'#F09D51', letterSpacing:3, marginBottom:12 }}>PROGRESSION</div>
            <h2 style={{ fontFamily:"'Bebas Neue'", fontSize:52, letterSpacing:3, color:'#e8e9eb', marginBottom:12 }}>THE RANK SYSTEM</h2>
            <p style={{ fontSize:15, color:'rgba(232,233,235,0.5)', fontFamily:"'DM Sans'", maxWidth:480, margin:'0 auto' }}>
              Every goal, assist and good play earns you points. Accumulate enough to climb through all 12 tiers.
            </p>
          </div>

          <div className={`reveal ${rankVisible ? 'visible' : ''} reveal-delay-1`} style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', marginBottom:40 }}>
            {RANKS.map((rank, i) => (
              <div
                key={rank.name}
                className="rank-pill"
                onClick={() => setActiveRank(activeRank === i ? null : i)}
                style={{
                  background: activeRank === i ? rank.bg : 'rgba(30,31,33,0.8)',
                  border: `1.5px solid ${activeRank === i ? rank.border : 'rgba(232,233,235,0.1)'}`,
                  borderRadius: 12, padding: '10px 18px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  minWidth: 90,
                  boxShadow: activeRank === i ? `0 8px 24px ${rank.border}44` : 'none',
                  opacity: rankVisible ? 1 : 0,
                  transform: rankVisible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s, background 0.2s, border-color 0.2s, box-shadow 0.2s`,
                }}
              >
                <div style={{ width:10, height:10, borderRadius:'50%', background:rank.color, boxShadow:`0 0 8px ${rank.color}` }} />
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:13, letterSpacing:1, color: activeRank === i ? (rank.name.startsWith('Emas') ? '#3a2a00' : '#e8e9eb') : rank.color }}>{rank.name}</div>
                <div style={{ fontFamily:"'Space Mono'", fontSize:9, color: activeRank === i ? 'rgba(0,0,0,0.5)' : 'rgba(232,233,235,0.35)', fontWeight:700 }}>{rank.pts}</div>
              </div>
            ))}
          </div>

          {/* Rank card showcase */}
          <div className={`reveal ${rankVisible ? 'visible' : ''} reveal-delay-2`}>
            <div style={{ fontFamily:"'Space Mono'", fontSize:11, color:'rgba(232,233,235,0.35)', letterSpacing:3, marginBottom:20, textAlign:'center' }}>EVERY RANK HAS ITS OWN CARD</div>
            <div style={{
              display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16,
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(240,157,81,0.3) transparent',
              WebkitOverflowScrolling: 'touch',
            }}>
              {RANKS.map((rank, i) => {
                const isEmas = rank.name.startsWith('Emas');
                const isGangsa = rank.name.startsWith('Gangsa');
                const isPerak = rank.name.startsWith('Perak');
                const isNovis = rank.name === 'Novis';
                const textDark = isEmas;
                const tc = textDark ? '#3a2a00' : '#e8e9eb';
                const tcMuted = textDark ? 'rgba(58,42,0,0.55)' : 'rgba(232,233,235,0.45)';
                // Sample stats per tier — higher rank = higher stats
                const base = 20 + i * 4;
                const sampleStats = [
                  Math.min(99, base + 12), Math.min(99, base + 8),
                  Math.min(99, base + 6), Math.min(99, base + 14),
                  Math.min(99, base + 4), Math.min(99, base + 10),
                ];
                const ovr = Math.round(sampleStats.reduce((a,b)=>a+b,0)/6);
                return (
                  <div key={rank.name} style={{
                    flexShrink: 0, width: 140, height: 210, borderRadius: 12,
                    background: rank.bg, border: `1.5px solid ${rank.border}`,
                    position: 'relative', overflow: 'hidden',
                    boxShadow: `0 12px 40px ${rank.border}33`,
                    opacity: rankVisible ? 1 : 0,
                    transform: rankVisible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                    transition: `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`,
                    cursor: 'default',
                  }}>
                    {/* Shine overlay */}
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 55%)', pointerEvents:'none', zIndex:2 }} />
                    {/* OVR + pos */}
                    <div style={{ position:'absolute', top:8, left:10, zIndex:3 }}>
                      <div style={{ fontFamily:"'Bebas Neue'", fontSize:30, color:tc, lineHeight:1, letterSpacing:1 }}>{ovr}</div>
                      <div style={{ fontFamily:"'Space Mono'", fontSize:7, color:tc, fontWeight:700, letterSpacing:0.5, marginTop:1 }}>MF</div>
                    </div>
                    {/* Rank name top right */}
                    <div style={{ position:'absolute', top:8, right:8, zIndex:3, fontFamily:"'Bebas Neue'", fontSize:7, color:tcMuted, letterSpacing:1, textAlign:'right', lineHeight:1.3 }}>
                      {rank.name.split(' ').map((w,j) => <div key={j}>{w}</div>)}
                    </div>
                    {/* Avatar circle */}
                    <div style={{
                      position:'absolute', top:28, left:'50%', transform:'translateX(-50%)',
                      width:56, height:56, borderRadius:'50%',
                      border:`2px solid ${rank.border}`, background:'rgba(0,0,0,0.2)',
                      zIndex:3, display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                      <span style={{ fontFamily:"'Space Mono'", fontSize:14, fontWeight:700, color:tc }}>?</span>
                    </div>
                    {/* Name */}
                    <div style={{ position:'absolute', top:91, left:0, right:0, textAlign:'center', zIndex:3, fontFamily:"'Bebas Neue'", fontSize:10, color:tc, letterSpacing:1.5 }}>PLAYER</div>
                    {/* Divider */}
                    <div style={{ position:'absolute', top:102, left:10, right:10, height:1, background:`${rank.border}55`, zIndex:3 }} />
                    {/* Stats grid */}
                    <div style={{ position:'absolute', top:108, left:6, right:6, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2, zIndex:3 }}>
                      {[['PAC',sampleStats[0]],['SHO',sampleStats[1]],['PAS',sampleStats[2]],['DRI',sampleStats[3]],['DEF',sampleStats[4]],['PHY',sampleStats[5]]].map(([k,v]) => (
                        <div key={k} style={{ background:'rgba(0,0,0,0.18)', borderRadius:3, padding:'3px 2px', textAlign:'center' }}>
                          <div style={{ fontFamily:"'Space Mono'", fontSize:9, fontWeight:700, color:tc, lineHeight:1 }}>{v}</div>
                          <div style={{ fontFamily:"'Space Mono'", fontSize:6, color:tcMuted, letterSpacing:0.3, marginTop:1 }}>{k}</div>
                        </div>
                      ))}
                    </div>
                    {/* Bottom pts */}
                    <div style={{ position:'absolute', bottom:6, left:8, right:8, borderTop:`1px solid ${rank.border}44`, paddingTop:4, zIndex:3, display:'flex', justifyContent:'center' }}>
                      <span style={{ fontFamily:"'Space Mono'", fontSize:7, color:tcMuted, fontWeight:700 }}>{rank.pts} PTS</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign:'center', marginTop:12, fontSize:11, color:'rgba(232,233,235,0.25)', fontFamily:"'DM Sans'" }}>← scroll to see all 12 ranks →</div>
          </div>
        </div>
      </section>

      {/* ── FIFA CARD ── */}
      <section style={{ padding: '100px 32px', background: '#0e0f10', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url('/images/card-bg.jpg')`, backgroundSize:'cover', backgroundPosition:'center', opacity: cardVisible ? 0.4 : 0, transition:'opacity 1.4s ease', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'rgba(0,0,0,0.5)', pointerEvents:'none' }} />
        <div ref={cardRef} style={{ maxWidth: 1000, margin: '0 auto', display:'flex', gap:64, alignItems:'center', flexWrap:'wrap', position:'relative', zIndex:2 }}>

          {/* Left — card */}
          <div className={`reveal ${cardVisible ? 'visible' : ''}`} style={{ flexShrink:0, position:'relative', margin:'0 auto' }}>
            <div style={{ position:'absolute', inset:-60, background:'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)', pointerEvents:'none', borderRadius:'50%' }} />
            <DemoCard floatOffset={floatOffset * 0.5} />
          </div>

          {/* Right — info */}
          <div style={{ flex:1, minWidth:260 }}>
            <div className={`reveal ${cardVisible ? 'visible' : ''}`} style={{ fontFamily:"'Space Mono'", fontSize:11, color:'#F09D51', letterSpacing:3, marginBottom:12 }}>YOUR IDENTITY</div>
            <h2 className={`reveal ${cardVisible ? 'visible' : ''} reveal-delay-1`} style={{ fontFamily:"'Bebas Neue'", fontSize:48, letterSpacing:3, color:'#e8e9eb', lineHeight:1, marginBottom:20 }}>
              YOUR Bolahh<br />PLAYER CARD
            </h2>
            <p className={`reveal ${cardVisible ? 'visible' : ''} reveal-delay-2`} style={{ fontSize:15, color:'rgba(232,233,235,0.55)', lineHeight:1.8, fontFamily:"'DM Sans'", marginBottom:24 }}>
              Every player gets a card that reflects their rank tier. Distribute your earned points across PAC, SHO, PAS, DRI, DEF and PHY — your call how you build your identity on the pitch.
            </p>
            <div className={`reveal ${cardVisible ? 'visible' : ''} reveal-delay-3`} style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                [<GiUpgrade />,'Card theme upgrades with your rank from Novis to Emas'],
                [<IoStatsChart />,'Distribute points exactly how you want across 6 stats'],
                [<MdOutlineAutoMode />,'Auto-adjusts if you lose points after a bad game'],
                [<LiaUserFriendsSolid />,'Friends can view your card on your profile'],
              ].map(([icon,text]) => (
                <div key={text} style={{ display:'flex', alignItems:'flex-start', gap:12, fontSize:13, color:'rgba(232,233,235,0.6)', fontFamily:"'DM Sans'" }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '100px 32px', background: '#0e0f10', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url('/images/features-bg.jpg')`, backgroundSize:'cover', backgroundPosition:'center', opacity: featVisible ? 0.4 : 0, transition:'opacity 1.4s ease', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'rgba(0,0,0,0.55)', pointerEvents:'none' }} />
        <div ref={featRef} style={{ maxWidth: 1000, margin: '0 auto', position:'relative', zIndex:2 }}>
          <div className={`reveal ${featVisible ? 'visible' : ''}`} style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ fontFamily:"'Space Mono'", fontSize:11, color:'#F09D51', letterSpacing:3, marginBottom:12 }}>EVERYTHING YOU NEED</div>
            <h2 style={{ fontFamily:"'Bebas Neue'", fontSize:52, letterSpacing:3, color:'#e8e9eb' }}>FEATURES</h2>
          </div>

          <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feat-card reveal ${featVisible ? 'visible' : ''} reveal-delay-${(i%3)+1}`} style={{
                background:'linear-gradient(145deg,#161718,#1e1f21)',
                border:'1px solid rgba(232,233,235,0.08)',
                borderRadius:16, padding:24,
              }}>
                <div style={{ fontSize:32, marginBottom:14 }}>{f.icon}</div>
                <div style={{ fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:2, color:'#e8e9eb', marginBottom:8 }}>{f.title}</div>
                <div style={{ fontSize:13, color:'rgba(232,233,235,0.5)', lineHeight:1.7, fontFamily:"'DM Sans'" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '100px 32px', background: '#0e0f10', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0, backgroundImage:`url('/images/readytoplay-bg.jpg')`, backgroundSize:'cover', backgroundPosition:'center', opacity: ctaVisible ? 0.4 : 0, transition:'opacity 1.4s ease', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'rgba(0,0,0,0.5)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:400, background:'radial-gradient(ellipse, rgba(240,157,81,0.07) 0%, transparent 70%)', pointerEvents:'none', zIndex:1 }} />
        <div ref={ctaRef} className={`reveal ${ctaVisible ? 'visible' : ''}`} style={{ maxWidth:600, margin:'0 auto', textAlign:'center', position:'relative', zIndex:2 }}>
          <div style={{ fontFamily:"'Space Mono'", fontSize:11, color:'#F09D51', letterSpacing:3, marginBottom:16 }}>READY TO PLAY?</div>
          <h2 style={{ fontFamily:"'Bebas Neue'", fontSize:64, letterSpacing:3, color:'#e8e9eb', lineHeight:0.95, marginBottom:20 }}>
            START YOUR<br /><span className="shimmer-text">JOURNEY</span><br />TODAY
          </h2>
          <p style={{ fontSize:15, color:'rgba(232,233,235,0.5)', lineHeight:1.7, fontFamily:"'DM Sans'", marginBottom:36 }}>
            Join Malaysia's futsal community. Book your first game, earn your first points, and start climbing the ranks.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="cta-btn" onClick={() => navigate('/signup')} style={{
              background:'linear-gradient(135deg,#F09D51,#F06543)',
              color:'#fff', border:'none', borderRadius:12,
              padding:'16px 40px', fontSize:16, fontWeight:700,
              fontFamily:"'Bebas Neue'", letterSpacing:2,
              boxShadow:'0 8px 40px rgba(240,157,81,0.3)'
            }}>CREATE ACCOUNT</button>
            <button className="cta-btn" onClick={() => navigate('/login')} style={{
              background:'transparent', color:'#e8e9eb',
              border:'1px solid rgba(232,233,235,0.2)', borderRadius:12,
              padding:'16px 32px', fontSize:16, fontWeight:600,
              fontFamily:"'DM Sans'"
            }}>Log In</button>
          </div>
          <p style={{ marginTop:20, fontSize:12, color:'rgba(232,233,235,0.3)', fontFamily:"'DM Sans'" }}>Free to join · No credit card required</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding:'24px 32px', borderTop:'1px solid rgba(232,233,235,0.06)',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12,
        background:'#0e0f10'
      }}>
        <div style={{ fontFamily:"'Bebas Neue'", fontSize:22, letterSpacing:3, color:'rgba(240,157,81,0.6)' }}>BOLAHH</div>
        <div style={{ fontSize:12, color:'rgba(232,233,235,0.25)', fontFamily:"'DM Sans'" }}>© 2026 Bolahh. All rights reserved.</div>
        <div style={{ display:'flex', gap:20 }}>
          <span className="nav-link" onClick={() => navigate('/login')}>Login</span>
          <span className="nav-link" onClick={() => navigate('/signup')}>Sign Up</span>
        </div>
      </footer>

    </div>
  );
}
