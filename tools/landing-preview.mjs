// A self-contained preview of the product page (public/landing.html), to look at or publish privately without a server:
//   OUT=/tmp/landing-preview node tools/landing-preview.mjs      (or: node tools/landing-preview.mjs /tmp/landing-preview)
// It writes one folder: index.html, landing.css, preview.js, img/ (the screenshots and the mark). The product's name is
// filled in from PREVIEW_PRODUCT_NAME, else PRODUCT_NAME, else the placeholder "Product" (the real page reads PRODUCT_NAME from the host), the walkthrough works, and the
// sign-in and sign-up forms are switched off with a note saying so. No request leaves the folder. It stays under 6 MB.
// Not part of `npm run check`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.OUT || process.argv[2] || path.join(root, 'tools', '.landing-preview'));
const NAME = process.env.PREVIEW_PRODUCT_NAME || process.env.PRODUCT_NAME || 'Product';
const IMAGES = path.join(root, 'public', 'assets', 'images', 'brand', 'landing');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'img'), { recursive: true });

let html = fs.readFileSync(path.join(root, 'public', 'landing.html'), 'utf8');
html = html
  .replace(/<link rel="icon"[^>]*>\n?/, '')
  .replace('href="/landing.css"', 'href="landing.css"')
  .replace('type="module" src="/landing.js"', 'defer src="preview.js"')
  .replaceAll('/assets/images/brand/landing/', 'img/')
  .replace(/(<[^>]*\bdata-product\b[^>]*>)[^<]*(<)/g, `$1${NAME}$2`)
  .replace('<title data-product>Coffee Pub</title>', `<title>${NAME}</title>`)
  .replace(/<span data-version><\/span>/, '<span>preview</span>');
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.copyFileSync(path.join(root, 'public', 'landing.css'), path.join(out, 'landing.css'));
for (const f of fs.readdirSync(IMAGES)) fs.copyFileSync(path.join(IMAGES, f), path.join(out, 'img', f));

// The walkthrough's controls are the first block of landing.js; the rest of that file talks to the host, which a preview has none of.
const src = fs.readFileSync(path.join(root, 'public', 'landing.js'), 'utf8');
const start = src.indexOf('(() => {');
const end = src.indexOf('})();', start) + '})();'.length;
if (start < 0 || end < start) throw new Error('landing-preview: cannot find the walkthrough block in public/landing.js');
const preview = `// Preview only: the walkthrough from landing.js, and the forms switched off.
${src.slice(start, end)}
for (const el of document.querySelectorAll('[data-example-host]')) el.textContent = 'yourname.example.com';
for (const el of document.querySelectorAll('[data-signup-domain]')) el.textContent = '.example.com';
const signup = document.getElementById('signup-form');
signup.hidden = false;
const options = document.getElementById('signup-template-options');
document.getElementById('signup-template').hidden = false;
options.innerHTML = '<label class="template-option"><input type="radio" name="template" checked><span><strong>None</strong><span class="hint">Start plain: the usual words and settings.</span></span></label><label class="template-option"><input type="radio" name="template"><span><strong>Travel</strong><span class="hint">Plan trips together: the itinerary, places, maps, research and a calendar.</span></span></label>';
for (const form of [signup, document.getElementById('signin-form')]) {
  for (const el of form.querySelectorAll('input, select, button')) el.disabled = true;
  form.addEventListener('submit', (e) => e.preventDefault());
  const note = document.createElement('p');
  note.className = 'hint';
  note.textContent = 'This is a preview. The form does nothing here.';
  form.after(note);
}
document.getElementById('signin-creds').hidden = false;
for (const a of document.querySelectorAll('[data-contact-link]')) a.href = '#start';
`;
fs.writeFileSync(path.join(out, 'preview.js'), preview);

let bytes = 0;
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } };
walk(out);
if (bytes > 6 * 1024 * 1024) throw new Error(`landing-preview: ${bytes} bytes is over 6 MB`);
console.log(`landing-preview: ${out} (${Math.round(bytes / 1024)} KB)`);
