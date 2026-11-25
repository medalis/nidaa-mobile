// Accès aux données publiques Nidaa (mêmes fonctions que le site public) + cache hors ligne
const cfg = () => window.NIDAA_CONFIG || {};
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
export function camelize(v) {
  if (Array.isArray(v)) return v.map(camelize);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[camel(k)] = (k === 'times' || k === 'iqama' || k === 'adjustments') ? x : camelize(x); return o; }
  return v;
}
async function rpc(name, args, timeout = 12000) {
  const c = cfg(), ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`${c.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: c.supabaseAnonKey, Authorization: `Bearer ${c.supabaseAnonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {}),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const LS = {
  get(k, d) { try { const v = localStorage.getItem('nidaa.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('nidaa.' + k, JSON.stringify(v)); } catch {} },
};
export const store = LS;

export async function search({ q = null, lat = null, lng = null, radiusKm = null } = {}) {
  const r = await rpc('public_search_mosques', { q, city: null, lat, lng, radius_km: radiusKm });
  const list = camelize(Array.isArray(r) ? r : r ? [r] : []);
  LS.set('lastSearch', list.slice(0, 40));
  return list;
}
export async function mosque(slug, from) {
  try {
    const m = camelize(await rpc('public_mosque', { slug, from_date: from || null, days: 62 }));
    m.fetchedAt = Date.now(); LS.set('m.' + slug, m); return m;
  } catch (e) { const c = LS.get('m.' + slug, null); if (c) { c.offline = true; return c; } throw e; }
}
export const cached = (slug) => LS.get('m.' + slug, null);
export async function version(slug) { try { const v = await rpc('public_mosque_version', { slug }, 6000); return v == null ? null : Number(v); } catch { return null; } }
