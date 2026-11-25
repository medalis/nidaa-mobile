import { build } from 'esbuild';
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: 'www/app.js', logLevel: 'warning' });
console.log('ok');
