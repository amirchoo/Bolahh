import { IoTimer } from 'react-icons/io5';
import { FaPeopleGroup } from 'react-icons/fa6';
import { MdSync, MdGridView, MdBlock, MdShield, MdOutlineFlag } from 'react-icons/md';
import { GiSoccerBall } from 'react-icons/gi';

const ICON_MAP = {
  grid: MdGridView,
  sync: MdSync,
  timer: IoTimer,
  people: FaPeopleGroup,
  ball: GiSoccerBall,
  shield: MdShield,
  flag: MdOutlineFlag,
  block: MdBlock,
};

function parseRules(raw) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return p?.sections ? p : null;
  } catch {
    return null;
  }
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5,
        fontFamily: "'Space Mono'", marginBottom: 6, textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 17, fontWeight: 700, color: 'var(--text)',
        fontFamily: "'Bebas Neue'", letterSpacing: 1,
      }}>
        {value}
      </div>
    </div>
  );
}

function RuleItem({ rule, isLast }) {
  const isProhibited = rule.type === 'prohibited';
  const IconComp = ICON_MAP[rule.iconKey] || (isProhibited ? MdBlock : GiSoccerBall);

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '16px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isProhibited ? 'rgba(220,55,55,0.18)' : 'rgba(90,120,210,0.18)',
        color: isProhibited ? '#e05555' : '#7aabdd',
        fontSize: 19,
      }}>
        <IconComp />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{rule.title}</span>
          {isProhibited && (
            <span style={{
              background: 'rgba(220,55,55,0.12)', color: '#e05555',
              border: '1px solid rgba(220,55,55,0.3)',
              borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
            }}>Prohibited</span>
          )}
        </div>
        {rule.description && (
          <p style={{ fontSize: 13, color: 'var(--text)', opacity: 0.6, lineHeight: 1.65, margin: 0 }}>
            {rule.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function GameRulesDisplay({ gameRules, format }) {
  const rules = parseRules(gameRules);

  if (!rules) {
    if (!gameRules) return null;
    return (
      <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14, fontFamily: "'Space Mono'" }}>GAME RULES</div>
        <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', opacity: 0.8, margin: 0 }}>{gameRules}</p>
      </div>
    );
  }

  const formatLabel = rules.teams ? `${format} · ${rules.teams} Teams` : format;

  return (
    <div className="fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--muted)', fontFamily: "'Space Mono'", marginBottom: 10 }}>
          BOLAHH · OFFICIAL MATCH DETAILS
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: 'var(--text)', margin: '0 0 6px' }}>
          {format} Futsal Match Rules
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
          All participants are required to read and comply with the following regulations before play begins.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 4 }}>
        <StatCard label="Duration" value={rules.duration || '-'} />
        <StatCard label="Format" value={formatLabel} />
        <StatCard label="Half Length" value={rules.halfLength || '-'} />
        <StatCard label="Halves / Team" value={rules.halvesPerTeam || '-'} />
      </div>

      {/* Sections */}
      {rules.sections?.map((section, si) => (
        <div key={si} style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)',
            paddingBottom: 12, borderBottom: '1px solid var(--border)',
            fontFamily: "'Space Mono'", textTransform: 'uppercase',
          }}>
            {section.title}
          </div>
          {section.rules?.map((rule, ri) => (
            <RuleItem key={ri} rule={rule} isLast={ri === section.rules.length - 1} />
          ))}
        </div>
      ))}
    </div>
  );
}
