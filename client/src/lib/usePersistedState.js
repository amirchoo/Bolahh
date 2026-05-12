import { useState, useEffect } from 'react';

export function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`bui_${key}`);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`bui_${key}`, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}
