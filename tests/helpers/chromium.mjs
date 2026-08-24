import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

export const execute = promisify(execFile);
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const chrome = process.env.XSQUARE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const hasChrome = () => existsSync(chrome);
const mimeTypes = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8'};

export function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const file = resolve(root, pathname.slice(1));
    if (!file.startsWith(root + sep)) return response.writeHead(404).end();
    try {
      const body = await readFile(file);
      response.writeHead(200, {'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream'});
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolveServer) => server.listen(0, '127.0.0.1', () => resolveServer(server)));
}
