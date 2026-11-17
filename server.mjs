import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4321);
const DATA = path.join(ROOT, 'data');
const COMMENTS = path.join(DATA, 'comments.json');
const RSVPS = path.join(DATA, 'rsvp.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml'
};

await fsp.mkdir(DATA, { recursive: true });
for (const [file, seed] of [[COMMENTS, { comments: [] }], [RSVPS, { rsvps: [] }]]) {
  try { await fsp.access(file); } catch { await fsp.writeFile(file, JSON.stringify(seed, null, 2)); }
}

async function readJson(file) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch { return {}; }
}

async function writeJson(file, value) {
  await fsp.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

function sendJson(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store' });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) { reject(new Error('payload too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  try {
    // ---------- API ----------
    if (pathname === '/api/comments' && req.method === 'GET') {
      const data = await readJson(COMMENTS);
      return sendJson(res, 200, { comments: data.comments || [] });
    }
    if (pathname === '/api/comments' && req.method === 'POST') {
      const body = await readBody(req);
      const name = String(body.name || '').trim().slice(0, 200);
      const message = String(body.message || '').trim().slice(0, 5000);
      if (!name || !message) return sendJson(res, 400, { error: 'missing_fields' });
      const data = await readJson(COMMENTS);
      const comment = { id: 'c_' + Date.now().toString(36), name, message, createdAt: new Date().toISOString() };
      data.comments = [comment, ...(data.comments || [])];
      await writeJson(COMMENTS, data);
      return sendJson(res, 201, { comment });
    }
    if (pathname === '/api/rsvp' && req.method === 'POST') {
      const body = await readBody(req);
      const name = String(body.name || '').trim().slice(0, 200);
      const attending = body.attending === 'yes' ? 'yes' : 'no';
      if (!name) return sendJson(res, 400, { error: 'missing_name' });
      const data = await readJson(RSVPS);
      const entry = { id: 'r_' + Date.now().toString(36), name, attending, createdAt: new Date().toISOString() };
      data.rsvps = [entry, ...(data.rsvps || [])];
      await writeJson(RSVPS, data);
      return sendJson(res, 201, { rsvp: entry });
    }
    if (pathname === '/api/qr-png') {
      const d = url.searchParams.get('d') || '';
      const key = d.replace(/[^A-Za-z0-9]/g, '').slice(-40);
      const file = path.join(ROOT, 'api', 'qr', key + '.png');
      try {
        const buf = await fsp.readFile(file);
        res.writeHead(200, { 'content-type': 'image/png', 'content-length': buf.length });
        return res.end(buf);
      } catch {
        res.writeHead(404); return res.end('not found');
      }
    }
    if (pathname === '/api/geo') return sendJson(res, 200, { country: 'VN' });
    if (pathname === '/api/invite' || pathname.startsWith('/api/invite/')) {
      // legacy chungdoi endpoints: answer with a harmless empty payload
      return sendJson(res, 200, { comments: [] });
    }

    // ---------- static ----------
    let filePath = pathname === '/' ? '/index.html' : pathname;
    if (pathname === '/i/batruong-thiduyen-cherish') filePath = '/index.html';
    const abs = path.join(ROOT, path.normalize(filePath).replace(/^([/\\])+/, ''));
    if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

    const stat = await fsp.stat(abs).catch(() => null);
    if (!stat || stat.isDirectory()) { res.writeHead(404); return res.end('not found'); }

    const ext = path.extname(abs).toLowerCase();
    const head = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=3600' };
    res.writeHead(200, head);
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    sendJson(res, 500, { error: 'server_error', message: String(e && e.message) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Thiệp cưới local:  http://localhost:${PORT}\n  Thư mục:           ${ROOT}\n`);
});
