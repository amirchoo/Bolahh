import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAvatarPresets } from '../components/AvatarPicker';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) checkAdmin(session.user.id, session.user.email);
        else setLoading(false);
      })
      .catch(() => {
        setServerDown(true);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        checkAdmin(session.user.id, session.user.email);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId, userEmail) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin, name, avatar_url')
      .eq('id', userId)
      .single();

    setIsAdmin(data?.is_admin === true);
    // Cross-check with Supabase auth email to prevent name spoofing —
    // users can freely edit profile.name but cannot change their auth email without verification.
    setIsSuperAdmin(data?.name === 'bolahhadmin' && userEmail === import.meta.env.VITE_SUPER_ADMIN_EMAIL);
    setLoading(false);

    if (!data?.avatar_url) {
      fetchAvatarPresets().then(options => {
        if (!options.length) return;
        const randomAvatar = options[Math.floor(Math.random() * options.length)];
        supabase.from('profiles').update({ avatar_url: randomAvatar }).eq('id', userId);
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, loading, serverDown }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}