import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'D:/truongduyen/web';
const ORIGIN = 'https://chungdoi.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const dom = await fs.readFile(path.join(ROOT, 'reference/mobile-dom.html'), 'utf8');
const dom2 = await fs.readFile(path.join(ROOT, 'tools/body.raw.html'), 'utf8');

const urls = new Set();
for (const text of [dom, dom2]) {
  for (const m of text.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = m[1];
    if (u.startsWith('/') && !u.startsWith('//')) urls.add(ORIGIN + u);
    if (u.startsWith('https://cdn.chungdoi.com/')) urls.add(u);
    if (u.startsWith('https://api.vietqr.io/')) urls.add(u);
  }
  for (const m of text.matchAll(/url\(&#x27;(\/[^&]+)&#x27;\)/g)) urls.add(ORIGIN + m[1]);
}

const list = [...urls].filter(u => !u.includes('/_next/') && !u.endsWith('/dashboard') && !u.endsWith('/guests') && !u.match(/\/(vi|i)\//));
console.log(list.length, 'urls');
let ok = 0, skip = 0, fail = [];
for (const u of list) {
  let dest;
  if (u.startsWith('https://cdn.chungdoi.com/')) dest = path.join(ROOT, 'uploads', decodeURIComponent(new URL(u).pathname.split('/').pop()));
  else if (u.startsWith('https://api.vietqr.io/')) dest = path.join(ROOT, 'assets/vendor', new URL(u).pathname.split('/').pop());
  else if (u.includes('/api/qr-png')) {
    const d = new URL(u).searchParams.get('d') || 'qr';
    dest = path.join(ROOT, 'api/qr', d.replace(/[^A-Za-z0-9]/g, '').slice(-40) + '.png');
  } else dest = path.join(ROOT, decodeURIComponent(new URL(u).pathname));
  try { await fs.access(dest); skip++; continue; } catch {}
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA } });
    if (!r.ok) { fail.push(r.status + ' ' + u); continue; }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
  } catch (e) { fail.push('ERR ' + u + ' ' + e.message); }
}
console.log({ ok, skip, fail: fail.length });
console.log(fail.join('\n'));

// music
const mp3 = path.join(ROOT, 'music/yt-158e0d9e-b3c.mp3');
try { await fs.access(mp3); console.log('mp3 exists'); } catch {
  const r = await fetch('https://cdn.chungdoi.com/music/yt-158e0d9e-b3c.mp3');
  await fs.mkdir(path.dirname(mp3), { recursive: true });
  await fs.writeFile(mp3, Buffer.from(await r.arrayBuffer()));
  console.log('mp3 downloaded', r.status);
}
