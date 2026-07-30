import { useState } from 'react';
import { IoTimer, IoAdd, IoChevronDown, IoChevronUp, IoClose } from 'react-icons/io5';
import { FaPeopleGroup } from 'react-icons/fa6';
import { MdSync, MdGridView, MdBlock, MdShield, MdOutlineFlag } from 'react-icons/md';
import { GiSoccerBall } from 'react-icons/gi';

const ICON_OPTIONS = [
  { key: 'grid',   label: 'Structure', Icon: MdGridView },
  { key: 'sync',   label: 'Rotation',  Icon: MdSync },
  { key: 'timer',  label: 'Timer',     Icon: IoTimer },
  { key: 'people', label: 'Players',   Icon: FaPeopleGroup },
  { key: 'ball',   label: 'Ball',      Icon: GiSoccerBall },
  { key: 'shield', label: 'Shield',    Icon: MdShield },
  { key: 'flag',   label: 'Flag',      Icon: MdOutlineFlag },
  { key: 'block',  label: 'Block',     Icon: MdBlock },
];

const TEMPLATES = {
  '5v5': {
    duration: '2 Hours', halfLength: '13 Minutes', halvesPerTeam: '6 Halves', teams: 3,
    sections: [
      {
        title: 'MATCH STRUCTURE',
        rules: [
          { iconKey: 'grid',  title: 'Round-robin format',    type: 'info',       description: 'Each team plays against every other team 3 times, 6 halves in total per team. Every team receives equal game time throughout the session.' },
          { iconKey: 'sync',  title: 'Goalkeeper rotation',   type: 'info',       description: 'The goalkeeper is rotated every 6 minutes. Every player serves as goalkeeper exactly twice over the course of the full match.' },
          { iconKey: 'timer', title: 'Equal playing time',    type: 'info',       description: 'Game time is distributed equally for all players. No player should have significantly more or less field time than others.' },
        ],
      },
      {
        title: 'CONDUCT & FAIR PLAY',
        rules: [
          { iconKey: 'block',  title: 'No sliding tackles',   type: 'prohibited', description: 'Sliding tackles of any kind are strictly not permitted. All challenges must be made while standing.' },
          { iconKey: 'shield', title: 'Respect all players',  type: 'info',       description: 'Treat all players, opponents, and officials with respect. Verbal abuse or aggressive behavior will result in immediate removal from the session.' },
        ],
      },
    ],
  },
  '6v6': {
    duration: '2 Hours', halfLength: '20 Minutes', halvesPerTeam: '4 Halves', teams: 2,
    sections: [
      {
        title: 'MATCH STRUCTURE',
        rules: [
          { iconKey: 'grid',  title: 'Two-team format',       type: 'info',       description: '2 teams play a series of halves. Each team plays 4 halves in total over the session.' },
          { iconKey: 'sync',  title: 'Goalkeeper rotation',   type: 'info',       description: 'The goalkeeper is rotated every 10 minutes. Every player serves as goalkeeper at least once.' },
          { iconKey: 'timer', title: 'Equal playing time',    type: 'info',       description: 'Game time is distributed equally for all players across all halves.' },
        ],
      },
      {
        title: 'CONDUCT & FAIR PLAY',
        rules: [
          { iconKey: 'block',  title: 'No sliding tackles',   type: 'prohibited', description: 'Sliding tackles of any kind are strictly not permitted. All challenges must be made while standing.' },
          { iconKey: 'shield', title: 'Respect all players',  type: 'info',       description: 'Treat all players and opponents with respect. Aggressive behavior will result in removal from the session.' },
        ],
      },
    ],
  },
  '7v7': {
    duration: '2 Hours', halfLength: '25 Minutes', halvesPerTeam: '4 Halves', teams: 2,
    sections: [
      {
        title: 'MATCH STRUCTURE',
        rules: [
          { iconKey: 'grid',  title: 'Two-team format',       type: 'info',       description: '2 teams play a series of halves. Each team plays 4 halves in total over the session.' },
          { iconKey: 'sync',  title: 'Goalkeeper rotation',   type: 'info',       description: 'The goalkeeper is rotated every 12 minutes. Every player serves as goalkeeper at least once.' },
          { iconKey: 'timer', title: 'Equal playing time',    type: 'info',       description: 'Game time is distributed equally for all players across all halves.' },
        ],
      },
      {
        title: 'CONDUCT & FAIR PLAY',
        rules: [
          { iconKey: 'block',  title: 'No sliding tackles',   type: 'prohibited', description: 'Sliding tackles of any kind are strictly not permitted. All challenges must be made while standing.' },
          { iconKey: 'shield', title: 'Respect all players',  type: 'info',       description: 'Treat all players and opponents with respect. Aggressive behavior will result in removal from the session.' },
        ],
      },
    ],
  },
};

function parseRulesJSON(raw) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return p?.sections ? p : null;
  } catch {
    return null;
  }
}

const labelStyle = { fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block' };
const inputStyle = { fontSize: 13 };

export default function GameRulesEditor({ value, format, onChange }) {
  const [rules, setRules] = useState(() => parseRulesJSON(value));
  const [isOpen, setIsOpen] = useState(() => !!parseRulesJSON(value));
  const isPlainText = value && !parseRulesJSON(value);

  const update = (newRules) => {
    setRules(newRules);
    onChange(newRules ? JSON.stringify(newRules) : '');
  };

  const loadTemplate = (fmt) => {
    update(TEMPLATES[fmt] || TEMPLATES['5v5']);
    setIsOpen(true);
  };

  const clearRules = () => {
    update(null);
    onChange('');
    setIsOpen(false);
  };

  const setField = (key, val) => update({ ...rules, [key]: val });

  const updateSection = (si, changes) => {
    const sections = rules.sections.map((s, i) => i === si ? { ...s, ...changes } : s);
    update({ ...rules, sections });
  };

  const addSection = () => {
    update({ ...rules, sections: [...rules.sections, { title: 'NEW SECTION', rules: [] }] });
  };

  const removeSection = (si) => {
    update({ ...rules, sections: rules.sections.filter((_, i) => i !== si) });
  };

  const addRule = (si) => {
    const sections = rules.sections.map((s, i) =>
      i === si ? { ...s, rules: [...s.rules, { iconKey: 'ball', title: '', description: '', type: 'info' }] } : s
    );
    update({ ...rules, sections });
  };

  const removeRule = (si, ri) => {
    const sections = rules.sections.map((s, i) =>
      i === si ? { ...s, rules: s.rules.filter((_, j) => j !== ri) } : s
    );
    update({ ...rules, sections });
  };

  const updateRule = (si, ri, changes) => {
    const sections = rules.sections.map((s, i) =>
      i === si ? { ...s, rules: s.rules.map((r, j) => j === ri ? { ...r, ...changes } : r) } : s
    );
    update({ ...rules, sections });
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={labelStyle}>GAME RULES</label>
        {rules && (
          <button
            onClick={() => setIsOpen(o => !o)}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {isOpen ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
            {isOpen ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      {/* Template buttons (always visible when no rules set) */}
      {!rules && (
        <div>
          {isPlainText && (
            <div style={{ fontSize: 12, color: 'var(--muted)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              Existing plain-text rules. Load a template below to switch to structured format.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>Load template:</span>
            {['5v5', '6v6', '7v7'].map(f => (
              <button key={f} onClick={() => loadTemplate(f)} style={{
                background: f === format ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                color: f === format ? 'var(--accent)' : 'var(--muted)',
                border: `1px solid ${f === format ? 'rgba(240,157,81,0.4)' : 'var(--border)'}`,
                borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{f} {f === format && '(current)'}</button>
            ))}
          </div>
        </div>
      )}

      {/* Loaded rules summary + template switcher */}
      {rules && !isOpen && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(240,157,81,0.06)', border: '1px solid rgba(240,157,81,0.2)', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{rules.sections?.length || 0}</span> sections,{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{rules.sections?.reduce((n, s) => n + s.rules.length, 0) || 0}</span> rules configured
          </div>
          <button onClick={clearRules} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <IoClose size={13} /> Clear
          </button>
        </div>
      )}

      {/* Full editor */}
      {rules && isOpen && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'rgba(0,0,0,0.15)' }}>
          {/* Match info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontFamily: "'Space Mono'", marginBottom: 10 }}>MATCH INFO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>DURATION</label>
                <input value={rules.duration || ''} placeholder="e.g. 2 Hours"
                  onChange={e => setField('duration', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>HALF LENGTH</label>
                <input value={rules.halfLength || ''} placeholder="e.g. 13 Minutes"
                  onChange={e => setField('halfLength', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>TEAMS</label>
                <input type="number" min={1} value={rules.teams || ''} placeholder="e.g. 3"
                  onChange={e => setField('teams', parseInt(e.target.value) || '')} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>HALVES / TEAM</label>
                <input value={rules.halvesPerTeam || ''} placeholder="e.g. 6 Halves"
                  onChange={e => setField('halvesPerTeam', e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Sections */}
          <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontFamily: "'Space Mono'", marginBottom: 10 }}>SECTIONS</div>

          {rules.sections?.map((section, si) => (
            <div key={si} style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
              {/* Section header */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                <input
                  value={section.title}
                  onChange={e => updateSection(si, { title: e.target.value })}
                  placeholder="Section title..."
                  style={{ flex: 1, fontSize: 12, fontWeight: 600, letterSpacing: 1, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', padding: 0 }}
                />
                <button onClick={() => removeSection(si)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>
                  <IoClose />
                </button>
              </div>

              {/* Rules */}
              <div style={{ padding: '10px 12px' }}>
                {section.rules?.map((rule, ri) => (
                  <div key={ri} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8, background: 'rgba(0,0,0,0.1)' }}>
                    {/* Rule row 1: icon + title + type + delete */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                      {/* Icon picker */}
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0, flexWrap: 'wrap', maxWidth: 160 }}>
                        {ICON_OPTIONS.map(({ key, label, Icon }) => (
                          <button
                            key={key}
                            title={label}
                            onClick={() => updateRule(si, ri, { iconKey: key })}
                            style={{
                              width: 26, height: 26, borderRadius: 6, border: `1px solid ${rule.iconKey === key ? 'var(--accent)' : 'var(--border)'}`,
                              background: rule.iconKey === key ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                              color: rule.iconKey === key ? 'var(--accent)' : 'var(--muted)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: 12, padding: 0, flexShrink: 0,
                            }}
                          ><Icon /></button>
                        ))}
                      </div>
                      <input
                        value={rule.title}
                        onChange={e => updateRule(si, ri, { title: e.target.value })}
                        placeholder="Rule title..."
                        style={{ flex: 1, fontSize: 13, minWidth: 0 }}
                      />
                      {/* Type toggle */}
                      <button
                        onClick={() => updateRule(si, ri, { type: rule.type === 'info' ? 'prohibited' : 'info' })}
                        style={{
                          flexShrink: 0,
                          background: rule.type === 'prohibited' ? 'rgba(220,55,55,0.15)' : 'rgba(90,120,210,0.15)',
                          color: rule.type === 'prohibited' ? '#e05555' : '#7aabdd',
                          border: `1px solid ${rule.type === 'prohibited' ? 'rgba(220,55,55,0.3)' : 'rgba(90,120,210,0.3)'}`,
                          borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                          letterSpacing: 0.5,
                        }}
                      >{rule.type === 'prohibited' ? 'PROHIBITED' : 'INFO'}</button>
                      <button onClick={() => removeRule(si, ri)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>
                        <IoClose />
                      </button>
                    </div>
                    {/* Description */}
                    <textarea
                      value={rule.description}
                      onChange={e => updateRule(si, ri, { description: e.target.value })}
                      placeholder="Description (optional)..."
                      rows={2}
                      style={{ width: '100%', resize: 'vertical', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <button onClick={() => addRule(si)} style={{
                  width: '100%', padding: '7px', background: 'transparent',
                  border: '1px dashed var(--border)', borderRadius: 8,
                  color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}><IoAdd size={13} /> Add Rule</button>
              </div>
            </div>
          ))}

          <button onClick={addSection} style={{
            width: '100%', padding: '8px', background: 'transparent',
            border: '1px dashed rgba(240,157,81,0.3)', borderRadius: 10,
            color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}><IoAdd size={13} /> Add Section</button>

          {/* Bottom controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={clearRules} style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--muted)', fontSize: 12, padding: '6px 14px', cursor: 'pointer',
            }}>Clear Rules</button>
          </div>
        </div>
      )}
    </div>
  );
}
