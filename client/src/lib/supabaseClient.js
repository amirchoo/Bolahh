import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const REMEMBER_KEY = 'bolahh_remember_me';

// "Remember me" unchecked -> session lives in sessionStorage (cleared when the
// browser/tab closes) instead of localStorage. Default (or no preference set
// yet, e.g. for already-logged-in users) keeps the original localStorage behavior.
export const setRememberMe = (remember) => {
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
};

const activeStorage = () => (localStorage.getItem(REMEMBER_KEY) === 'false' ? sessionStorage : localStorage);

const dynamicStorage = {
  getItem: (key) => activeStorage().getItem(key),
  setItem: (key, value) => activeStorage().setItem(key, value),
  removeItem: (key) => activeStorage().removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { storage: dynamicStorage },
});