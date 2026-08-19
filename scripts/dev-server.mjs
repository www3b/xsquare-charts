import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname, extname, resolve, sep} from 'node:path';
import {spawn} from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 3000;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const watcher = spawn('rollup', ['-c', '-w'], {cwd: root, stdio: 'inherit'});

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relativePath = pathname === '/' ? 'demo/index.html' : pathname.slice(1);
  const file = resolve(root, relativePath);

  if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Not found');
    return;
  }

  response.writeHead(200, {'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream'});
  createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Chart SVG demo: http://localhost:${port}`);
});

function shutdown() {
  watcher.kill();
  server.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
