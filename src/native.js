// Fonctions natives (notifications, position, liens) — sans effet dans un navigateur de test
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PRAYERS, NAMES, at, addMin } from './engine.js';

export const native = Capacitor.isNativePlatform();

export async function position() {
  try {
    if (native) { await Geolocation.requestPermissions(); const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 }); return { lat: p.coords.latitude, lng: p.coords.longitude }; }
    return await new Promise((res) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 8000 }) : res(null));
  } catch { return null; }
}
export async function open(url) { if (!url) return; if (native && /^https?:/.test(url)) await Browser.open({ url }); else window.open(url, '_blank'); }
export function onResume(fn) { if (native) App.addListener('resume', fn); else document.addEventListener('visibilitychange', () => { if (!document.hidden) fn(); }); }
export function onBack(fn) { if (native) App.addListener('backButton', fn); }

// ---------- Sons de l'adhan ----------
// eslint-disable-next-line no-undef
export const SOUNDS = (typeof __SOUNDS__ !== 'undefined' && __SOUNDS__) || {};
export const VOICES = [
  { k: 'makkah', n: 'La Mecque', d: 'Adhan complet' },
  { k: 'madinah', n: 'Médine', d: 'Adhan complet' },
  { k: 'locale', n: 'Mosquée locale', d: 'Voix de votre muezzin' },
  { k: 'court', n: 'Court', d: '« Allahu akbar » seulement' },
  { k: 'discret', n: 'Son discret', d: 'Carillon doux · bureau, réunion' },
  { k: 'defaut', n: 'Son du téléphone', d: 'Notification habituelle', always: true },
  { k: 'vibreur', n: 'Vibreur', d: 'Sans son', always: true },
].filter((v) => v.always || SOUNDS[v.k]);
export const defaultVoice = () => (SOUNDS.makkah ? 'makkah' : SOUNDS.madinah ? 'madinah' : SOUNDS.locale ? 'locale' : 'defaut');
// Voix effective d'une prière : réglage de la prière, sinon voix générale (le Fajr prend l'adhan du Fajr s'il existe)
export function voiceFor(k, settings) {
  const s = (settings && settings[k]) || {}, g = (settings && settings.voice) || defaultVoice();
  let v = s.voice && s.voice !== 'auto' ? s.voice : g;
  if (k === 'fajr' && (!s.voice || s.voice === 'auto') && SOUNDS.fajr && ['makkah', 'madinah', 'locale'].includes(g)) v = 'fajr';
  if (v !== 'defaut' && v !== 'vibreur' && !SOUNDS[v]) v = 'defaut';
  return v;
}
const chanOf = (v) => (v === 'defaut' ? 'adhan' : 'nidaa_' + v);
let channelsDone = false;
async function channels() {
  if (channelsDone) return; channelsDone = true;
  const mk = async (o) => { try { await LocalNotifications.createChannel(o); } catch {} };
  await mk({ id: 'adhan', name: 'Adhan · son du téléphone', description: "Heure de l'adhan", importance: 5, visibility: 1, vibration: true });
  await mk({ id: 'rappel', name: "Rappels d'iqama et suhoor", importance: 4, visibility: 1 });
  for (const v of VOICES) if (v.k !== 'defaut') await mk({ id: chanOf(v.k), name: 'Adhan · ' + v.n, importance: 5, visibility: 1, vibration: true, sound: v.k === 'vibreur' ? (SOUNDS.silence || undefined) : SOUNDS[v.k] });
  if (SOUNDS.fajr) await mk({ id: chanOf('fajr'), name: 'Adhan du Fajr', importance: 5, visibility: 1, vibration: true, sound: SOUNDS.fajr });
}

// Programme les notifications des 7 prochains jours pour la mosquée principale
// opts : { imsakMin, ramadan(date) -> bool }
export async function schedule(mosque, days, settings, opts = {}) {
  if (!native || !mosque || !days) return { ok: false };
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return { ok: false, denied: true };
    await channels();
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    const tz = mosque.timezone, now = Date.now(), list = [], imsakMin = opts.imsakMin ?? 10;
    days.slice(0, 8).forEach((D, di) => {
      const ram = opts.ramadan ? opts.ramadan(D) : false;
      PRAYERS.forEach((k, ki) => {
        const s = settings[k] || {}; if (s.on === false) return;
        const jum = k === 'dhuhr' && D.friday, nm = jum ? "Jumu'a" : NAMES[k].fr, ar = jum ? 'الجمعة' : NAMES[k].ar;
        const a = at(D.date, D.times[k], tz), v = voiceFor(k, settings), snd = v === 'defaut' ? undefined : v === 'vibreur' ? SOUNDS.silence : SOUNDS[v];
        const title = ram && k === 'maghrib' ? `Maghrib · المغرب — l'heure de l'iftar` : `${nm} · ${ar}`;
        if (a.getTime() > now) list.push({ id: 1000 + di * 20 + ki * 2, channelId: chanOf(v), sound: snd, title, body: `C'est l'heure de l'adhan à ${mosque.name} (${D.times[k]})`, schedule: { at: a, allowWhileIdle: true }, smallIcon: 'ic_stat_nidaa' });
        const rem = s.reminder ?? 10;
        if (rem > 0) {
          const r = new Date(at(D.date, D.iqama[k], tz).getTime() - rem * 60000);
          if (r.getTime() > now && r > a) list.push({ id: 1001 + di * 20 + ki * 2, channelId: 'rappel', title: `Iqama de ${nm} dans ${rem} min`, body: `${mosque.name} · iqama à ${D.iqama[k]}`, schedule: { at: r, allowWhileIdle: true }, smallIcon: 'ic_stat_nidaa' });
        }
      });
      if (settings.kahf !== false && D.friday) {
        const r = at(D.date, '09:00', tz);
        if (r.getTime() > now) list.push({ id: 1018 + di * 20, channelId: 'rappel', title: 'Vendredi · sourate Al-Kahf', body: "N'oubliez pas de lire la sourate Al-Kahf aujourd'hui.", schedule: { at: r, allowWhileIdle: true }, smallIcon: 'ic_stat_nidaa' });
      }
      const su = settings.suhoor ?? 45;
      if (ram && su > 0) {
        const imsak = addMin(D.times.fajr, -imsakMin), r = new Date(at(D.date, imsak, tz).getTime() - su * 60000);
        if (r.getTime() > now) list.push({ id: 1019 + di * 20, channelId: 'rappel', title: 'Suhoor · السحور', body: `Imsak à ${imsak} (dans ${su} min) · ${mosque.name}`, schedule: { at: r, allowWhileIdle: true }, smallIcon: 'ic_stat_nidaa' });
      }
    });
    if (list.length) await LocalNotifications.schedule({ notifications: list });
    return { ok: true, count: list.length };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// Widgets de l'écran d'accueil (Android)
const Widget = registerPlugin('NidaaWidget');
export async function widgets(payload) { if (!native) return; try { await Widget.update({ data: JSON.stringify(payload) }); } catch {} }

if (native) { try { StatusBar.setStyle({ style: Style.Dark }); StatusBar.setBackgroundColor({ color: '#060f29' }); } catch {} }
