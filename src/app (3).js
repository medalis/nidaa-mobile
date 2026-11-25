import * as E from './engine.js';
import * as API from './api.js';
import * as N from './native.js';
import L from 'leaflet';

const S = API.store, $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const JAR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SERV = { women_space: 'Salle femmes', accessible: 'Accès PMR', parking: 'Parking', ablutions: "Salle d'ablutions", classes: 'Cours', library: 'Bibliothèque', funeral: 'Prière mortuaire', quran_school: 'École coranique', iftar: 'Iftar' };

const st = {
  tab: 'home', sub: null, main: S.get('main', null), favs: S.get('favs', []), m: null, days: null,
  timesView: 'day', evFilter: 'all', notif: S.get('notif', {}), tasbih: S.get('tasbih', 0), heading: null, pos: S.get('pos', null),
  search: { q: '', list: S.get('lastSearch', []), loading: false }, detail: null, monthOff: 0, ramPreview: S.get('ramPreview', false), ramOdd: false,
};

// ---------- icônes ----------
const LOGO = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M20 4l7 11H13z" fill="#e9b955"/><rect x="14" y="15" width="12" height="44" rx="1.5" fill="#e9b955"/><rect x="18" y="24" width="4" height="9" rx="2" fill="#0b1430"/><g fill="none" stroke="#4fb3a6" stroke-width="3.2" stroke-linecap="round"><path d="M34 26a9 9 0 0 1 0 14"/><path d="M40 20a17 17 0 0 1 0 26"/><path d="M46 14a25 25 0 0 1 0 38" opacity=".7"/></g></svg>`;
function pic(k, s, c = '#e9b955') {
  const rays = (cx, cy, r1, r2, a0, a1, n) => { let q = ''; for (let i = 0; i < n; i++) { const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180; q += `<line x1="${cx + r1 * Math.cos(a)}" y1="${cy + r1 * Math.sin(a)}" x2="${cx + r2 * Math.cos(a)}" y2="${cy + r2 * Math.sin(a)}"/>`; } return q; };
  const o = { fajr: `<path d="M22 58a20 20 0 0 1 40 0" fill="${c}"/>${rays(42, 58, 26, 34, -160, -20, 5)}<line x1="8" y1="64" x2="76" y2="64"/>`, shuruq: `<path d="M24 56a18 18 0 0 1 36 0" fill="${c}"/>${rays(42, 56, 24, 34, -180, 0, 7)}<line x1="6" y1="62" x2="78" y2="62"/>`, dhuhr: `<circle cx="42" cy="40" r="15" fill="${c}"/>${rays(42, 40, 22, 32, 0, 315, 8)}`, asr: `<circle cx="42" cy="44" r="14" fill="${c}"/>${rays(42, 44, 21, 30, -180, 0, 7)}`, maghrib: `<path d="M26 58a16 16 0 0 1 32 0" fill="${c}"/>${rays(42, 58, 22, 30, -170, -10, 5)}<line x1="6" y1="64" x2="78" y2="64"/>`, isha: `<path d="M50 14a28 28 0 1 0 22 42a22 22 0 1 1-22-42z" fill="${c}"/>` }[k];
  return `<svg width="${s}" height="${s}" viewBox="0 0 84 84" fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round">${o}</svg>`;
}
const I = { home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', ev: '<path d="M5 4h14v17l-7-4-7 4z"/>', map: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>', more: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', belloff: '<path d="M6 16V11a6 6 0 0 1 9-5.2M18 11v5l2 2H4"/><path d="M10 20a2 2 0 0 0 4 0M3 3l18 18"/>', back: '<path d="M15 5l-7 7 7 7"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', loc: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>', star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z"/>', route: '<path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8"/>', heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>', compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', beads: '<circle cx="12" cy="5" r="2"/><circle cx="17" cy="9" r="2"/><circle cx="17" cy="15" r="2"/><circle cx="7" cy="9" r="2"/><circle cx="7" cy="15" r="2"/><path d="M12 17v4"/>', moon: '<path d="M15 3a9 9 0 1 0 6 13A7 7 0 1 1 15 3z"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>' };
const svg = (k, s = 22, c = 'currentColor') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;
function moonPhase(d) { const r = 16, k = Math.cos(2 * Math.PI * ((d || 15) - 1) / 29.53), rx = Math.abs(k) * r, wax = (d || 15) <= 15; const p = wax ? `M20 4A16 16 0 0 1 20 36A${rx.toFixed(1)} 16 0 0 ${k > 0 ? 0 : 1} 20 4Z` : `M20 4A16 16 0 0 0 20 36A${rx.toFixed(1)} 16 0 0 ${k > 0 ? 1 : 0} 20 4Z`; return `<svg width="34" height="34" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#e9b955" opacity=".16"/><path d="${p}" fill="#ffd98a"/></svg>`; }

// ---------- données ----------
const tz = () => (st.m && st.m.timezone) || 'Africa/Djibouti';
const today = () => E.ymd(new Date(), tz());
function frDate(date) { const [y, m, d] = date.split('-').map(Number); return { wd: JOURS[E.weekday(date)], wa: JAR[E.weekday(date)], txt: `${d} ${MOIS[m - 1]} ${y}`, d, m }; }
async function loadMain(force) {
  if (!st.main) return;
  const c = API.cached(st.main.slug);
  if (c && !st.m) { st.m = c; recompute(); render(); }
  if (!force && st.m && !st.m.offline && Date.now() - (st.m.fetchedAt || 0) < 5 * 60e3) return;
  try { st.m = await API.mosque(st.main.slug, E.addDays(today(), -1)); recompute(); render(); reschedule(); } catch { if (st.m) { st.m.offline = true; render(); } }
}
function recompute() { if (!st.m) return; st.days = E.computeDays(st.m, E.addDays(E.ymd(new Date(), tz()), -1), 62); }
function reschedule() { N.schedule(st.m, st.days && st.days.filter((d) => d.date >= today()), st.notif, { imsakMin: imsakMin(), ramadan: (D) => D.hijri && D.hijri.month === 9 }); }
// ---------- Ramadan ----------
const hOff = () => (st.m && st.m.prayerConfig && st.m.prayerConfig.hijriOffsetDays) || 0;
const imsakMin = () => { const r = st.m && st.m.screenSettings && st.m.screenSettings.ramadan; const v = r && Number(r.imsakMin); return Number.isFinite(v) && v >= 0 && v <= 30 ? v : 10; };
const isRamadan = () => E.hijri(today(), hOff()).month === 9;
const ramOn = () => isRamadan() || st.ramPreview;
function ramStart() { const t = today(), h = E.hijri(t, hOff()); if (h.month === 9) return E.addDays(t, 1 - h.day); for (let i = 1; i < 400; i++) { const d = E.addDays(t, i), x = E.hijri(d, hOff()); if (x.month === 9 && x.day === 1) return d; } return null; }
function ramDays() {
  const s0 = ramStart(); if (!s0 || !st.m) return [];
  return E.computeDays(st.m, s0, 30).map((d) => st.days && st.days.find((x) => x.date === d.date) || d).filter((d) => d.hijri.month === 9);
}
function tarawih(date) {
  const L = (st.m && st.m.specialPrayers || []).filter((p) => /tarawi|تراويح/i.test((p.kind || '') + ' ' + (p.label || '')) && p.time).sort((a, b) => a.date.localeCompare(b.date));
  const ex = L.find((p) => p.date === date); if (ex) return ex.time;
  const prev = L.filter((p) => p.date <= date).pop(); return prev ? prev.time : null;
}
function setMain(m) { st.main = { slug: m.slug, name: m.name, nameAr: m.nameAr || null }; S.set('main', st.main); if (!st.favs.find((f) => f.slug === m.slug)) { st.favs.unshift(st.main); S.set('favs', st.favs); } st.m = null; st.days = null; st.tab = 'home'; st.sub = null; render(); loadMain(true); }

// ---------- écrans ----------
function tabbar() {
  const T = [['home', 'Accueil'], ['times', 'Horaires'], ramOn() ? ['ramadan', 'Ramadan'] : ['events', 'Événements'], ['mosques', 'Mosquées'], ['more', 'Plus']];
  return `<nav class="tab">${T.map(([k, l]) => `<button data-tab="${k}" class="${st.tab === k ? 'on' : ''}">${svg({ home: 'home', times: 'cal', events: 'ev', ramadan: 'moon', mosques: 'map', more: 'more' }[k])}<span>${l}</span></button>`).join('')}</nav>`;
}
function header(title, back) { return `<header class="hdr">${back ? `<button class="ib" data-act="back">${svg('back')}</button>` : ''}<h1>${esc(title)}</h1></header>`; }
function onboarding() {
  return `<div class="onb"><div class="onb-top">${LOGO(76)}<div class="brand">Nidaa</div><div class="ar g2" style="font-size:26px">نداء</div><p>Les horaires de prière <b>de votre mosquée</b>, ses annonces et ses événements.</p></div>
  <div class="card pad16"><div class="lbl">Choisissez votre mosquée</div>${searchBox()}<button class="btn ghost w100" data-act="near">${svg('loc', 18)} Autour de moi</button></div>
  <div id="res">${resultList(st.search.list)}</div></div>`;
}
function searchBox() { return `<div class="sbox">${svg('search', 18, '#a9b8dc')}<input id="q" placeholder="Nom, quartier, ville…" value="${esc(st.search.q)}" autocomplete="off" enterkeyhint="search"></div>`; }
// Coordonnées par défaut du back-office (centre de Djibouti) : la mosquée n'a pas encore été placée
const noPos = (m) => m && Math.abs(Number(m.latitude) - 11.588) < 1e-5 && Math.abs(Number(m.longitude) - 43.145) < 1e-5;
function resultList(list) {
  if (st.search.loading) return '<div class="empty">Recherche…</div>';
  if (st.search.error) return `<div class="empty">${esc(st.search.error)}</div>`;
  if (!list || !list.length) return '<div class="empty">Tapez le nom d\'une mosquée ou utilisez « Autour de moi ».</div>';
  return list.map((m) => { const fav = st.favs.some((f) => f.slug === m.slug), main = st.main && st.main.slug === m.slug; return `<div class="card mrow" data-act="open" data-slug="${esc(m.slug)}">${LOGO(34)}<div class="f1"><div class="t15">${esc(m.name)}${main ? ' <span class="chip sm">Principale</span>' : ''}</div><div class="mut t12">${esc([m.address || m.city, noPos(m) ? (m.distanceKm != null ? 'position à préciser' : null) : m.distanceKm != null ? (m.distanceKm < 1 ? Math.round(m.distanceKm * 1000) + ' m' : m.distanceKm.toFixed(1).replace('.', ',') + ' km') : null].filter(Boolean).join(' · '))}</div></div><button class="ib star ${fav ? 'on' : ''}" data-act="fav" data-slug="${esc(m.slug)}" data-name="${esc(m.name)}" data-namear="${esc(m.nameAr || '')}">${svg('star', 22, fav ? '#e9b955' : '#a9b8dc')}</button></div>`; }).join('');
}
function loading() { return `<div class="empty" style="padding-top:140px">${LOGO(56)}<div style="margin-top:14px">Chargement des horaires…</div></div>`; }
function home() {
  if (!st.m || !st.days) return loading();
  const now = new Date(), D = st.days.find((d) => d.date === today()), nx = E.nextPrayer(st.days, now, tz());
  const f = frDate(D.date), h = D.hijri;
  const jum = nx && nx.key === 'dhuhr' && nx.day.friday;
  const nar = nx ? (jum ? 'الجمعة' : E.NAMES[nx.key].ar) : '', nfr = nx ? (jum ? "Jumu'a" : E.NAMES[nx.key].fr) : '';
  const cd = nx ? (nx.phase === 'before' ? nx.adhan - now : nx.iqama - now) : 0;
  let o = `<div class="top"><div class="row g10">${LOGO(36)}<div class="f1 mw0"><div class="t17 b5 ell">${esc(st.m.name)}</div>${st.m.nameAr ? `<div class="ar g t17 ell">${esc(st.m.nameAr)}</div>` : ''}</div><button class="ib ring" data-tab="more" data-sub="notif">${svg('bell', 20, '#e9b955')}</button></div>
  <div class="dline"><span><b class="g">${f.wd}</b> ${f.txt}</span><span class="ar g2">${E.arDigits(h.day)} ${h.ar} ${E.arDigits(h.year)}</span></div>${st.m.offline ? '<div class="off">Hors ligne · horaires enregistrés</div>' : ''}</div>`;
  if (ramOn()) o += ramHome(D, now); else o += `<div class="hero"><div class="lbl">${nx && nx.phase === 'iqama' ? 'Iqama dans' : 'Prochaine prière'}</div><div class="cal">${nar}</div><div class="t17">${nfr} · ${nx && nx.phase === 'iqama' ? 'iqama à' : 'adhan à'} <b class="g2">${nx ? (nx.phase === 'iqama' ? nx.day.iqama[nx.key] : nx.day.times[nx.key]) : ''}</b></div><div class="cd" id="cd">${E.fmtDur(cd)}</div><div class="mut t13">${nx ? (jum ? `prière ${nx.day.iqama.dhuhr}` : `iqama ${nx.day.iqama[nx.key]}`) : ''}${st.notif[nx && nx.key] && st.notif[nx.key].on === false ? '' : ' · rappel activé'}</div></div>`;
  o += `<div class="grid3">${E.ORDER.map((k) => { const n = nx && nx.day.date === D.date && nx.key === k, past = !n && E.at(D.date, D.times[k], tz()) < now && !(nx && nx.day.date === D.date && E.ORDER.indexOf(k) > E.ORDER.indexOf(nx.key)); const j = k === 'dhuhr' && D.friday; return `<div class="card mini ${n ? 'now' : ''} ${past ? 'past' : ''}">${pic(k, 22)}<div class="ar t18">${j ? 'الجمعة' : E.NAMES[k].ar}</div><div class="tt t22">${D.times[k]}</div></div>`; }).join('')}</div>`;
  const ev = events().filter((e) => e.date <= E.addDays(today(), 7)).slice(0, 3);
  o += `<div class="row sb mt16"><div class="lbl">Cette semaine</div><button class="lnk" data-tab="events">Tout voir</button></div>${ev.length ? ev.map(evCard).join('') : '<div class="card pad14 mut t13 mt8">Aucun événement cette semaine.</div>'}`;
  if (st.m.donationUrl) o += `<button class="card don mt12" data-act="don">${svg('heart', 22, '#e9b955')}<div class="f1"><div class="t15 b5">Soutenir la mosquée</div><div class="mut t12">Faire un don à ${esc(st.m.name)}</div></div><span class="g">›</span></button>`;
  return o;
}
function prayerRow(D, k, opts = {}) {
  const j = k === 'dhuhr' && D.friday, n = opts.now === k, past = opts.past && opts.past(k), on = !st.notif[k] || st.notif[k].on !== false;
  return `<div class="card prow ${n ? 'now' : ''} ${past ? 'past' : ''}"><div class="med">${pic(k, 18)}<div class="ar t15">${j ? 'الجمعة' : E.NAMES[k].ar}</div></div><div class="f1"><div class="t15 b5">${j ? "Jumu'a" : E.NAMES[k].fr}</div><div class="acc t12">${k === 'shuruq' ? 'lever du soleil' : (j ? 'prière ' : 'iqama ') + D.iqama[k]}</div></div><div class="tt t32">${D.times[k]}</div>${k === 'shuruq' ? '<span class="bw"></span>' : `<button class="ib bw" data-act="bell" data-k="${k}">${svg(on ? 'bell' : 'belloff', 20, on ? '#e9b955' : '#6f7da3')}</button>`}</div>`;
}
function times() {
  if (!st.m || !st.days) return loading();
  const v = st.timesView, now = new Date(), D = st.days.find((d) => d.date === today()), nx = E.nextPrayer(st.days, now, tz());
  let o = `<div class="top"><div class="row sb"><h1 class="h1">Horaires</h1><button class="pill" data-tab="mosques">${esc(st.m.name)} ▾</button></div><div class="seg">${[['day', "Aujourd'hui"], ['week', 'Semaine'], ['month', 'Mois']].map(([k, l]) => `<button data-act="tv" data-v="${k}" class="${v === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
  if (v === 'day') {
    const past = (k) => E.at(D.date, D.times[k], tz()) < now && !(nx && nx.day.date === D.date && nx.key === k);
    o += E.ORDER.map((k) => prayerRow(D, k, { now: nx && nx.day.date === D.date ? nx.key : null, past })).join('');
    const j = (st.m.jumua || [])[0];
    if (j) o += `<div class="card pad14 row sb mt10"><div><div class="lbl">Jumu'a · vendredi</div><div class="t14 mt4">Prière ${E.jumuaDelay(j)} min après l'adhan de Dhuhr</div></div><div class="ar g2 t24">الجمعة</div></div>`;
  } else if (v === 'week') {
    const days = st.days.filter((d) => d.date >= D.date).slice(0, 7);
    o += `<div class="card tbl"><div class="tr th"><span>Jour</span>${E.ORDER.map((k) => `<span class="ar">${E.NAMES[k].ar}</span>`).join('')}</div>${days.map((d) => { const f = frDate(d.date); return `<div class="tr ${d.date === D.date ? 'cur' : ''}"><span><b>${f.wd.slice(0, 3)}</b> ${f.d}</span>${E.ORDER.map((k) => `<span>${d.times[k]}</span>`).join('')}</div>`; }).join('')}</div><div class="mut t12 mt8 ctr">Iqama et Jumu'a dans la vue « Aujourd'hui ».</div>`;
  } else {
    const [y, m] = D.date.split('-').map(Number), base = new Date(Date.UTC(y, m - 1 + st.monthOff, 1, 12)), ym = `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}`;
    const first = `${ym}-01`, n = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
    const days = E.computeDays(st.m, first, n).map((d) => { const s = st.days.find((x) => x.date === d.date); return s || d; });
    o += `<div class="row sb mt8"><button class="ib" data-act="mo" data-d="-1">‹</button><div class="t17 b5">${MOIS[base.getUTCMonth()][0].toUpperCase() + MOIS[base.getUTCMonth()].slice(1)} ${base.getUTCFullYear()}</div><button class="ib" data-act="mo" data-d="1">›</button></div>
    <div class="card tbl"><div class="tr th"><span>Jour</span>${E.ORDER.map((k) => `<span class="ar">${E.NAMES[k].ar}</span>`).join('')}</div>${days.map((d) => `<div class="tr ${d.date === D.date ? 'cur' : ''} ${d.friday ? 'fri' : ''}"><span><b>${d.date.slice(8)}</b> <i class="ar">${E.arDigits(d.hijri.day)}</i></span>${E.ORDER.map((k) => `<span>${d.times[k]}</span>`).join('')}</div>`).join('')}</div>`;
  }
  return o;
}
function events() {
  if (!st.m) return [];
  const out = [], t = today(), nowIso = new Date().toISOString();
  for (const a of st.m.announcements || []) {
    if (a.isActive === false) continue; if (a.targets && !a.targets.some((x) => x === 'app' || x === 'web')) continue;
    if (a.endsAt && a.endsAt < nowIso) continue;
    const date = a.startsAt ? E.ymd(new Date(a.startsAt), tz()) : t;
    out.push({ kind: a.level === 'urgent' ? 'URGENT' : 'ANNONCE', date: date < t ? t : date, title: a.title, titleAr: a.titleAr, body: a.body, img: a.type === 'image' ? a.mediaUrl : null, ends: a.endsAt });
  }
  for (const p of st.m.specialPrayers || []) if (p.date >= t) out.push({ kind: /eid|aid|aïd/i.test(p.kind + p.label) ? 'AÏD' : 'PRIÈRE', date: p.date, title: p.label || 'Prière spéciale', body: `Prière à ${p.time}${p.locationNote ? ' · ' + p.locationNote : ''}` });
  if (st.days) for (const d of st.days) if (d.friday && d.date >= t && d.date <= E.addDays(t, 13)) out.push({ kind: 'JUMU\'A', date: d.date, title: "Prière du vendredi", titleAr: 'صلاة الجمعة', body: `Adhan ${d.times.dhuhr} · prière ${d.iqama.dhuhr}` });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
const KC = { ANNONCE: '#86b2ff', URGENT: '#ff9f8a', 'AÏD': '#7fe3bb', PRIÈRE: '#7fe3bb', "JUMU'A": '#e9b955' };
function evCard(e) {
  const [, m, d] = e.date.split('-').map(Number);
  return `<div class="card ev mt8"><div class="evd"><div class="g t11 ls">${MOIS[m - 1].slice(0, 3).toUpperCase()}</div><div class="t22 b5">${d}</div></div><div class="f1 mw0"><span class="tag" style="color:${KC[e.kind]};border-color:${KC[e.kind]}">${e.kind}</span><div class="t15 b5 mt4">${esc(e.title)}</div>${e.titleAr ? `<div class="ar g t17">${esc(e.titleAr)}</div>` : ''}${e.body ? `<div class="mut t12 mt2 clamp3">${esc(e.body)}</div>` : ''}${e.img ? `<img class="evimg" src="${esc(e.img)}" alt="">` : ''}</div></div>`;
}
function eventsView() {
  if (!st.m) return loading();
  const all = events(), F = [['all', 'Tous'], ['ANNONCE', 'Annonces'], ["JUMU'A", "Jumu'a"], ['AÏD', 'Aïd & prières']];
  const list = st.evFilter === 'all' ? all : all.filter((e) => e.kind === st.evFilter || (st.evFilter === 'AÏD' && e.kind === 'PRIÈRE') || (st.evFilter === 'ANNONCE' && e.kind === 'URGENT'));
  let o = `<div class="top"><h1 class="h1">Événements</h1><div class="mut t13">${esc(st.m.name)}</div><div class="chips mt10">${F.map(([k, l]) => `<button class="pill ${st.evFilter === k ? 'on' : ''}" data-act="evf" data-v="${k}">${l}</button>`).join('')}</div></div>`;
  const flash = st.m.flash && st.m.flash.isActive !== false && (st.m.flash.text || st.m.flash.textAr);
  if (flash) o += `<div class="card feat"><div class="lbl" style="color:#fff">Message de la mosquée</div><div class="t17 b5 mt6">${esc(st.m.flash.text || '')}</div>${st.m.flash.textAr ? `<div class="ar t20 mt4">${esc(st.m.flash.textAr)}</div>` : ''}</div>`;
  o += list.length ? list.map(evCard).join('') : '<div class="empty">Aucun événement pour le moment.</div>';
  return o;
}
let map = null;
function mosquesView() {
  if (st.sub === 'detail') return detailView();
  const favs = st.favs;
  return `<div class="top"><h1 class="h1">Mosquées</h1>${searchBox()}<div class="row g8 mt10"><button class="btn ghost f1" data-act="near">${svg('loc', 18)} Autour de moi</button></div></div><div id="map" class="map"></div>
  ${favs.length ? `<div class="lbl mt16">Mes mosquées</div>${resultList(favs)}` : ''}<div class="lbl mt16">${st.search.near ? 'Autour de moi' : 'Résultats'}</div><div id="res">${resultList(st.search.list)}</div>`;
}
function initMap() {
  const el = $('#map'); if (!el) return;
  try {
    if (map) { map.remove(); map = null; }
    const c = st.search.center || st.pos || { lat: 11.588, lng: 43.145 };
    map = L.map(el, { zoomControl: false, attributionControl: true }).setView([c.lat, c.lng], 13);
    { const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: '© Esri · © OpenStreetMap' }).addTo(map); let bad = 0; esri.on('tileerror', () => { if (++bad === 4) { map.removeLayer(esri); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map); } }); }
    const icon = (main) => L.divIcon({ className: 'pin' + (main ? ' main' : ''), html: '<i></i>', iconSize: [30, 30], iconAnchor: [15, 15] });
    const seen = new Set();
    [...st.search.list, ...st.favs].forEach((m) => { if (seen.has(m.slug) || m.latitude == null || noPos(m)) return; seen.add(m.slug); L.marker([m.latitude, m.longitude], { icon: icon(st.main && st.main.slug === m.slug) }).addTo(map).on('click', () => openDetail(m.slug)); });
    if (st.pos) L.circleMarker([st.pos.lat, st.pos.lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#4fb3ff', fillOpacity: 1 }).addTo(map);
  } catch {}
}
async function openDetail(slug) {
  st.tab = 'mosques'; st.sub = 'detail'; st.detail = { slug, m: API.cached(slug) }; render();
  try { const m = await API.mosque(slug, E.addDays(today(), -1)); if (st.detail && st.detail.slug === slug) { st.detail.m = m; render(); } } catch { if (st.detail && !st.detail.m) { st.detail.err = 'Impossible de charger cette mosquée (pas de connexion ?).'; render(); } }
}
function detailView() {
  const d = st.detail, m = d && d.m;
  if (!m) return `${header('Mosquée', true)}<div class="empty">${d && d.err ? esc(d.err) : 'Chargement…'}</div>`;
  const days = E.computeDays(m, E.ymd(new Date(), m.timezone), 1)[0], main = st.main && st.main.slug === m.slug, fav = st.favs.some((f) => f.slug === m.slug);
  const photo = (m.photos || [])[0];
  return `${header('', true)}<div class="dhero">${photo ? `<img src="${esc(photo.url || photo)}" alt="">` : `<div class="dph">${LOGO(70)}</div>`}</div>
  <div class="t22 b5 mt12">${esc(m.name)}</div>${m.nameAr ? `<div class="ar g t24">${esc(m.nameAr)}</div>` : ''}<div class="mut t13">${esc([m.address, m.city].filter(Boolean).join(', '))}</div>
  <div class="row g8 mt12">${main ? '<div class="btn f1 dis">Mosquée principale</div>' : `<button class="btn f1" data-act="setmain">Choisir comme principale</button>`}<button class="btn ghost sq" data-act="fav" data-slug="${esc(m.slug)}" data-name="${esc(m.name)}" data-namear="${esc(m.nameAr || '')}">${svg('star', 20, fav ? '#e9b955' : '#a9b8dc')}</button></div>
  <div class="row g8 mt8"><button class="btn ghost f1" data-act="route">${svg('route', 18)} Itinéraire</button>${m.phone ? `<button class="btn ghost f1" data-act="call">${svg('phone', 18)} Appeler</button>` : ''}${m.donationUrl ? `<button class="btn ghost f1" data-act="don2">${svg('heart', 18)} Don</button>` : ''}</div>
  <div class="lbl mt16">Aujourd'hui</div><div class="grid3 mt8">${E.ORDER.map((k) => `<div class="card mini">${pic(k, 20)}<div class="ar t17">${E.NAMES[k].ar}</div><div class="tt t20">${days.times[k]}</div><div class="acc t11">${k === 'shuruq' ? 'lever' : 'iqama ' + days.iqama[k]}</div></div>`).join('')}</div>
  ${(m.services || []).length ? `<div class="lbl mt16">Services</div><div class="chips mt8">${m.services.map((s) => `<span class="pill">${esc(SERV[s] || s)}</span>`).join('')}</div>` : ''}
  ${m.description ? `<div class="lbl mt16">À propos</div><div class="card pad14 mt8 t14">${esc(m.description)}</div>` : ''}`;
}
// ---------- Ramadan : accueil, imsakiya ----------
const LANT = '<svg class="lant" width="24" height="56" viewBox="0 0 26 60"><path d="M13 0v14" stroke="#e9b955" stroke-width="1.2"/><path d="M6 18h14l-2 22H8z" fill="rgba(233,185,85,.25)" stroke="#e9b955"/><circle cx="13" cy="29" r="4" fill="#ffd98a"/></svg>';
function ramHome(D, now) {
  const real = isRamadan(), h = E.hijri(D.date, hOff()), im = imsakMin(), z = tz();
  const T = st.days.find((d) => d.date === E.addDays(D.date, 1));
  const imsak = E.addMin(D.times.fajr, -im), aIm = E.at(D.date, imsak, z), aIf = E.at(D.date, D.times.maghrib, z);
  const tImsak = T ? E.addMin(T.times.fajr, -im) : null, aIm2 = T ? E.at(T.date, tImsak, z) : null;
  let lab, to, sub;
  if (now < aIm) { lab = 'Fin du suhoor dans'; to = aIm; sub = `<span class="ar g">الإمساك</span> · ${imsak}`; }
  else if (now < aIf) { lab = 'Iftar dans'; to = aIf; sub = `<span class="ar g">الإفطار</span> · ${D.times.maghrib}`; }
  else { lab = 'Imsak demain dans'; to = aIm2; sub = `<span class="ar g">الإمساك</span> · ${tImsak || ''}`; }
  const pct = Math.max(0, Math.min(1, (now - aIm) / (aIf - aIm))), fasting = now >= aIm && now < aIf;
  const rs = ramStart(), dleft = real ? null : rs ? Math.round((Date.parse(rs) - Date.parse(D.date)) / 864e5) : null;
  const ban = real ? `<b class="g2">Ramadan ${h.year} · Jour ${h.day}</b><div class="mut t12">${h.day < 20 ? `Encore ${30 - h.day} jours · Dernière décade dans ${20 - h.day} jour${20 - h.day > 1 ? 's' : ''}` : h.day < 30 ? 'Dernière décade · nuits impaires : 21, 23, 25, 27, 29' : 'Dernier jour'}</div>`
    : `<b class="g2">Aperçu du mode Ramadan</b><div class="mut t12">${dleft != null ? `Le vrai Ramadan commence dans ${dleft} jours (vers le ${frDate(rs).d} ${MOIS[frDate(rs).m - 1]})` : 'Horaires du jour utilisés pour l\'aperçu'}</div>`;
  const tw = tarawih(D.date);
  let o = `<div class="rban mt10"><svg width="34" height="34" viewBox="0 0 40 40"><path d="M26 6a15 15 0 1 0 8 25A13 13 0 0 1 26 6z" fill="#e9b955"/><circle cx="31" cy="11" r="1.6" fill="#ffd98a"/></svg><div class="f1">${ban}</div>${real ? '' : '<button class="pill sm" data-act="rprev">Quitter</button>'}</div>`;
  o += `<div class="card rhero">${LANT}${LANT.replace('lant', 'lant r')}<div class="lbl" style="color:var(--mut)">${lab}</div><div class="cd" data-to="${to ? to.getTime() : 0}">${to ? E.fmtDur(to - now) : '--:--:--'}</div><div class="t17">${sub}</div>
  <div class="rbar"><b style="width:${(pct * 100).toFixed(1)}%"></b><i style="left:${(pct * 100).toFixed(1)}%"></i></div><div class="row sb mut t12"><span>Imsak ${imsak}</span><span>${fasting ? Math.round(pct * 100) + ' % du jeûne' : now >= aIf ? 'Jeûne accompli' : 'Avant le jeûne'}</span><span>Iftar ${D.times.maghrib}</span></div></div>`;
  o += `<div class="grid3"><div class="card mini"><div class="lbl" style="color:var(--mut);letter-spacing:.1em">Imsak</div><div class="tt t22 mt4">${imsak}</div><div class="mut t11">fin du suhoor</div></div><div class="card mini now"><div class="lbl" style="letter-spacing:.1em">Iftar</div><div class="tt t22 mt4">${D.times.maghrib}</div><div class="mut t11">adhan Maghrib</div></div><div class="card mini"><div class="lbl" style="color:var(--mut);letter-spacing:.1em">Tarawih</div><div class="tt t22 mt4">${tw || '—'}</div><div class="mut t11">${tw ? 'à la mosquée' : 'heure non publiée'}</div></div></div>`;
  o += `<div class="card pad14 mt10 ctr"><div class="lbl" style="color:var(--mut);letter-spacing:.12em">Invocation de la rupture du jeûne</div><div class="ar g2 t20 mt8" style="line-height:1.75">ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ</div><div class="t13 mt4" style="color:#cfd8f0">« La soif est partie, les veines sont humectées, et la récompense est acquise, si Allah le veut. »</div><div class="mut t11 mt4 ls">ABOU DAOUD · 2357</div></div>`;
  return o;
}
function ramadanView() {
  if (!st.m || !st.days) return loading();
  const L = ramDays(), t = today(), tw = L.some((d) => tarawih(d.date)), im = imsakMin();
  if (!L.length) return `${header('Ramadan', st.tab !== 'ramadan')}<div class="empty">Dates du Ramadan indisponibles.</div>`;
  const y = L[0].hijri.year, rows = st.ramOdd ? L.filter((d) => d.hijri.day >= 21 && d.hijri.day % 2) : L;
  const WD = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  let o = st.tab === 'ramadan' ? `<div class="top"><h1 class="h1">Ramadan ${y}</h1>` : `${header('Ramadan ' + y, true)}<div class="top">`;
  o += `<div class="mut t13">${esc(st.m.name)}${st.m.city ? ' · ' + esc(st.m.city) : ''}${t < L[0].date ? ` · commence le ${frDate(L[0].date).d} ${MOIS[frDate(L[0].date).m - 1]} (date indicative)` : ''}</div>
  <div class="chips mt10"><button class="pill ${st.ramOdd ? '' : 'on'}" data-act="rodd" data-v="0">Imsakiya</button><button class="pill ${st.ramOdd ? 'on' : ''}" data-act="rodd" data-v="1">Nuits impaires</button><button class="pill" data-act="rshare">⤴ Partager</button></div></div>`;
  o += `<div class="card tbl"><div class="tr th rtr ${tw ? '' : 'n4'}"><span>Jour</span><span>Imsak</span><span>Fajr</span><span>Iftar</span>${tw ? '<span>Tarawih</span>' : ''}</div>${rows.map((d) => { const g = d.date.split('-').map(Number); return `<div class="tr rtr ${tw ? '' : 'n4'} ${d.date === t ? 'cur' : ''}"><span><b>${d.hijri.day}</b> · ${WD[E.weekday(d.date)]} ${g[2]}${d.hijri.day >= 21 && d.hijri.day % 2 ? ' <i>✦</i>' : ''}</span><span>${E.addMin(d.times.fajr, -im)}</span><span>${d.times.fajr}</span><span class="g2">${d.times.maghrib}</span>${tw ? `<span>${tarawih(d.date) || '—'}</span>` : ''}</div>`; }).join('')}</div>
  <div class="mut t11 mt10">✦ Nuits impaires de la dernière décade. Imsak = ${im} min avant le Fajr. Dates selon le calendrier Umm al-Qura : la mosquée annonce le début confirmé.${tw ? '' : ' L\'heure des Tarawih apparaîtra quand la mosquée la publiera.'}</div>`;
  if (st.tab === 'ramadan') o += `<button class="lnk mt12" data-tab="events">Voir les événements de la mosquée ›</button>`;
  return o;
}
function ramText() {
  const L = ramDays(), im = imsakMin(); if (!L.length) return '';
  return `🌙 Ramadan ${L[0].hijri.year} — ${st.m.name}\nJour · Imsak · Fajr · Iftar\n` + L.map((d) => `${d.hijri.day} (${d.date.slice(8)}/${d.date.slice(5, 7)}) · ${E.addMin(d.times.fajr, -im)} · ${d.times.fajr} · ${d.times.maghrib}${tarawih(d.date) ? ' · Tarawih ' + tarawih(d.date) : ''}`).join('\n') + '\n\nApplication Nidaa';
}
// ---------- Son de l'adhan ----------
let audio = null, playing = null;
function playVoice(k) {
  try { if (audio) { audio.pause(); audio = null; } } catch {}
  if (playing === k) { playing = null; render(); return; }
  if (k === 'vibreur') { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); return; }
  const f = N.SOUNDS[k]; if (!f) return;
  audio = new Audio(f); playing = k; audio.onended = () => { playing = null; render(); }; audio.play().catch(() => { playing = null; render(); }); render();
}
function soundView() {
  const n = st.notif, g = n.voice || N.defaultVoice(), V = N.VOICES, voiceCount = V.filter((v) => !v.always && v.k !== 'discret').length;
  const opt = (k, cur) => { const L = [['auto', k === 'fajr' && N.SOUNDS.fajr ? 'Adhan du Fajr' : 'Voix générale'], ...V.map((v) => [v.k, v.n])]; return L.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join(''); };
  let o = `${header("Son de l'adhan", true)}<div class="lbl mt8">Voix</div>`;
  o += V.map((v) => `<div class="card voice ${g === v.k ? 'on' : ''}"><button class="row g12 f1 tl" data-act="voice" data-v="${v.k}"><span class="rd"></span><div class="f1"><div class="t15 b5">${esc(v.n)}</div><div class="mut t12">${esc(v.d)}</div></div></button>${v.k !== 'defaut' ? `<button class="play" data-act="play" data-v="${v.k}">${playing === v.k ? '❚❚' : '▶'}</button>` : ''}</div>`).join('');
  if (!voiceCount) o += `<div class="off mt8">Les voix d'adhan (La Mecque, Médine…) apparaîtront dès que leurs enregistrements seront ajoutés à l'application.</div>`;
  o += `<div class="lbl mt16">Par prière</div><div class="card pad14 mt8">${E.PRAYERS.map((k) => { const s = n[k] || {}; return `<div class="row g10 vrow"><span class="ar g t18" style="width:56px">${E.NAMES[k].ar}</span><span class="f1 t14">${E.NAMES[k].fr}</span>${s.on === false ? '<span class="mut t12">désactivé</span>' : `<select class="vsel" data-k="${k}">${opt(k, s.voice || 'auto')}</select>`}</div>`; }).join('')}</div>`;
  o += `<div class="lbl mt16">Ramadan</div><div class="card pad14 mt8"><div class="row g10 vrow" style="border:0"><span class="f1 t14">Réveil pour le suhoor</span><select class="vsel" data-k="suhoor">${[[0, 'Désactivé'], [30, '30 min avant l\'imsak'], [45, '45 min avant l\'imsak'], [60, '1 h avant l\'imsak'], [90, '1 h 30 avant l\'imsak']].map(([v, l]) => `<option value="${v}" ${(n.suhoor ?? 45) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
  <div class="mut t11 mt10">Le volume suit celui des notifications du téléphone. Sur certains téléphones, il faut aussi autoriser le son dans Réglages › Notifications › Nidaa.</div>`;
  return o;
}
function more() {
  if (st.sub === 'notif') return notifView();
  if (st.sub === 'qibla') return qiblaView();
  if (st.sub === 'cal') return calView();
  if (st.sub === 'tasbih') return tasbihView();
  if (st.sub === 'sound') return soundView();
  if (st.sub === 'ram') return ramadanView();
  const h = st.days && st.days.find((d) => d.date === today());
  let rama = '';
  if (h) { for (let i = 0; i < 400; i++) { const x = E.hijri(E.addDays(today(), i), (st.m && st.m.prayerConfig && st.m.prayerConfig.hijriOffsetDays) || 0); if (x.month === 9 && x.day === 1) { rama = i === 0 ? "C'est le 1er jour de Ramadan" : `Ramadan dans <b class="g2">${i} jours</b>`; break; } } }
  const T = [['notif', 'bell', 'Notifications', 'Adhan et rappels'], ['sound', 'sound', "Son de l'adhan", 'Voix, par prière'], ['ram', 'moon', 'Ramadan', 'Imsakiya du mois'], ['qibla', 'compass', 'Qibla', 'Direction de La Mecque'], ['cal', 'moon', 'Calendrier hégirien', 'Aïd, dates clés'], ['tasbih', 'beads', 'Tasbih', 'Compteur']];
  return `<div class="top"><h1 class="h1">Plus</h1></div><div class="grid2">${T.map(([k, i, t, s]) => `<button class="card tile" data-sub="${k}" data-tab="more">${svg(i, 26, '#e9b955')}<div class="t15 b5 mt6">${t}</div><div class="mut t12">${s}</div></button>`).join('')}</div>
  ${st.m && st.m.donationUrl ? `<button class="card don mt12" data-act="don">${svg('heart', 22, '#e9b955')}<div class="f1"><div class="t15 b5">Faire un don</div><div class="mut t12">${esc(st.m.name)}</div></div><span class="g">›</span></button>` : ''}
  ${rama ? `<button class="card pad14 mt12 row g12 tl" data-tab="more" data-sub="ram" style="border-color:rgba(127,227,187,.4)"><div class="ar t24" style="color:#7fe3bb">رمضان</div><div class="t14 f1">${rama}</div><span class="g">›</span></button>` : ''}
  ${isRamadan() ? '' : `<div class="card pad14 mt12"><button class="row g10 w100" data-act="rprev"><div class="f1 tl"><div class="t15 b5">Aperçu du mode Ramadan</div><div class="mut t12">Pour découvrir l'écran avant le mois</div></div>${sw(st.ramPreview)}</button></div>`}
  <div class="card pad14 mt12 row g12">${LOGO(30)}<div class="f1"><div class="t14 b5">Nidaa</div><div class="mut t12">Les horaires réels de votre mosquée. Sans publicité.</div></div><div class="mut t12">v1.0</div></div>`;
}
function sw(on) { return `<span class="sw ${on ? 'on' : ''}"><i></i></span>`; }
function notifView() {
  const n = st.notif;
  return `${header('Notifications', true)}<div class="mut t13">${st.m ? esc(st.m.name) + ' · ' : ''}réglez chaque prière</div>${N.native ? '' : '<div class="off mt8">Les notifications fonctionnent dans l\'application installée.</div>'}
  ${E.PRAYERS.map((k) => { const s = n[k] || {}, on = s.on !== false, rem = s.reminder ?? 10; return `<div class="card pad14 mt10"><button class="row g10 w100" data-act="non" data-k="${k}">${pic(k, 26)}<div class="f1 t15 b5 tl">${E.NAMES[k].fr} <span class="ar g">${E.NAMES[k].ar}</span></div>${sw(on)}</button>${on ? `<div class="chips mt8"><span class="mut t12">Rappel avant l'iqama :</span>${[0, 5, 10, 15].map((v) => `<button class="pill sm ${rem === v ? 'on' : ''}" data-act="rem" data-k="${k}" data-v="${v}">${v ? v + ' min' : 'non'}</button>`).join('')}</div>` : ''}</div>`; }).join('')}
  <div class="card pad14 mt10"><button class="row g10 w100" data-act="kahf"><div class="f1 tl"><div class="t15 b5">Al-Kahf le vendredi</div><div class="mut t12">Rappel à 9:00</div></div>${sw(n.kahf !== false)}</button></div>`;
}
function qiblaView() {
  const p = st.pos || (st.m ? { lat: st.m.latitude, lng: st.m.longitude } : { lat: 11.588, lng: 43.145 });
  const q = E.qibla(p.lat, p.lng), d = Math.round(E.distKm(p.lat, p.lng, 21.4225, 39.8262)), hd = st.heading;
  const rot = hd == null ? q : q - hd, ok = hd != null && Math.abs(((rot + 540) % 360) - 180) < 4;
  return `${header('Qibla', true)}<div class="card qb ${ok ? 'ok' : ''}"><svg width="300" height="300" viewBox="0 0 300 300"><g id="rose" transform="rotate(${hd == null ? 0 : -hd} 150 150)"><circle cx="150" cy="150" r="128" fill="none" stroke="rgba(233,185,85,.3)" stroke-width="2"/><circle cx="150" cy="150" r="106" fill="none" stroke="rgba(255,255,255,.08)" stroke-dasharray="2 6"/>${['N', 'E', 'S', 'O'].map((t, i) => { const a = (i * 90 - 90) * Math.PI / 180; return `<text x="${150 + 142 * Math.cos(a)}" y="${156 + 142 * Math.sin(a)}" fill="${t === 'N' ? '#ff9f8a' : '#a9b8dc'}" font-size="15" text-anchor="middle">${t}</text>`; }).join('')}<g transform="rotate(${q} 150 150)"><path d="M150 34 L162 150 L150 166 L138 150Z" fill="#e9b955"/><path d="M150 266 L162 150 L138 150Z" fill="rgba(255,255,255,.18)"/><rect x="139" y="14" width="22" height="22" rx="3" fill="#111" stroke="#e9b955" stroke-width="2"/></g></g><circle cx="150" cy="150" r="6" fill="#fff"/></svg>
  <div class="t15 mt8">La Mecque · <b class="g2">${Math.round(q)}°</b> · ${d.toLocaleString('fr-FR')} km</div><div class="mut t12 mt4">${hd == null ? 'Boussole indisponible : orientez-vous avec l\'angle depuis le nord.' : ok ? 'Vous êtes face à la Qibla' : 'Tournez le téléphone jusqu\'à aligner la flèche dorée'}</div></div>`;
}
function calView() {
  const off = (st.m && st.m.prayerConfig && st.m.prayerConfig.hijriOffsetDays) || 0, t = today(), h = E.hijri(t, off);
  const EV = [[1, 1, 'Nouvel an hégirien', 'رأس السنة'], [1, 10, 'Achoura', 'عاشوراء'], [3, 12, 'Mawlid', 'المولد'], [7, 27, "Isra' wal-Mi'raj", 'الإسراء والمعراج'], [8, 15, "Mi-Cha'ban", 'ليلة النصف'], [9, 1, 'Début du Ramadan', 'رمضان'], [9, 27, 'Laylat al-Qadr (27)', 'ليلة القدر'], [10, 1, 'Aïd al-Fitr', 'عيد الفطر'], [12, 9, 'Jour de Arafat', 'يوم عرفة'], [12, 10, 'Aïd al-Adha', 'عيد الأضحى']];
  const found = []; for (let i = 0; i < 380 && found.length < EV.length; i++) { const dt = E.addDays(t, i), x = E.hijri(dt, off); const e = EV.find((v) => v[0] === x.month && v[1] === x.day); if (e && !found.some((f) => f.e === e)) found.push({ e, dt, i }); }
  return `${header('Calendrier hégirien', true)}<div class="card hero2"><div class="ar g2" style="font-size:40px">${E.arDigits(h.day)} ${h.ar}</div><div class="t17">${h.day} ${h.fr} ${h.year}</div><div class="mut t12 mt4">${frDate(t).wd} ${frDate(t).txt}</div></div>
  <div class="lbl mt16">Prochaines dates</div>${found.map(({ e, dt, i }) => { const f = frDate(dt); return `<div class="card ev mt8"><div class="evd"><div class="g t11 ls">${MOIS[f.m - 1].slice(0, 3).toUpperCase()}</div><div class="t22 b5">${f.d}</div></div><div class="f1"><div class="t15 b5">${e[2]}</div><div class="ar g t17">${e[3]}</div><div class="mut t12">${i === 0 ? "aujourd'hui" : 'dans ' + i + ' jour' + (i > 1 ? 's' : '')} · ${e[1]} ${E.HIJRI_FR[e[0] - 1]}</div></div></div>`; }).join('')}<div class="mut t11 mt10 ctr">Dates indicatives (calendrier Umm al-Qura). La mosquée annonce les dates confirmées.</div>`;
}
function tasbihView() {
  const n = st.tasbih, step = n < 33 ? 0 : n < 66 ? 1 : n < 100 ? 2 : 3, W = [['سُبْحَانَ اللّٰه', 'Gloire à Allah'], ['الْحَمْدُ لِلّٰه', 'Louange à Allah'], ['اللّٰهُ أَكْبَر', 'Allah est le plus grand'], ['لَا إِلٰهَ إِلَّا اللّٰه', "Pas de divinité sauf Allah"]][step];
  const goal = [33, 66, 100, 100][step], base = [0, 33, 66, 100][step];
  return `${header('Tasbih', true)}<button class="tasb" data-act="tap"><div class="ar g2" style="font-size:44px">${W[0]}</div><div class="t15 mt4">${W[1]}</div><div class="tt" style="font-size:96px;margin-top:10px">${n}</div><div class="mut t13">${step < 3 ? `${n - base} / ${goal - base}` : 'Terminé · 100'}</div><div class="mut t12 mt10">Touchez n'importe où</div></button><button class="btn ghost w100 mt12" data-act="treset">Remettre à zéro</button>`;
}

// ---------- rendu & évènements ----------
function render() {
  const app = $('#app');
  if (!st.main) { app.className = 'onbw'; app.innerHTML = onboarding(); bindSearch(); return; }
  const V = { home, times, events: eventsView, ramadan: ramadanView, mosques: mosquesView, more }[st.tab] || home;
  app.className = '';
  app.innerHTML = `<main class="scr" id="scr">${V()}</main>${tabbar()}`;
  if (st.tab === 'mosques' && st.sub !== 'detail') { bindSearch(); setTimeout(initMap, 0); }
}
let qT = null;
function bindSearch() {
  const q = $('#q'); if (!q) return;
  q.addEventListener('input', () => { st.search.q = q.value; clearTimeout(qT); qT = setTimeout(() => doSearch({ q: q.value.trim() || null }), 350); });
}
async function doSearch(args) {
  st.search.loading = true; st.search.error = null; st.search.near = !!args.lat; updRes();
  try { st.search.list = await API.search(args); if (args.lat) st.search.list.sort((x, y) => noPos(x) - noPos(y)); if (args.lat) st.search.center = { lat: args.lat, lng: args.lng }; }
  catch { st.search.error = 'Pas de connexion. Réessayez dans un instant.'; }
  st.search.loading = false; updRes(); if (st.tab === 'mosques') initMap();
}
function updRes() { const r = $('#res'); if (r) r.innerHTML = resultList(st.search.list); }
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-tab],[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (t.dataset.tab) { st.tab = t.dataset.tab; st.sub = t.dataset.sub || null; render(); $('#scr') && ($('#scr').scrollTop = 0); if (st.sub === 'qibla') startCompass(); return; }
  if (a === 'back') { st.sub = null; st.detail = null; render(); return; }
  if (a === 'near') { const p = await N.position(); if (!p) { st.search.error = 'Position indisponible. Autorisez la localisation ou cherchez par nom.'; updRes(); return; } st.pos = p; S.set('pos', p); doSearch({ lat: p.lat, lng: p.lng, radiusKm: 15 }); return; }
  if (a === 'fav') { ev.stopPropagation(); const s = t.dataset.slug, i = st.favs.findIndex((f) => f.slug === s); if (i >= 0) st.favs.splice(i, 1); else st.favs.push({ slug: s, name: t.dataset.name, nameAr: t.dataset.namear || null }); S.set('favs', st.favs); if (!st.main) { const m = st.search.list.find((x) => x.slug === s) || { slug: s, name: t.dataset.name }; setMain(m); } else render(); return; }
  if (a === 'open') { if (!st.main) { const m = st.search.list.find((x) => x.slug === t.dataset.slug); if (m) setMain(m); return; } openDetail(t.dataset.slug); return; }
  if (a === 'setmain' && st.detail && st.detail.m) { setMain(st.detail.m); return; }
  if (a === 'route' && st.detail && st.detail.m) { const m = st.detail.m; N.open(`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`); return; }
  if (a === 'call' && st.detail && st.detail.m) { location.href = 'tel:' + st.detail.m.phone; return; }
  if (a === 'don') { N.open(st.m && st.m.donationUrl); return; }
  if (a === 'don2') { N.open(st.detail && st.detail.m && st.detail.m.donationUrl); return; }
  if (a === 'tv') { st.timesView = t.dataset.v; st.monthOff = 0; render(); return; }
  if (a === 'mo') { st.monthOff += +t.dataset.d; render(); return; }
  if (a === 'evf') { st.evFilter = t.dataset.v; render(); return; }
  if (a === 'bell' || a === 'non') { const k = t.dataset.k, s = st.notif[k] || {}; s.on = s.on === false; st.notif[k] = s; S.set('notif', st.notif); render(); reschedule(); return; }
  if (a === 'rem') { const k = t.dataset.k, s = st.notif[k] || {}; s.reminder = +t.dataset.v; st.notif[k] = s; S.set('notif', st.notif); render(); reschedule(); return; }
  if (a === 'kahf') { st.notif.kahf = st.notif.kahf === false; S.set('notif', st.notif); render(); reschedule(); return; }
  if (a === 'tap') { st.tasbih = st.tasbih >= 100 ? 0 : st.tasbih + 1; S.set('tasbih', st.tasbih); if (navigator.vibrate) navigator.vibrate([33, 66, 100].includes(st.tasbih) ? 120 : 12); render(); return; }
  if (a === 'treset') { st.tasbih = 0; S.set('tasbih', 0); render(); return; }
  if (a === 'rprev') { st.ramPreview = !st.ramPreview; S.set('ramPreview', st.ramPreview); if (!ramOn() && st.tab === 'ramadan') st.tab = 'home'; render(); return; }
  if (a === 'rodd') { st.ramOdd = t.dataset.v === '1'; render(); return; }
  if (a === 'rshare') { const txt = ramText(); if (navigator.share) { navigator.share({ text: txt }).catch(() => {}); } else N.open('https://wa.me/?text=' + encodeURIComponent(txt)); return; }
  if (a === 'voice') { st.notif.voice = t.dataset.v; S.set('notif', st.notif); render(); reschedule(); return; }
  if (a === 'play') { playVoice(t.dataset.v); return; }
});
document.addEventListener('change', (ev) => {
  const t = ev.target; if (!t.classList || !t.classList.contains('vsel')) return;
  const k = t.dataset.k;
  if (k === 'suhoor') st.notif.suhoor = +t.value; else { const s = st.notif[k] || {}; s.voice = t.value; st.notif[k] = s; }
  S.set('notif', st.notif); reschedule();
});
let compassOn = false;
function startCompass() {
  if (compassOn) return; compassOn = true;
  N.position().then((p) => { if (p) { st.pos = p; S.set('pos', p); if (st.sub === 'qibla') render(); } });
  const h = (e) => { let v = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null ? 360 - e.alpha : null; if (v == null) return; st.heading = v; if (st.sub === 'qibla') { const r = $('#rose'); if (r) { const q = E.qibla((st.pos || st.m || {}).lat || (st.m && st.m.latitude) || 11.588, (st.pos || {}).lng || (st.m && st.m.longitude) || 43.145); r.setAttribute('transform', `rotate(${-v} 150 150)`); const ok = Math.abs((((q - v) + 540) % 360) - 180) < 4; $('.qb') && $('.qb').classList.toggle('ok', ok); } } };
  window.addEventListener('deviceorientationabsolute', h); window.addEventListener('deviceorientation', h);
}
// Tick : compte à rebours chaque seconde sans tout redessiner
let lastMin = -1;
setInterval(() => {
  if (!st.days || !st.m) return;
  const now = new Date(), nx = E.nextPrayer(st.days, now, tz()), cd = $('#cd');
  if (cd && nx) cd.textContent = E.fmtDur(nx.phase === 'before' ? nx.adhan - now : nx.iqama - now);
  document.querySelectorAll('[data-to]').forEach((el) => { const v = +el.dataset.to; if (v) el.textContent = E.fmtDur(v - now); });
  const m = now.getMinutes();
  if (m !== lastMin) { if (lastMin !== -1 && (st.tab === 'home' || st.tab === 'times') && !st.sub) { const sc = $('#scr'), y = sc ? sc.scrollTop : 0; if (!st.days.some((d) => d.date === E.addDays(today(), 1))) recompute(); render(); const s2 = $('#scr'); if (s2) s2.scrollTop = y; } lastMin = m; }
}, 1000);
// Mise à jour : à l'ouverture, au retour dans l'app, et toutes les 2 min si la version change
N.onResume(() => loadMain(true));
N.onBack(() => { if (st.sub) { st.sub = null; st.detail = null; render(); } else if (st.tab !== 'home') { st.tab = 'home'; render(); } });
let ver = null;
setInterval(async () => { if (!st.main || document.hidden) return; const v = await API.version(st.main.slug); if (v != null && ver != null && v !== ver) loadMain(true); if (v != null) ver = v; }, 120000);
// Styles du mode Ramadan et du son intégrés ici : l'écran reste correct même si app.css n'est pas à jour
(() => { try { const el = document.createElement('style'); el.textContent = '.rban{display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,rgba(233,185,85,.22),rgba(233,185,85,.06));border:1px solid rgba(233,185,85,.35);border-radius:16px;padding:9px 12px;font-size:14px}.rhero{margin-top:12px;text-align:center;padding:18px 16px 14px;position:relative;overflow:hidden;border-radius:26px}.rhero .lant{position:absolute;top:-4px;left:20px;width:24px}.rhero .lant.r{left:auto;right:20px;top:4px}.rhero .cd{margin-top:2px}.rhero .ar{font-size:19px}.rbar{height:8px;border-radius:5px;background:rgba(255,255,255,.1);margin:12px 4px 6px;position:relative}.rbar b{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:linear-gradient(90deg,#86b2ff,#e9b955)}.rbar i{position:absolute;top:-5px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#ffd98a;box-shadow:0 0 12px #e9b955}.rtr{grid-template-columns:96px repeat(4,1fr)}.rtr.n4{grid-template-columns:110px repeat(3,1fr)}.rtr span:first-child{white-space:nowrap}.voice{display:flex;align-items:center;gap:8px;padding:9px 12px;margin-top:8px}.voice.on{border-color:var(--g);background:linear-gradient(160deg,rgba(233,185,85,.18),rgba(14,30,72,.5))}.rd{width:20px;height:20px;border-radius:50%;border:2px solid #6c7ca8;flex:none}.voice.on .rd{border-color:var(--g);box-shadow:inset 0 0 0 4px #0b1c46;background:var(--g)}.play{width:34px;height:34px;border-radius:50%;background:rgba(233,185,85,.15);border:1px solid rgba(233,185,85,.4);display:flex;align-items:center;justify-content:center;color:var(--g);font-size:12px;flex:none}.vrow{padding:8px 0;border-bottom:1px solid var(--l2)}.vrow:last-child{border:0}.vsel{background:rgba(6,14,36,.8);color:var(--g2);border:1px solid var(--ln);border-radius:10px;padding:6px 8px;font:inherit;font-size:12.5px;max-width:170px}'; document.head.appendChild(el); } catch {} })();
window.__nidaa = st;
render(); loadMain(true);
if (st.main) API.version(st.main.slug).then((v) => { ver = v; });
