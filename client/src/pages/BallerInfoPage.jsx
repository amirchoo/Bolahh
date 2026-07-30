import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { GiTrophy } from 'react-icons/gi';
import { FaArrowTrendUp } from 'react-icons/fa6';

const STATS = [
  { icon: null, label: 'Shooting Quality', desc: 'Rated by manager: shot accuracy and technique', stat: 'SHO', color: '#f87171' },
  { icon: null, label: 'Passing Quality',  desc: 'Rated by manager: pass accuracy and vision',    stat: 'PAS', color: '#4ade80' },
  { icon: null, label: 'Good Dribble',     desc: 'Successful dribble past a player',               stat: 'DRI', color: '#F09D51' },
  { icon: null, label: 'Good Defending',   desc: 'Key defensive action',                           stat: 'DEF', color: '#a78bfa' },
  { icon: null, label: 'Good Keeping',     desc: 'Notable save or distribution',                   stat: 'PHY', color: '#34d399' },
  { icon: null, label: 'Good Chance',      desc: 'Created or converted a big chance',              stat: 'PAC', color: '#64a0ff' },
];

export default function BallerInfoPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>

        <button onClick={() => navigate(-1)} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginBottom: 28,
        }}>← Back</button>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 3, color: 'var(--text)', marginBottom: 6 }}>
            BALLERS OF THE MATCH
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8 }}>
            After every match, the top 3 players with the most impact are recognised as the Ballers of the Match.
          </p>
        </div>

        {/* How it works */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 12 }}>
            HOW IT WORKS
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.9 }}>
            The manager rates each player after the game based on their performance. Each action earns points, and the 3 players with the highest total are crowned Ballers of the Match.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.9, marginTop: 10 }}>
            The manager can also manually pick the top 3 (Man of the Match picks), which overrides the point calculation.
          </p>
        </div>

        {/* Stat breakdown */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 14 }}>
            STAT POINTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STATS.map(({ icon, label, desc, stat, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--card2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon ?? <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>
                </div>
                <div style={{
                  fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color,
                  background: `${color}15`, border: `1px solid ${color}40`,
                  borderRadius: 6, padding: '3px 8px', flexShrink: 0,
                }}>
                  +1 {stat}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trend icon explanation */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 12 }}>
            WHAT THE ARROW MEANS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <FaArrowTrendUp size={26} color="#4ade80" style={{ flexShrink: 0 }} />
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              This player earned at least one stat this game. Their card is trending up.
            </p>
          </div>
        </div>

        {/* Note */}
        <div style={{
          background: 'rgba(240,157,81,0.06)', border: '1px solid rgba(240,157,81,0.2)',
          borderRadius: 12, padding: '14px 18px',
          fontSize: 13, color: 'var(--muted)', lineHeight: 1.8,
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Note: </span>
          Your SHO and PAS ratings are based purely on shooting and passing quality as judged by the manager. All 6 stats directly update your Bolahh Card and recalculate your OVR.
        </div>

      </div>
    </div>
  );
}
