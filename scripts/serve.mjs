// デモ用の静的サーバー。site/ を配信するだけ（依存なし・localhost 限定）。
// ES Modules は file:// では動かないため、ブラウザで確認するときはこれを使う。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const port = Number(process.env.PORT) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
    const file = resolve(root, `.${requested}`);
    if (!file.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(file);
    res
      .writeHead(200, {
        'content-type': types[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      .end(body);
  } catch (error) {
    const notFound = error.code === 'ENOENT' || error.code === 'EISDIR';
    res.writeHead(notFound ? 404 : 400).end(notFound ? 'Not found' : 'Bad request');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`http://localhost:${port}  (Ctrl+C で停止)`);
});
