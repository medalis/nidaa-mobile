import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
// Sons de l'adhan : www/*.mp3|wav -> android/app/src/main/res/raw (+ liste intégrée à l'application)
const dir = 'www', raw = 'android/app/src/main/res/raw', list = {};
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir)) {
    const m = /^([a-z0-9_]+)\.(mp3|wav|ogg)$/i.exec(f); if (!m) continue;
    const k = m[1].toLowerCase(), name = k + '.' + m[2].toLowerCase();
    if (list[k]) continue; list[k] = name;
    if (name !== f) fs.renameSync(dir + '/' + f, dir + '/' + name);
    if (fs.existsSync('android/app/src/main')) { fs.mkdirSync(raw, { recursive: true }); fs.copyFileSync(dir + '/' + name, raw + '/' + name); }
  }
}
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', target: ['chrome70'], outfile: 'www/app.js', logLevel: 'warning', define: { __SOUNDS__: JSON.stringify(list) } });
console.log('ok · sons :', Object.keys(list).join(', ') || 'aucun');

// Widgets Android : fichiers de src/ copiés dans le projet Android + déclaration dans le manifeste
const J = 'android/app/src/main';
if (fs.existsSync(J)) {
  const dest = (f) => {
    if (f.endsWith('.java')) return `${J}/java/dj/nidaa/app/${f}`;
    let m = /^w_layout_(.+)\.xml$/.exec(f); if (m) return `${J}/res/layout/w_${m[1]}.xml`;
    if (/^w_info_.+\.xml$/.test(f)) return `${J}/res/xml/${f}`;
    if (/^w_font_.+\.ttf$/.test(f)) return `${J}/assets/fonts/${f}`;
    if (/^w_prev_.+\.png$/.test(f)) return `${J}/res/drawable-nodpi/${f}`;
    return null;
  };
  let n = 0;
  for (const f of fs.readdirSync('src')) { const d = dest(f); if (!d) continue; fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync('src/' + f, d); n++; }
  const mf = `${J}/AndroidManifest.xml`, W = [['Band', 'Bande', 'band'], ['Ring', 'Anneau', 'ring'], ['Clear', 'Sans fond', 'clear'], ['Arc', 'Arc solaire', 'arc'], ['Day', 'Journée', 'day']];
  let x = fs.readFileSync(mf, 'utf8');
  if (fs.existsSync(`${J}/java/dj/nidaa/app/NidaaWidgets.java`) && !x.includes('nidaa-widgets')) {
    const rec = W.map(([c, l, k]) => `        <receiver android:name=".NidaaWidgets$${c}" android:label="Nidaa · ${l}" android:exported="false">\n            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/w_info_${k}" />\n        </receiver>`).join('\n');
    x = x.replace('</application>', `        <!-- nidaa-widgets -->\n${rec}\n    </application>`);
    fs.writeFileSync(mf, x);
  }
  console.log('widgets : ' + n + ' fichiers');
}
