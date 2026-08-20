import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { LogOut as IconLogout, ClipboardList as IconManager, ShieldCheck as IconAdmin, Globe as IconGlobe } from 'lucide-react';
import { IoFootballOutline as IconBall, IoTrophyOutline as IconLeaderboard, IoPeopleOutline as IconFriends, IoNotificationsOutline as IconBell } from 'react-icons/io5';
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

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const openNotifications = async () => {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    if (willOpen && user) {
      const { data } = await supabase
        .from('notifications').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      setNotifications(data || []);
    }
  };

  const handleNotificationClick = async (n) => {
    setNotifOpen(false);
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const timeAgo = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

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
          {user && desktopNavItems.map(({ path, label, icon }) => (
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

          {/* Notifications */}
          {user && (
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={openNotifications}
                style={{
                  background: notifOpen ? 'rgba(240,157,81,0.1)' : 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid transparent',
                  borderRadius: 8, padding: '6px 8px',
                  display: 'flex', alignItems: 'center', position: 'relative',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                title="Notifications"
              >
                <IconBell size={19} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: 'var(--red)', color: '#fff',
                    borderRadius: 999, minWidth: 15, height: 15, padding: '0 3px',
                    fontSize: 9, fontWeight: 700, fontFamily: "'Space Mono'",
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, border: '1.5px solid var(--bg)',
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  // Fixed to the viewport (not the bell button itself) so the panel always
                  // sits flush against the screen edge — anchoring to the bell's own edge
                  // overflowed off-screen on mobile since it isn't the rightmost nav icon
                  // (the language toggle and logout button sit to its right).
                  position: 'fixed', top: 62, right: 16,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  width: 320, maxWidth: 'calc(100vw - 32px)', maxHeight: 420, zIndex: 200,
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 15, letterSpacing: 1, color: 'var(--text)' }}>NOTIFICATIONS</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{
                        background: 'transparent', border: 'none', color: 'var(--accent)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0,
                      }}>Mark all read</button>
                    )}
                  </div>
                  <div style={{ overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                        No notifications yet.
                      </div>
                    ) : notifications.map((n, idx) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          width: '100%', textAlign: 'left', display: 'block',
                          background: n.read ? 'transparent' : 'rgba(240,157,81,0.06)',
                          border: 'none', cursor: 'pointer',
                          padding: '10px 14px',
                          borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                        {n.body && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 4 }}>{n.body}</div>}
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'Space Mono'" }}>{timeAgo(n.created_at)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {user ? (
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
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent', color: 'var(--muted)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {t('navbar.login', 'Login')}
              </button>
              <button
                onClick={() => navigate('/signup')}
                style={{
                  background: 'var(--accent)', color: '#fff',
                  border: '1px solid var(--accent)', borderRadius: 8,
                  padding: '6px 14px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {t('navbar.signup', 'Sign Up')}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar — only for logged-in users */}
      {user && <nav
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
      </nav>}
    </>
  );
}
