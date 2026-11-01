// Copies pdf.js character maps and standard fonts into public/ so Amharic and other
// non-Latin PDFs render without a CDN (and therefore offline, once cached by the service worker).
import { cpSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/pdfjs');

for (const dir of ['cmaps', 'standard_fonts']) {
  const from = path.join(pdfjsRoot, dir);
  if (!existsSync(from)) throw new Error(`pdfjs-dist is missing ${dir}/`);
  cpSync(from, path.join(publicDir, dir), { recursive: true });
}
console.log('Copied pdf.js cmaps and standard fonts to public/pdfjs');
