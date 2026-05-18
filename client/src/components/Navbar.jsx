import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { IconLoading } from '../components/Icons';
import { LogOut as IconLogout, ClipboardList as IconManager, ShieldCheck as IconAdmin } from 'lucide-react';
import { IoFootballOutline as IconBall, IoTrophyOutline as IconLeaderboard } from 'react-icons/io5';
import { AiOutlineUser as IconProfile } from 'react-icons/ai';
import { GiSoccerKick as IconGames} from "react-icons/gi";
import { useTranslation } from 'react-i18next';



export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;
  const toggleLang = () => i18n.changeLanguage(i18n.language === 'en' ? 'ms' : 'en');

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .nav-label { display: none; }
          .nav-icon { display: inline !important; }
        }
      `}</style>

      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '--bg', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>

        {/* Title */}
        <div
          onClick={() => navigate('/home')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
        >
          <span style={{
            fontFamily: "'Bebas Neue'", fontSize: 20,
            letterSpacing: 3,
          }}>
            <span style={{ color: '#e8e9eb' }}>B<span style={{ color: '#F09D51' }}>O</span>LAHH</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { path: '/home', label: t('navbar.games'), icon: <IconGames size={22} /> },
            { path: '/leaderboard', label: t('navbar.ranks'), icon: <IconLeaderboard size={20} /> },
            { path: '/profile', label: t('navbar.profile'), icon: <IconProfile size={20} /> },
            ...(isAdmin ? [{ path: '/manager', label: t('navbar.manager'), icon: <IconManager size={20} /> }] : []),
            ...(isSuperAdmin ? [{ path: '/admin', label: t('navbar.admin'), icon: <IconAdmin size={20} /> }] : []),
          ].map(({ path, label, icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                background: isActive(path) ? 'rgba(240,157,81,0.12)' : 'transparent',
                color: isActive(path) ? 'var(--accent)' : 'var(--muted)',
                border: isActive(path) ? '1px solid rgba(240,157,81,0.25)' : '1px solid transparent',
                borderRadius: 8, padding: '6px 12px',
                fontSize: 13, fontWeight: 500,
                transition: 'all 0.15s', whiteSpace: 'nowrap'
              }}
            >
              <span className="nav-icon" style={{ display: 'none' }}>{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            style={{
              background: 'transparent',
              color: 'var(--accent)',
              border: '1px solid rgba(240,157,81,0.3)',
              borderRadius: 8, padding: '6px 10px',
              fontSize: 11, fontWeight: 700,
              fontFamily: "'Space Mono'",
              transition: 'all 0.15s', whiteSpace: 'nowrap', letterSpacing: 0.5,
            }}
          >
            {i18n.language === 'ms' ? 'EN' : 'BM'}
          </button>

          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap'
            }}
          >
            <span className="nav-icon" style={{ display: 'none' }}><IconLogout size={20}/></span>
            <span className="nav-label">{t('navbar.logout')}</span>
          </button>
        </div>

      </nav>
    </>
  );
}
