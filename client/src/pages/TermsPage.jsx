import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const LAST_UPDATED = '20 August 2026';

const sectionTitle = {
  fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2,
  color: 'var(--accent)', marginBottom: 10, marginTop: 32,
};

const p = { color: 'var(--text)', fontSize: 14, lineHeight: 1.8, opacity: 0.85, marginBottom: 10 };

const li = { color: 'var(--text)', fontSize: 14, lineHeight: 1.8, opacity: 0.85, marginBottom: 6 };

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>

        <button onClick={() => navigate(-1)} style={{
          background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 13, marginBottom: 24, cursor: 'pointer',
        }}>← Back</button>

        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 38, letterSpacing: 3, color: 'var(--text)', marginBottom: 6 }}>
          TERMS &amp; CONDITIONS
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>Last updated: {LAST_UPDATED}</p>
        <p style={{ ...p, marginBottom: 0 }}>
          These Terms &amp; Conditions ("Terms") govern your access to and use of Bolahh (the "Platform", "we", "us"),
          available at bolahh.com and any associated mobile apps. By creating an account or booking a game, you agree
          to be bound by these Terms. If you do not agree, please do not use the Platform.
        </p>

        <div style={sectionTitle}>1. What Bolahh Is</div>
        <p style={p}>
          Bolahh is a booking platform for futsal games in Malaysia. We connect players with futsal sessions
          ("Games") organised at partner venues ("Fields") and run by session organisers ("Managers"). Bolahh
          facilitates bookings and payments between players and Managers — Bolahh is not the operator of the Fields
          themselves unless stated otherwise.
        </p>

        <div style={sectionTitle}>2. Eligibility &amp; Your Account</div>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}>You must be at least 18 years old, or have a parent/guardian's consent, to create an account.</li>
          <li style={li}>You're responsible for the accuracy of your account information and for keeping your login credentials secure.</li>
          <li style={li}>You're responsible for all activity that happens under your account, including bookings and payments made from it.</li>
          <li style={li}>One account per person. Impersonating another player or creating duplicate/fake accounts is not allowed.</li>
        </ul>

        <div style={sectionTitle}>3. Booking a Game</div>
        <p style={p}>
          Games are listed with a fixed price, date, time, format and slot count set by the Field/Manager. Joining a
          Game reserves one slot and requires payment (or a payment commitment, for Pay at Court — see below). Slots
          are limited and given on a first-come, first-served basis. Once a Game is full, you can no longer join it.
        </p>
        <p style={p}>
          Managers may remove players, adjust team assignments, or cancel a Game entirely. If a Manager cancels a
          Game, every player who paid receives a full refund to their Bolahh Wallet (see Section 5).
        </p>

        <div style={sectionTitle}>4. Payments &amp; the Bolahh Wallet</div>
        <p style={p}>You can pay for a Game in one of three ways, where offered:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}><strong>Bolahh Wallet</strong> — deducted instantly from your wallet balance when you join. Top up your wallet in fixed amounts (RM 5–100) via FPX or DuitNow QR through our payment processor, ToyyibPay.</li>
          <li style={li}><strong>Online Pay</strong> — pay the Game fee directly via FPX or DuitNow QR through ToyyibPay. Your wallet is not charged; your slot is held while payment is completed and confirmed once ToyyibPay verifies it.</li>
          <li style={li}><strong>Pay at Court</strong> — where a Manager allows it, you may reserve a slot with no upfront charge and pay by cash or QR at the venue before kickoff.</li>
        </ul>
        <p style={p}>
          All prices are in Malaysian Ringgit (MYR) and inclusive of any Bolahh service component unless stated
          otherwise. Wallet balances are non-transferable between accounts, have no cash value outside the Platform,
          and cannot be withdrawn or exchanged for cash — they may only be used to pay for Games or top-ups on Bolahh.
          We reserve the right to reverse a wallet credit that resulted from fraud, a processing error, or a chargeback.
        </p>

        <div style={sectionTitle}>5. Cancellation &amp; Refund Policy</div>
        <p style={p}>Refunds apply only to Games paid via Wallet or Online Pay. All refunds are credited to your Bolahh Wallet — we do not refund to bank accounts or cards.</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}><strong>Game cancelled by the organiser</strong> — 100% refund to your wallet, generally within 24 hours.</li>
          <li style={li}><strong>You cancel 24 hours or more before kickoff</strong> — 100% refund.</li>
          <li style={li}><strong>You cancel between 2 and 24 hours before kickoff</strong> — 50% refund.</li>
          <li style={li}><strong>You cancel less than 2 hours before kickoff, or don't show up</strong> — no refund.</li>
        </ul>
        <p style={p}>
          If you booked Pay at Court, no payment was taken upfront, so there is nothing to refund — please still
          cancel as early as you can so the Manager can offer your slot to someone else.
        </p>

        <div style={sectionTitle}>6. Game Conduct Rules</div>
        <p style={p}>Bolahh is a community for players of every level. By joining a Game, you agree to:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}><strong>Fair Play</strong> — no slide tackles, no reckless or aggressive challenges, no barging or holding. Feet on the ground at all times.</li>
          <li style={li}><strong>Respect &amp; Conduct</strong> — respect every player regardless of skill level. No trash talk, taunting, or unsportsmanlike behaviour. Settle disputes calmly.</li>
          <li style={li}><strong>Safety First</strong> — proper futsal shoes only, no cleats or bare feet. Stop play immediately if a player is injured.</li>
          <li style={li}><strong>Consequences</strong> — repeated rough play or poor conduct can get you removed from a session. Serious violations can lead to a permanent ban from Bolahh. Session Managers have full authority to remove any player at any time.</li>
        </ul>

        <div style={sectionTitle}>7. Assumption of Risk</div>
        <p style={p}>
          Futsal is a physical contact sport and carries an inherent risk of injury. By joining a Game, you
          acknowledge and accept that risk. Bolahh does not employ referees or medical staff and is not responsible
          for injuries, loss, or damage arising from your participation in a Game, except where caused by our own
          gross negligence or wilful misconduct. Play within your own ability and stop immediately if you or another
          player is hurt.
        </p>

        <div style={sectionTitle}>8. Ranks, Bolahh Cards &amp; Ratings</div>
        <p style={p}>
          After a Game, a Manager or admin may rate players' in-game performance, which affects your Bolahh Card
          stats and OVR rank. Ratings are a subjective assessment by the Manager running that session, not an
          objective measurement, and Bolahh is not liable for disputes about a specific rating.
        </p>

        <div style={sectionTitle}>9. Prohibited Conduct</div>
        <p style={p}>You agree not to:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}>Use the Platform for any fraudulent, unlawful, or abusive purpose.</li>
          <li style={li}>Attempt to manipulate wallet balances, coupons, ratings, or ranks outside of normal use.</li>
          <li style={li}>Harass, threaten, or discriminate against another user or Manager.</li>
          <li style={li}>Interfere with, reverse-engineer, or attempt to disrupt the Platform's normal operation.</li>
          <li style={li}>Book a slot with no intention of paying or attending, repeatedly.</li>
        </ul>
        <p style={p}>
          We may suspend or permanently terminate your account for violating these Terms, at our discretion, with or
          without notice depending on severity.
        </p>

        <div style={sectionTitle}>10. Changes to These Terms</div>
        <p style={p}>
          We may update these Terms from time to time as the Platform evolves. Material changes will be reflected by
          updating the "Last updated" date above. Continuing to use Bolahh after changes take effect means you accept
          the updated Terms.
        </p>

        <div style={sectionTitle}>11. Limitation of Liability</div>
        <p style={p}>
          To the fullest extent permitted by law, Bolahh's total liability to you for any claim arising from your use
          of the Platform is limited to the amount you paid us in the 3 months before the claim arose. We are not
          liable for indirect, incidental, or consequential damages.
        </p>

        <div style={sectionTitle}>12. Governing Law</div>
        <p style={p}>
          These Terms are governed by the laws of Malaysia. Any dispute arising from these Terms or your use of
          Bolahh will be subject to the exclusive jurisdiction of the Malaysian courts.
        </p>

        <div style={sectionTitle}>13. Contact Us</div>
        <p style={{ ...p, marginBottom: 0 }}>
          Questions about these Terms? Reach us at{' '}
          <a href="mailto:admin@bolahh.com" style={{ color: 'var(--accent)' }}>admin@bolahh.com</a>.
        </p>

      </div>
    </div>
  );
}
