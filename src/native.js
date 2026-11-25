// Fonctions natives (notifications, position, liens) — sans effet dans un navigateur de test
import { Capacitor } from '@capacitor/core';
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

// Programme les notifications des 7 prochains jours pour la mosquée principale
export async function schedule(mosque, days, settings) {
  if (!native || !mosque || !days) return { ok: false };
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return { ok: false, denied: true };
    try { await LocalNotifications.createChannel({ id: 'adhan', name: 'Adhan', description: "Heure de l'adhan", importance: 5, visibility: 1, vibration: true }); } catch {}
    try { await LocalNotifications.createChannel({ id: 'rappel', name: "Rappels d'iqama", importance: 4, visibility: 1 }); } catch {}
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    const tz = mosque.timezone, now = Date.now(), list = [];
    days.slice(0, 8).forEach((D, di) => {
      PRAYERS.forEach((k, ki) => {
        const s = settings[k] || {}; if (s.on === false) return;
        const jum = k === 'dhuhr' && D.friday, nm = jum ? "Jumu'a" : NAMES[k].fr, ar = jum ? 'الجمعة' : NAMES[k].ar;
        const a = at(D.date, D.times[k], tz);
        if (a.getTime() > now) list.push({ id: 1000 + di * 20 + ki * 2, channelId: 'adhan', title: `${nm} · ${ar}`, body: `C'est l'heure de l'adhan à ${mosque.name} (${D.times[k]})`, schedule: { at: a, allowWhileIdle: true }, smallIcon: 'ic_stat_nidaa' });
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
    });
    if (list.length) await LocalNotifications.schedule({ notifications: list });
    return { ok: true, count: list.length };
  } catch (e) { return { ok: false, error: String(e) }; }
}

if (native) { try { StatusBar.setStyle({ style: Style.Dark }); StatusBar.setBackgroundColor({ color: '#060f29' }); } catch {} }
