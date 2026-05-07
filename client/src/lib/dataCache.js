const TTL = 5 * 60 * 1000; // 5 minutes

export function getCached(key) {
  try {
    const raw = sessionStorage.getItem(`bc_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL) { sessionStorage.removeItem(`bc_${key}`); return null; }
    return data;
  } catch { return null; }
}

export function setCached(key, data) {
  try {
    sessionStorage.setItem(`bc_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function clearCached(key) {
  try { sessionStorage.removeItem(`bc_${key}`); } catch {}
}
