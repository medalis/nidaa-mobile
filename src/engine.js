// Moteur d'horaires — reproduit exactement celui du site et de l'écran Nidaa (adhan-js).
import { Coordinates, CalculationMethod, PrayerTimes, Madhab, HighLatitudeRule } from 'adhan';

export const ORDER = ['fajr', 'shuruq', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const NAMES = {
  fajr: { fr: 'Fajr', ar: 'الفجر' }, shuruq: { fr: 'Shuruq', ar: 'الشروق' }, dhuhr: { fr: 'Dhuhr', ar: 'الظهر' },
  asr: { fr: 'Asr', ar: 'العصر' }, maghrib: { fr: 'Maghrib', ar: 'المغرب' }, isha: { fr: 'Isha', ar: 'العشاء' },
};
export const HIJRI_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
export const HIJRI_FR = ["Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani", "Joumada al-oula", "Joumada al-akhira", "Rajab", "Cha'ban", "Ramadan", "Chawwal", "Dhou al-Qi'da", "Dhou al-Hijja"];

const p2 = (n) => String(n).padStart(2, '0');
const fmtCache = new Map();
export function parts(date, tz) {
  let f = fmtCache.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }); fmtCache.set(tz, f); }
  const o = {}; for (const x of f.formatToParts(date)) if (x.type !== 'literal') o[x.type] = x.value;
  return { year: +o.year, month: +o.month, day: +o.day, hour: +o.hour === 24 ? 0 : +o.hour, minute: +o.minute, second: +o.second, weekday: o.weekday };
}
export const hm = (date, tz) => { const r = parts(date, tz); return `${p2(r.hour)}:${p2(r.minute)}`; };
export const ymd = (date, tz) => { const r = parts(date, tz); return `${r.year}-${p2(r.month)}-${p2(r.day)}`; };
export function addMin(t, m) { const [h, mi] = t.split(':').map(Number); const v = ((h * 60 + mi + m) % 1440 + 1440) % 1440; return `${p2(Math.floor(v / 60))}:${p2(v % 60)}`; }
function offset(d, tz) { const r = parts(d, tz); return Date.UTC(r.year, r.month - 1, r.day, r.hour, r.minute, r.second) - Math.floor(d.getTime() / 1000) * 1000; }
// "2026-11-25" + "11:55" dans le fuseau de la mosquée -> Date
export function at(date, time, tz) {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const u = new Date(Date.UTC(y, mo - 1, d, h, mi)), o = offset(u, tz); let v = new Date(u.getTime() - o);
  const o2 = offset(v, tz); if (o2 !== o) v = new Date(u.getTime() - o2); return v;
}
export function addDays(date, n) { const [y, m, d] = date.split('-').map(Number); const g = new Date(Date.UTC(y, m - 1, d + n, 12)); return `${g.getUTCFullYear()}-${p2(g.getUTCMonth() + 1)}-${p2(g.getUTCDate())}`; }
export function weekday(date) { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); }

function params(c) {
  const M = { MWL: 'MuslimWorldLeague', UmmAlQura: 'UmmAlQura', Egyptian: 'Egyptian', Karachi: 'Karachi', Dubai: 'Dubai', Kuwait: 'Kuwait', Qatar: 'Qatar', Singapore: 'Singapore', Tehran: 'Tehran', Turkey: 'Turkey', NorthAmerica: 'NorthAmerica', MoonsightingCommittee: 'MoonsightingCommittee', Custom: 'Other' };
  const r = (CalculationMethod[M[c.method]] || CalculationMethod.MuslimWorldLeague)();
  if (c.fajrAngle != null) r.fajrAngle = c.fajrAngle;
  if (c.ishaAngle != null) { r.ishaAngle = c.ishaAngle; r.ishaInterval = 0; }
  if (c.ishaIntervalMin != null) r.ishaInterval = c.ishaIntervalMin;
  r.madhab = c.asrMadhhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const H = { MiddleOfTheNight: HighLatitudeRule.MiddleOfTheNight, SeventhOfTheNight: HighLatitudeRule.SeventhOfTheNight, TwilightAngle: HighLatitudeRule.TwilightAngle }[c.highLatitudeRule];
  if (H) r.highLatitudeRule = H;
  return r;
}
export function hijri(date, off = 0) {
  const [y, m, d] = date.split('-').map(Number), u = new Date(Date.UTC(y, m - 1, d, 12) + off * 864e5);
  const f = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
  const o = {}; for (const x of f.formatToParts(u)) if (x.type !== 'literal') o[x.type] = parseInt(x.value, 10);
  return { day: o.day, month: o.month, year: o.year, ar: HIJRI_AR[o.month - 1], fr: HIJRI_FR[o.month - 1] };
}
// Délai Jumu'a : stocké « HH:MM » < 03:00 = minutes après l'adhan de Dhuhr (30 par défaut)
export function jumuaDelay(slot) {
  if (!slot) return 30; const v = slot.prayerTime || slot.prayer_time || '';
  const m = /^(\d{2}):(\d{2})$/.exec(v); if (m && +m[1] < 3) return +m[1] * 60 + +m[2]; return 30;
}

export function computeDays(mosque, from, count) {
  const c = mosque.prayerConfig || {}, adj = c.adjustments || {}, tz = mosque.timezone || 'Africa/Djibouti';
  const rules = mosque.iqamaRules || [], ov = {};
  for (const o of mosque.overrides || []) ov[o.date] = o;
  const jslot = (mosque.jumua || [])[0] || null, jd = jumuaDelay(jslot), out = [];
  const coords = new Coordinates(Number(mosque.latitude), Number(mosque.longitude)), prm = params(c);
  for (let i = 0; i < count; i++) {
    const date = addDays(from, i), [y, m, d] = date.split('-').map(Number);
    const pt = new PrayerTimes(coords, new Date(Date.UTC(y, m - 1, d, 12)), prm);
    const t = { fajr: hm(pt.fajr, tz), shuruq: hm(pt.sunrise, tz), dhuhr: hm(pt.dhuhr, tz), asr: hm(pt.asr, tz), maghrib: hm(pt.maghrib, tz), isha: hm(pt.isha, tz) };
    for (const k of ORDER) t[k] = addMin(t[k], adj[k] || 0);
    const o = ov[date];
    if (o && o.times) for (const k of Object.keys(o.times)) if (o.times[k]) t[k] = o.times[k];
    const iq = {};
    for (const k of PRAYERS) {
      const r = rules.find((x) => x.prayer === k);
      iq[k] = r ? (r.mode === 'fixed' && (r.fixedTime || r.fixed_time) ? (r.fixedTime || r.fixed_time) : addMin(t[k], r.delayMin ?? r.delay_min ?? 0)) : addMin(t[k], k === 'maghrib' ? 5 : 15);
    }
    if (o && o.iqama) for (const k of PRAYERS) if (o.iqama[k]) iq[k] = o.iqama[k];
    const friday = weekday(date) === 5 && !!jslot;
    if (friday) iq.dhuhr = addMin(t.dhuhr, jd);
    out.push({ date, times: t, iqama: iq, friday, hijri: hijri(date, c.hijriOffsetDays || 0) });
  }
  return out;
}

// Prochaine prière (adhan) et état en cours (entre adhan et iqama)
export function nextPrayer(days, now, tz) {
  const today = ymd(now, tz), i = days.findIndex((d) => d.date === today);
  if (i < 0) return null;
  for (let j = i; j < Math.min(days.length, i + 2); j++) {
    const D = days[j];
    for (const k of PRAYERS) {
      const a = at(D.date, D.times[k], tz), q = at(D.date, D.iqama[k], tz);
      if (now < a) return { key: k, day: D, adhan: a, iqama: q, phase: 'before' };
      if (now < q) return { key: k, day: D, adhan: a, iqama: q, phase: 'iqama' };
    }
  }
  return null;
}
export function fmtDur(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`; }
export function arDigits(s) { return String(s).replace(/[0-9]/g, (c) => '٠١٢٣٤٥٦٧٨٩'[+c]); }
// Qibla (grand cercle) depuis lat/lng, en degrés depuis le nord
export function qibla(lat, lng) {
  const K = [21.4225, 39.8262], r = Math.PI / 180, f1 = lat * r, f2 = K[0] * r, dl = (K[1] - lng) * r;
  const b = Math.atan2(Math.sin(dl), Math.cos(f1) * Math.tan(f2) - Math.sin(f1) * Math.cos(dl));
  return (b / r + 360) % 360;
}
export function distKm(a, b, c, d) { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); }
