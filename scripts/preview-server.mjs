import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve('dist');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function safePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const requested = resolve(join(root, pathname));
  if (!requested.startsWith(root)) return join(root, 'index.html');
  if (existsSync(requested) && statSync(requested).isFile()) return requested;
  return join(root, 'index.html');
}

createServer((request, response) => {
  const file = safePath(request.url || '/');
  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`Preview ready at http://${host}:${port}/`);
});
