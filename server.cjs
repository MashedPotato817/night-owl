const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Set(['/index.html', '/styles.css', '/app.js', '/poll-core.js']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname === '/' ? '/index.html' : pathname;
  if (!files.has(file)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, file), (error, data) => {
    if (error) { res.writeHead(500); return res.end('Unable to read file'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
