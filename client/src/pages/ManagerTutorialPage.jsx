import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { IoArrowBack, IoCalendarOutline, IoCheckmarkCircleOutline, IoChevronForward, IoPeopleOutline, IoSettingsOutline, IoStarOutline } from 'react-icons/io5';
import { GiSoccerBall, GiTrophy } from 'react-icons/gi';

const MOCK_STEPS = [
  {
    id: 'setup',
    label: '1. Setup',
    title: 'Start the session',
    description: 'Choose the session duration and team format before the game begins.',
    bullets: [
      'Match the session length to the actual game window.',
      'Pick 2 teams for a simple format or 3 teams for rotation.',
      'Prep the location, bibs, and pitch before kickoff starts.',
    ],
  },
  {
    id: 'teams',
    label: '2. Assign Teams',
    title: 'Balance the squads',
    description: 'Place every player into the correct team and assign bib numbers.',
    bullets: [
      'The bib number is shown beside each player.',
      'Keep teams balanced by skill and game time.',
      'Do not continue until every player is assigned.',
    ],
  },
  {
    id: 'schedule',
    label: '3. Schedule',
    title: 'Plan the match flow',
    description: 'Review match order, time slots, and rest periods for smooth rotation.',
    bullets: [
      'Use the chosen duration to estimate the round count.',
      'Check which team rests between matches.',
      'Keep breaks realistic so players stay fresh.',
    ],
  },
  {
    id: 'ratings',
    label: '4. Rate Players',
    title: 'Record match performance',
    description: 'Update each player’s stats based on real actions in the session.',
    bullets: [
      'Adjust the six core stats with care and consistency.',
      'Use actual impact, not bias or personal preference.',
      'The final values determine the player rating and OVR.',
    ],
  },
  {
    id: 'awards',
    label: '5. Awards',
    title: 'Choose the standout players',
    description: 'Pick the best performers for 1st, 2nd, and 3rd place.',
    bullets: [
      'Base the top 3 on overall match impact.',
      'Reward effort, leadership, and consistency.',
      'Keep the final selection fair and easy to explain.',
    ],
  },
];

const TEAM_COLORS = {
  A: { bg: 'rgba(240,157,81,0.12)', border: 'rgba(240,157,81,0.35)', text: '#f09d51' },
  B: { bg: 'rgba(100,160,255,0.12)', border: 'rgba(100,160,255,0.35)', text: '#64a0ff' },
  C: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)', text: '#4ade80' },
};

const DEMO_PLAYERS = [
  { id: 'p1', name: 'Amir Hazif', team: 'A', bib: 1 },
  { id: 'p2', name: 'Hafiz Noor', team: 'A', bib: 2 },
  { id: 'p3', name: 'Aiman Rahman', team: 'A', bib: 3 },
  { id: 'p4', name: 'Arif Danish', team: 'A', bib: 4 },
  { id: 'p5', name: 'Hakim Farid', team: 'A', bib: 5 },
  { id: 'p6', name: 'Danial Amin', team: 'B', bib: 1 },
  { id: 'p7', name: 'Syafiq Rizal', team: 'B', bib: 2 },
  { id: 'p8', name: 'Nazir Reza', team: 'B', bib: 3 },
  { id: 'p9', name: 'Nabil Fikri', team: 'B', bib: 4 },
  { id: 'p10', name: 'Zamri Yusuf', team: 'B', bib: 5 },
  { id: 'p11', name: 'Irfan Zaki', team: 'C', bib: 1 },
  { id: 'p12', name: 'Faiz Luqman', team: 'C', bib: 2 },
  { id: 'p13', name: 'Rafiq Haris', team: 'C', bib: 3 },
  { id: 'p14', name: 'Harris Azam', team: 'C', bib: 4 },
  { id: 'p15', name: 'Faris Iqbal', team: 'C', bib: 5 },
];

const DEMO_STATS = [
  { key: 'sho', label: 'SHO' },
  { key: 'pas', label: 'PAS' },
  { key: 'dri', label: 'DRI' },
  { key: 'def', label: 'DEF' },
  { key: 'phy', label: 'PHY' },
  { key: 'pac', label: 'PAC' },
];

export default function ManagerTutorialPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const step = MOCK_STEPS[currentStep];

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, MOCK_STEPS.length - 1));
  const isLastStep = currentStep === MOCK_STEPS.length - 1;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div className="page-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
              Manager tutorial
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 42, letterSpacing: 3, color: 'var(--text)', margin: 0 }}>
              HOW THE MANAGER SYSTEM WORKS
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10, maxWidth: 760 }}>
              A simple guide to the manager flow before you use the actual live walkthrough screen.
            </p>
          </div>

          <button
            onClick={() => navigate('/manager')}
            style={{
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--muted)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IoArrowBack size={14} /> Back to Manager
            </span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(260px, 0.9fr)', gap: 24, alignItems: 'start' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {MOCK_STEPS.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentStep(index)}
                  style={{
                    background: currentStep === index ? 'var(--accent)' : 'var(--card2)',
                    color: currentStep === index ? '#fff' : 'var(--muted)',
                    border: `1px solid ${currentStep === index ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 9,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(240,157,81,0.12)', color: 'var(--accent)', border: '1px solid rgba(240,157,81,0.25)' }}>
                {currentStep === 0 && <IoSettingsOutline size={18} />}
                {currentStep === 1 && <IoPeopleOutline size={18} />}
                {currentStep === 2 && <IoCalendarOutline size={18} />}
                {currentStep === 3 && <IoStarOutline size={18} />}
                {currentStep === 4 && <GiTrophy size={18} />}
              </div>
              <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 30, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>
                {step.title}
              </h2>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>
              {step.description}
            </p>

            <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 10, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8 }}>
                What to do
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>
                {step.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(100,160,255,0.08), rgba(240,157,81,0.1))', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 10, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12 }}>
                Preview
              </div>

              {currentStep === 0 && (
                <div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                    {['1 Hour', '1.5 Hours', '2 Hours'].map((item, idx) => (
                      <button key={item} style={{ flex: 1, minWidth: 120, padding: '12px 14px', borderRadius: 10, background: idx === 1 ? 'rgba(240,157,81,0.14)' : 'var(--card)', border: idx === 1 ? '1px solid var(--accent)' : '1px solid var(--border)', color: idx === 1 ? 'var(--accent)' : 'var(--muted)', fontWeight: 700 }}>
                        {item}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[2, 3].map((teamCount) => (
                      <button key={teamCount} style={{ flex: 1, minWidth: 120, padding: '16px 14px', borderRadius: 10, background: teamCount === 3 ? 'rgba(240,157,81,0.14)' : 'var(--card)', border: teamCount === 3 ? '1px solid var(--accent)' : '1px solid var(--border)', color: teamCount === 3 ? 'var(--accent)' : 'var(--muted)', fontWeight: 700 }}>
                        {teamCount} Teams
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                  {['A', 'B', 'C'].map((team) => (
                    <div key={team} style={{ background: TEAM_COLORS[team].bg, border: `1px solid ${TEAM_COLORS[team].border}`, borderRadius: 12, padding: 12 }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: TEAM_COLORS[team].text, marginBottom: 8 }}>Team {team}</div>
                      {DEMO_PLAYERS.filter((p) => p.team === team).map((player) => (
                        <div key={player.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.10)', borderRadius: 8, padding: '7px 8px', marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: TEAM_COLORS[team].text, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#101214', fontSize: 10, fontWeight: 800 }}>{player.bib}</div>
                          <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{player.name}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {currentStep === 2 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { time: '8:00 PM', home: 'A', away: 'B' },
                    { time: '8:15 PM', home: 'C', away: 'A' },
                    { time: '8:30 PM', home: 'B', away: 'C' },
                  ].map((match) => (
                    <div key={match.time} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)' }}>{match.time}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: TEAM_COLORS[match.home].bg, color: TEAM_COLORS[match.home].text, border: `1px solid ${TEAM_COLORS[match.home].border}`, borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>Team {match.home}</span>
                        <span style={{ color: 'var(--muted)' }}>vs</span>
                        <span style={{ background: TEAM_COLORS[match.away].bg, color: TEAM_COLORS[match.away].text, border: `1px solid ${TEAM_COLORS[match.away].border}`, borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>Team {match.away}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentStep === 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  {DEMO_STATS.map((stat) => (
                    <div key={stat.key} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Space Mono'", fontSize: 9, letterSpacing: 1.4, color: 'var(--muted)' }}>{stat.label}</div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1, color: 'var(--text)', marginTop: 6 }}>78</div>
                    </div>
                  ))}
                </div>
              )}

              {currentStep === 4 && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {['1ST', '2ND', '3RD'].map((place, idx) => (
                    <div key={place} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: idx === 0 ? 'rgba(255,215,0,0.14)' : idx === 1 ? 'rgba(192,192,192,0.14)' : 'rgba(205,127,50,0.14)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontWeight: 800 }}>{place}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{['Amir Hazif', 'Danial Amin', 'Faris Iqbal'][idx]}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Awarded based on session impact</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                style={{
                  flex: 1,
                  minWidth: 130,
                  background: 'transparent',
                  color: currentStep === 0 ? 'var(--muted)' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontWeight: 700,
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentStep === 0 ? 0.5 : 1,
                }}
              >
                ← Previous
              </button>

              <button
                onClick={nextStep}
                disabled={currentStep === MOCK_STEPS.length - 1}
                style={{
                  flex: 1,
                  minWidth: 130,
                  background: currentStep === MOCK_STEPS.length - 1 ? 'var(--card2)' : 'var(--accent)',
                  color: currentStep === MOCK_STEPS.length - 1 ? 'var(--muted)' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontWeight: 700,
                  cursor: currentStep === MOCK_STEPS.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentStep === MOCK_STEPS.length - 1 ? 0.6 : 1,
                }}
              >
                {currentStep === MOCK_STEPS.length - 1 ? 'Final step' : 'Next'}
                {currentStep !== MOCK_STEPS.length - 1 && <IoChevronForward size={14} style={{ marginLeft: 8, verticalAlign: 'middle' }} />}
              </button>
            </div>
          </div>

          <aside style={{ display: 'grid', gap: 18 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 10, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 10 }}>
                Quick summary
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Setup', value: 'Session + teams', icon: <IoSettingsOutline size={14} /> },
                  { label: 'Matches', value: 'Rotation + breaks', icon: <IoCalendarOutline size={14} /> },
                  { label: 'Rating', value: '6 stat updates', icon: <IoStarOutline size={14} /> },
                  { label: 'Awards', value: 'Top 3 picks', icon: <GiSoccerBall size={14} /> },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{item.label}</span>
                    </div>
                    <strong style={{ color: 'var(--text)', fontSize: 12 }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 10, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 10 }}>
                Manager checklist
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>
                <li>Check the session length.</li>
                <li>Balance each squad fairly.</li>
                <li>Review the full schedule.</li>
                <li>Rate players based on action.</li>
                <li>Choose the final top 3.</li>
              </ul>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(240,157,81,0.12), rgba(100,160,255,0.08))', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <IoCheckmarkCircleOutline color="var(--accent)" />
                <strong style={{ color: 'var(--text)', fontSize: 14 }}>Key rule</strong>
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                This page is a training guide only. It explains the flow without changing the live manager data.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
