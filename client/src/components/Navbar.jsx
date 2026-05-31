import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { LogOut as IconLogout, ClipboardList as IconManager, ShieldCheck as IconAdmin, Globe as IconGlobe } from 'lucide-react';
import { IoFootballOutline as IconBall, IoTrophyOutline as IconLeaderboard, IoPeopleOutline as IconFriends } from 'react-icons/io5';
import { AiOutlineUser as IconProfile } from 'react-icons/ai';
import { GiSoccerKick as IconGames } from "react-icons/gi";
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

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ms', label: 'Melayu', flag: '🇲🇾' },
  ];

  const desktopNavItems = [
    { path: '/home', label: t('navbar.games'), icon: <IconGames size={22} /> },
    { path: '/leaderboard', label: t('navbar.ranks'), icon: <IconLeaderboard size={20} /> },
    { path: '/friends', label: t('navbar.friends'), icon: <IconFriends size={20} /> },
    { path: '/profile', label: t('navbar.profile'), icon: <IconProfile size={20} /> },
    ...(isAdmin ? [{ path: '/manager', label: t('navbar.manager'), icon: <IconManager size={20} /> }] : []),
    ...(isSuperAdmin ? [{ path: '/admin', label: t('navbar.admin'), icon: <IconAdmin size={20} /> }] : []),
  ];

  const mobileNavItems = [
    { path: '/home', label: t('navbar.games'), icon: <IconGames size={20} /> },
    { path: '/leaderboard', label: t('navbar.ranks'), icon: <IconLeaderboard size={20} /> },
    { path: '/friends', label: t('navbar.friends'), icon: <IconFriends size={20} /> },
    { path: '/profile', label: t('navbar.profile'), icon: <IconProfile size={20} /> },
    ...(isAdmin ? [{ path: '/manager', label: t('navbar.manager'), icon: <IconManager size={18} /> }] : []),
  ];

  return (
    <>
      <style>{`
        .top-nav-item { display: flex; }
        .nav-label { display: inline; }
        .mobile-bottom-nav { display: none !important; }

        @media (max-width: 600px) {
          .top-nav-item { display: none !important; }
          .nav-label { display: none; }
          .mobile-bottom-nav { display: flex !important; }
        }
      `}</style>

      {/* Top nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>

        {/* Logo */}
        <div
          onClick={() => navigate('/home')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
        >
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 3 }}>
            <span style={{ color: '#e8e9eb' }}>B<span style={{ color: '#F09D51' }}>O</span>LAHH</span>
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Desktop nav items */}
          {desktopNavItems.map(({ path, label, icon }) => (
            <button
              key={path}
              className="top-nav-item"
              onClick={() => navigate(path)}
              style={{
                background: isActive(path) ? 'rgba(240,157,81,0.12)' : 'transparent',
                color: isActive(path) ? 'var(--accent)' : 'var(--muted)',
                border: isActive(path) ? '1px solid rgba(240,157,81,0.25)' : '1px solid transparent',
                borderRadius: 8, padding: '6px 12px',
                fontSize: 13, fontWeight: 500,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
                alignItems: 'center', gap: 6,
              }}
            >
              <span className="nav-label">{label}</span>
            </button>
          ))}

          {/* Language dropdown — always visible */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{
                background: langOpen ? 'rgba(240,157,81,0.1)' : 'transparent',
                color: 'var(--accent)',
                border: '1px solid rgba(240,157,81,0.3)',
                borderRadius: 8, padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              title="Language / Bahasa"
            >
              <IconGlobe size={16} />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono'", letterSpacing: 0.5 }}>
                {i18n.language === 'ms' ? 'BM' : 'EN'}
              </span>
            </button>

            {langOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 140, zIndex: 200,
              }}>
                {languages.map(({ code, label, flag }, idx) => (
                  <button
                    key={code}
                    onClick={() => { i18n.changeLanguage(code); setLangOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: 'transparent',
                      color: i18n.language === code ? 'var(--accent)' : 'var(--muted)',
                      fontWeight: i18n.language === code ? 700 : 400,
                      fontSize: 13, cursor: 'pointer', border: 'none',
                      borderBottom: idx < languages.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,157,81,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 16 }}>{flag}</span>
                    <span>{label}</span>
                    {i18n.language === code && (
                      <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 11 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout — always visible, icon-only on mobile */}
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >
            <IconLogout size={18} />
            <span className="nav-label">{t('navbar.logout')}</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          alignItems: 'stretch',
          zIndex: 100,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {mobileNavItems.map(({ path, label, icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4,
              background: isActive(path) ? 'rgba(240,157,81,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: isActive(path) ? 'var(--accent)' : 'var(--muted)',
              padding: '10px 0 8px',
              transition: 'color 0.15s, background 0.15s',
              borderTop: isActive(path) ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {icon}
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2 }}>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
