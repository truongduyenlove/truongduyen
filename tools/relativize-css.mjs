import fs from 'node:fs';
import path from 'node:path';

const DIR = 'D:/truongduyen/web/_next/static/css';

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.css'))) {
  const full = path.join(DIR, file);
  const before = fs.readFileSync(full, 'utf8');
  const after = before
    .replace(/url\((['"]?)\/fonts\//g, 'url($1../../../fonts/')
    .replace(/url\((['"]?)\/images\//g, 'url($1../../../images/')
    .replace(/url\((['"]?)\/uploads\//g, 'url($1../../../uploads/');
  if (before !== after) fs.writeFileSync(full, after, 'utf8');
  console.log(file, before === after ? 'unchanged' : 'rewritten');
}
