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
      const count = attending === 'yes' ? Math.min(20, Math.max(1, parseInt(body.count, 10) || 1)) : 0;
      if (!name) return sendJson(res, 400, { error: 'missing_name' });
      const data = await readJson(RSVPS);
      const entry = { id: 'r_' + Date.now().toString(36), name, attending, count, createdAt: new Date().toISOString() };
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

    if (pathname === '/mock-apps-script') {
      const action = url.searchParams.get('action');
      if (req.method === 'GET' && action === 'wishes') {
        const data = await readJson(COMMENTS);
        const wishes = (data.comments || []).slice(0, 30).map((c) => ({
          time: new Date(c.createdAt).getTime(),
          name: c.name,
          wish: c.message,
        }));
        const callback = url.searchParams.get('callback') || '';
        const payload = JSON.stringify({ ok: true, wishes });
        if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
          res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(callback + '(' + payload + ');');
        }
        return sendJson(res, 200, { ok: true, wishes });
      }
      if (req.method === 'POST') {
        const raw = await new Promise((resolve) => {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => resolve(body));
        });
        const form = new URLSearchParams(raw);
        const action = form.get('action');
        if (action === 'wish') {
          const data = await readJson(COMMENTS);
          data.comments = [{
            id: 'c_' + Date.now().toString(36),
            name: String(form.get('name') || '').slice(0, 200),
            message: String(form.get('wish') || '').slice(0, 5000),
            createdAt: new Date().toISOString(),
          }, ...(data.comments || [])];
          await writeJson(COMMENTS, data);
        } else {
          const data = await readJson(RSVPS);
          data.rsvps = [{
            id: 'r_' + Date.now().toString(36),
            name: String(form.get('name') || '').slice(0, 200),
            attending: form.get('attend') === 'yes' ? 'yes' : 'no',
            count: Number(form.get('count')) || 0,
            createdAt: new Date().toISOString(),
          }, ...(data.rsvps || [])];
          await writeJson(RSVPS, data);
        }
        res.writeHead(200, { 'content-type': 'text/plain' });
        return res.end('ok');
      }
    }
    if (pathname === '/api/invite' || pathname.startsWith('/api/invite/')) {
      // legacy chungdoi endpoints: answer with a harmless empty payload
      return sendJson(res, 200, { comments: [] });
    }

    // ---------- static ----------
    let filePath = pathname === '/' ? '/index.html' : pathname;
    if (pathname === '/i/batruong-thiduyen-cherish') filePath = '/index.html';
    if (pathname === '/truongduyen' || pathname === '/truongduyen/') filePath = '/index.html';
    else if (pathname.startsWith('/truongduyen/')) filePath = pathname.slice('/truongduyen'.length);
    let abs = path.join(ROOT, path.normalize(filePath).replace(/^([/\\])+/, ''));
    if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

    let stat = await fsp.stat(abs).catch(() => null);
    if (stat && stat.isDirectory()) {
      abs = path.join(abs, 'index.html');
      stat = await fsp.stat(abs).catch(() => null);
    }
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
