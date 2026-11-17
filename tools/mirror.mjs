// Mirror static assets of the invitation page into the local web/ folder.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('D:/truongduyen/web');
const ORIGIN = 'https://chungdoi.com';
const CDN = 'https://cdn.chungdoi.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const html = await fs.readFile(path.join(ROOT, 'page.html'), 'utf8');

function unique(arr) { return [...new Set(arr)]; }

// 1. local paths referenced from the HTML
const localPaths = unique(
  [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(m => m[1])
).filter(p => !p.startsWith('//'));

// 2. CDN uploads
const cdnPaths = unique(
  [...html.matchAll(/https:\/\/cdn\.chungdoi\.com(\/[^"'\\ ]+)/g)].map(m => m[1])
);

// 3. extra static files we know the app needs
const extra = [
  '/manifest.json',
  '/browserconfig.xml',
  '/favicon.ico',
];

const jobs = [];
for (const p of [...localPaths, ...extra]) {
  const clean = p.split('?')[0];
  if (clean === '/' || clean.startsWith('/dashboard') || clean.startsWith('/guests') || clean.startsWith('/vi/')) continue; // other pages
  jobs.push({ url: ORIGIN + p, dest: path.join(ROOT, decodeURIComponent(clean)) });
}
for (const p of cdnPaths) {
  const dest = path.join(ROOT, 'uploads', decodeURIComponent(p.split('?')[0]));
  jobs.push({ url: CDN + p, dest });
}

async function download({ url, dest }) {
  try {
    await fs.access(dest);
    return 'skip';
  } catch {}
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' } });
    if (!res.ok) return `FAIL ${res.status} ${url}`;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
    return `ok ${buf.length} ${url}`;
  } catch (e) {
    return `ERR ${url} ${e.message}`;
  }
}

const results = [];
const queue = [...jobs];
const workers = Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const job = queue.shift();
    results.push(await download(job));
  }
});
await Promise.all(workers);

console.log(results.join('\n'));
console.log(`\nTotal jobs: ${jobs.length}`);
