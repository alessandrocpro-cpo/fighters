// Assemble src/ en un seul fichier jouable. Usage : node tools/build.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const js = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort().map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Permanent+Marker&display=swap">';
const body = `<div id="app"></div>\n<script>\n${js}\n</script>`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#181a28">\n<title>Climbrawl</title>\n${fonts}\n<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
fs.writeFileSync(path.join(root, 'dist/artifact.html'), `<title>Climbrawl</title>\n${fonts}\n<style>\n${css}\n</style>\n${body}\n`);
fs.copyFileSync(path.join(root, 'dist/index.html'), path.join(root, 'index.html'));
console.log('dist ok', (fs.statSync(path.join(root, 'dist/index.html')).size / 1024).toFixed(0) + ' KB');
