import { build } from 'esbuild';
import fs from 'node:fs';
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
