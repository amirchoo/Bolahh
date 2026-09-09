// Rewrites Supabase Storage public URLs to a Cloudflare-fronted CDN domain so
// repeat image views are served from Cloudflare's edge cache instead of
// Supabase (which bills every cache-hit as "Cached Egress" — this is what
// pushed the project over its free-tier quota). Storage filenames are already
// unique/immutable per upload (timestamp or random suffix), so aggressive
// edge caching is safe with no invalidation concerns.
//
// No-ops (returns the original URL untouched) until VITE_STORAGE_CDN_URL is
// set, so this is safe to deploy before the Cloudflare side is live.
const CDN_HOST = import.meta.env.VITE_STORAGE_CDN_URL?.replace(/\/$/, '');
const STORAGE_PATH_MARKER = '/storage/v1/object/public/';

export function toCdnUrl(supabaseUrl) {
  if (!supabaseUrl || !CDN_HOST) return supabaseUrl;
  const idx = supabaseUrl.indexOf(STORAGE_PATH_MARKER);
  if (idx === -1) return supabaseUrl;
  return CDN_HOST + supabaseUrl.slice(idx);
}
