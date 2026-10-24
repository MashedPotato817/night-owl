const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createReminderStore, createMailTransport } = require('./reminder-core.cjs');
const files = new Set(['/index.html', '/styles.css', '/app.js', '/poll-core.js', '/bedtime-tasks.js', '/bedtime-tasks.css', '/reasons.js', '/reasons.css', '/sleep-content.js', '/sleep-content.css']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw Object.assign(new Error('请使用 JSON 请求'), { status: 415 });
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    chunks.push(chunk); size += chunk.length;
    if (size > 20000) throw Object.assign(new Error('请求内容过大'), { status: 413 });
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('JSON 格式无效'); }
}
function createApp({ dataDir = process.env.DATA_DIR || path.join(__dirname, '.night-owl-data'), transport = createMailTransport(), now, interval = 15000 } = {}) {
  const reminders = createReminderStore({ dataDir, ...transport, now });
  const reasonPath = path.join(__dirname, 'reasons-api.cjs');
  const reasons = fs.existsSync(reasonPath) ? require(reasonPath).createReasonsApi({ dataDir }) : null;
  const limits = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        const origin = req.headers.origin;
        if ((origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) || req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error: '仅支持同源访问' });
        if (reasons && await reasons(req, res, url)) return;
        if (url.pathname === '/api/tasks/config' && req.method === 'GET') return json(res, 200, { configured: reminders.configured });
        if (url.pathname === '/api/tasks/session' && req.method === 'POST') return json(res, 201, { token: reminders.createSession() });
        if (url.pathname !== '/api/tasks') return json(res, 404, { error: '接口不存在' });
        const token = (req.headers.authorization || '').replace(/^Bearer /, '');
        if (req.method === 'GET') return json(res, 200, { reminder: reminders.get(token) });
        if (req.method === 'DELETE') { reminders.remove(token); return json(res, 200, { deleted: true }); }
        if (req.method === 'PUT') {
          const ip = req.socket.remoteAddress;
          const stamp = Date.now();
          for (const [address, value] of limits) if (stamp - value.at > 3600000) limits.delete(address);
          const entry = limits.get(ip) || { at: stamp, count: 0 };
          if (entry.count >= 30) return json(res, 429, { error: '安排次数过多，请一小时后再试' });
          const input = await readJson(req);
          const reminder = reminders.save(token, input);
          entry.count++; limits.set(ip, entry);
          return json(res, 200, { reminder });
        }
        res.setHeader('Allow', 'GET, PUT, DELETE');
        return json(res, 405, { error: '请求方法不支持' });
      }
      const file = url.pathname === '/' ? '/index.html' : url.pathname;
      if (!files.has(file)) { res.writeHead(404); return res.end('Not found'); }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      fs.readFile(path.join(__dirname, file), (error, data) => {
        if (error) { res.writeHead(500); return res.end('Unable to read file'); }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
        res.end(req.method === 'HEAD' ? undefined : data);
      });
    } catch (error) {
      if (!res.headersSent) json(res, error.status || (error.code ? 503 : 400), { error: error.code ? '服务存储暂不可用，请稍后重试' : error.message });
      else res.end();
    }
  });
  const timer = setInterval(() => reminders.tick().catch(() => console.error('Reminder queue unavailable')), interval);
  timer.unref();
  reminders.tick().catch(() => console.error('Reminder queue unavailable'));
  server.on('close', () => clearInterval(timer));
  return { server, reminders };
}
if (require.main === module) {
  const { server } = createApp();
  server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
}
module.exports = { createApp };
