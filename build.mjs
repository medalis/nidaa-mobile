import { build } from 'esbuild';
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', target: ['chrome70'], outfile: 'www/app.js', logLevel: 'warning' });
console.log('ok');
