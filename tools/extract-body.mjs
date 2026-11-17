import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'D:/truongduyen/web';
const html = await fs.readFile(path.join(ROOT, 'page.html'), 'utf8');

const bodyStart = html.indexOf('<body');
const bodyOpenEnd = html.indexOf('>', bodyStart) + 1;
const bodyEnd = html.lastIndexOf('</body>');
let body = html.slice(bodyOpenEnd, bodyEnd);

await fs.writeFile(path.join(ROOT, 'tools/body.raw.html'), body, 'utf8');

// outline: print depth-first list of elements with class/id up to depth 6
let out = [];
const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
let m, depth = 0;
const VOID = new Set(['img','br','hr','input','meta','link','source','path','circle','rect','use','stop','ellipse','line','polygon','polyline','animate','animateTransform','feTurbulence','feDisplacementMap','filter','area','base','col','embed','param','track','wbr']);
while ((m = re.exec(body))) {
  const closing = m[1] === '/';
  const tag = m[2].toLowerCase();
  const attrs = m[3];
  if (closing) { depth = Math.max(0, depth-1); continue; }
  if (depth <= 7) {
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
    const id = (attrs.match(/id="([^"]*)"/) || [])[1] || '';
    const st = (attrs.match(/style="([^"]*)"/) || [])[1] || '';
    if (cls || id || ['section','header','footer','main','nav','h1','h2','form','audio','video'].includes(tag)) {
      out.push(`${'  '.repeat(depth)}<${tag}${id ? ' #' + id : ''}${cls ? ' .' + cls.split(/\s+/).join('.') : ''}${st ? ' [' + st.slice(0,60) + ']' : ''}>`);
    }
  }
  if (!VOID.has(tag) && !attrs.trim().endsWith('/')) depth++;
}
await fs.writeFile(path.join(ROOT, 'tools/body.outline.txt'), out.join('\n'), 'utf8');
console.log('body length', body.length, 'outline lines', out.length);

