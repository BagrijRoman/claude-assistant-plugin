// Serves the showcase from this folder and opens it in the default browser.
// Run it from the showcase folder with `node open.mjs`; Ctrl+C stops it.
// The site is static files. It is served, not opened from disk, because only then may a page fetch
// the next one and swap its content in place: from disk every click reloads the whole page.
// SHOWCASE_PORT=4331 picks another port; SHOWCASE_NO_OPEN=1 serves without opening a window.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, allPages } from './build.mjs';
import { SITE } from './site.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.SHOWCASE_PORT) || SITE.port || 4330;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

// A page that became a section of a long page (components/button.html is now components/#button)
// still answers at its old address, so an old bookmark or a tab opened before the change still works
const MOVED = new Map();
for (const page of allPages) {
  if (!page.path || !page.sections) continue;
  const folder = page.path.slice(0, page.path.lastIndexOf('/') + 1);
  for (const section of page.sections) MOVED.set(`/${folder}${section.id}.html`, `/${page.path}#${section.id}`);
}

// The menu and the other navigation are static HTML inside the pages: bring them up to date first
const rebuilt = await build();
if (rebuilt.length > 0) console.log(`Navigation rewritten in ${rebuilt.length} pages`);

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // An address with a broken escape (%E0%A4%A) names no file, and must not stop the server
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }
  const file = normalize(join(root, path.replace(/\/$/, '/index.html')));
  // A path that climbs out of the site folder is refused, not resolved
  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
      // Edits to the site show on the next reload
      'cache-control': 'no-cache',
    });
    response.end(body);
  } catch (error) {
    if (error.code === 'ENOENT' && MOVED.has(pathname)) {
      response.writeHead(302, { location: MOVED.get(pathname) }).end();
      return;
    }
    // A folder asked for without its slash (/components): its page, under the address with the slash
    if (error.code === 'EISDIR' && !pathname.endsWith('/')) {
      // One leading slash only: "//components/" would name another host
      response.writeHead(301, { location: `/${pathname.replace(/^\/+/, '')}/` }).end();
      return;
    }
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    console.error(`Could not read ${file}: ${error.message}`);
    response.writeHead(500).end('Server error');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is busy. The showcase may already be running; or pick another port: SHOWCASE_PORT=${port + 1} node open.mjs`);
  } else {
    console.error(`The showcase server failed: ${error.message}`);
  }
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}/`;
  console.log(`${SITE.name} showcase: ${url}  (Ctrl+C to stop)`);

  const OPENERS = {
    darwin: ['open', [url]],
    // `start` is a cmd built-in; its first quoted argument is the window title
    win32: ['cmd', ['/c', 'start', '', url]],
  };
  const [command, args] = OPENERS[process.platform] ?? ['xdg-open', [url]];
  if (process.env.SHOWCASE_NO_OPEN) return;
  const opener = spawn(command, args, { stdio: 'ignore', detached: true });
  opener.on('error', (error) => {
    console.error(`Could not start "${command}" (${error.message}). Open ${url} in a browser.`);
  });
  opener.unref();
});
