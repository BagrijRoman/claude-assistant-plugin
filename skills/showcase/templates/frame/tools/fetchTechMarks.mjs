// Downloads the official marks of the technologies on the Stack page into assets/tech/, once, so the
// page shows them with no network at view time. A mark comes from Simple Icons (the icon files are CC0;
// each mark stays its owner's trademark, shown here to name the technology) by its slug, or, for a
// technology Simple Icons does not have, from the project's own site by URL. Every mark is listed in
// assets/tech/marks.json — title, color, source — which the Stack page's generator reads.
//
//   node tools/fetchTechMarks.mjs nextdotjs react nestjs postgresql
//   node tools/fetchTechMarks.mjs playwright=https://playwright.dev/img/playwright-logo.svg
//
// A Simple Icons mark is one path; it is written in its brand color. A brand color too dark or too
// light to read on both themes (black, white) is written black and marked `mono`: the page gives it
// the class tech-mark--mono, which turns it white on the dark theme. A slug Simple Icons lacks is
// reported; give its URL, or let the page draw the technology's initials on a tile instead.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const VERSION = '16.35.0';
const BASE = `https://cdn.jsdelivr.net/npm/simple-icons@${VERSION}`;
const dir = new URL('../assets/tech/', import.meta.url);
const manifestFile = new URL('marks.json', dir);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node tools/fetchTechMarks.mjs <simple-icons slug | name=url> …');
  process.exit(2);
}

const luminance = (hex) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

await mkdir(dir, { recursive: true });
const manifest = JSON.parse(await readFile(manifestFile, 'utf8').catch(() => '{}'));
let data;
const missing = [];

for (const arg of args) {
  const [slug, url] = arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, null];
  if (url) {
    const response = await fetch(url);
    if (!response.ok) { missing.push(`${slug} (${response.status} from ${url})`); continue; }
    const type = response.headers.get('content-type') ?? '';
    const ext = type.includes('svg') || url.endsWith('.svg') ? 'svg' : type.includes('png') || url.endsWith('.png') ? 'png' : null;
    if (!ext) { missing.push(`${slug} (${url} is not an SVG or PNG)`); continue; }
    await writeFile(new URL(`${slug}.${ext}`, dir), Buffer.from(await response.arrayBuffer()));
    manifest[slug] = { file: `${slug}.${ext}`, title: manifest[slug]?.title ?? slug, mono: false, source: url };
    console.log(`${slug}: from ${url}`);
    continue;
  }
  data ??= await (await fetch(`${BASE}/data/simple-icons.json`)).json();
  const entry = data.find((icon) => icon.slug === slug);
  const response = entry ? await fetch(`${BASE}/icons/${slug}.svg`) : null;
  if (!entry || !response?.ok) { missing.push(`${slug} (not in Simple Icons ${VERSION})`); continue; }
  const light = luminance(entry.hex);
  const mono = light < 0.02 || light > 0.6;
  const fill = mono ? '#000000' : `#${entry.hex}`;
  const svg = (await response.text()).replace('<svg ', `<svg fill="${fill}" `);
  await writeFile(new URL(`${slug}.svg`, dir), svg);
  manifest[slug] = { file: `${slug}.svg`, title: entry.title, hex: `#${entry.hex}`, mono, source: `Simple Icons ${VERSION}`, guidelines: entry.guidelines ?? entry.source };
  console.log(`${slug}: ${entry.title}${mono ? ' (mono)' : ''}`);
}

await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
if (missing.length) {
  console.log(`Not found: ${missing.join('; ')}. Give a URL from the project's own site (name=url), or the page draws its initials.`);
}
