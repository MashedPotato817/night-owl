const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');

const hash = value => createHash('sha256').update(value).digest('hex');
const validId = value => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);

function createReasonsApi({ dataDir }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'reasons.json');
  let rows = [];
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved.version !== 1 || !Array.isArray(saved.rows) || saved.rows.length > 300 || saved.rows.some(row =>
      !validId(row.id) || typeof row.text !== 'string' || row.text.length > 280 || !Number.isFinite(Date.parse(row.at)) ||
      !Array.isArray(row.voters) || row.voters.length > 5000 || row.voters.some(v => !/^[a-f0-9]{64}$/.test(v)) || new Set(row.voters).size !== row.voters.length)) {
      throw new Error('原因数据格式异常，请恢复备份后再启动');
    }
    rows = saved.rows;
  }
  const limits = new Map();
  function allowed(key, posting) {
    const now = Date.now();
    for (const [id, entry] of limits) if (now - entry.start >= 600000) limits.delete(id);
    if (!limits.has(key)) {
      if (limits.size >= 2000) return false;
      limits.set(key, { start: now, posts: 0, edits: 0 });
    }
    const entry = limits.get(key);
    if (entry.edits >= 120 || (posting && entry.posts >= 5)) return false;
    entry.edits++;
    if (posting) entry.posts++;
    return true;
  }
  function persist(next) {
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ version: 1, rows: next }), { mode: 0o600 });
    fs.renameSync(temp, file);
    rows = next;
  }
  return async function handle(req, res, url) {
    const pathname = url.pathname;
    if (pathname !== '/api/reasons' && !pathname.startsWith('/api/reasons/')) return false;
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
      return true;
    };
    let actor = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('reasons_actor='))?.slice(14);
    if (!validId(actor)) {
      actor = randomUUID();
      res.setHeader('Set-Cookie', `reasons_actor=${actor}; HttpOnly; SameSite=Strict; Path=/api/reasons; Max-Age=31536000${req.socket.encrypted ? '; Secure' : ''}`);
    }
    const voter = hash(actor);
    const view = row => ({ id: row.id, text: row.text, at: row.at, votes: row.voters.length, voted: row.voters.includes(voter) });
    if (req.method === 'GET' && pathname === '/api/reasons') return send(200, { reasons: rows.map(view) });
    const match = /^\/api\/reasons\/([a-f0-9-]{36})\/vote$/.exec(pathname);
    if (!((req.method === 'POST' && pathname === '/api/reasons') || (req.method === 'PUT' && match))) return send(405, { error: '不支持此操作' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: '请在本站操作' });
    if (req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host) return send(403, { error: '请在本站操作' });
      } catch { return send(403, { error: '来源无效' }); }
    }
    if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(415, { error: '需要 JSON 内容' });
    let raw = '';
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4096) return send(413, { error: '提交内容过大' });
        chunks.push(chunk);
      }
      raw = Buffer.concat(chunks).toString('utf8');
    } catch { return send(400, { error: '无法读取请求' }); }
    let body;
    try { body = JSON.parse(raw); } catch { return send(400, { error: '提交内容无效' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: '提交内容无效' });
    const posting = req.method === 'POST';
    if (posting && (typeof body.text !== 'string' || !body.text.trim() || body.text.trim().length > 280)) return send(400, { error: '请填写 1–280 字的原因' });
    if (!posting && typeof body.value !== 'boolean') return send(400, { error: '投票状态无效' });
    const index = posting ? -1 : rows.findIndex(row => row.id === match[1]);
    if (!posting && index < 0) return send(404, { error: '这条分享已不存在' });
    if (!allowed(hash(req.socket.remoteAddress || 'unknown'), posting)) return send(429, { error: '操作太频繁，请十分钟后再试' });
    try {
      if (posting) {
        if (rows.length >= 300) return send(409, { error: '分享板已满，请联系站点维护者整理' });
        const row = { id: randomUUID(), text: body.text.trim(), at: new Date().toISOString(), voters: [] };
        persist([row, ...rows]);
        return send(201, { reason: view(row) });
      }
      const row = rows[index];
      const voters = new Set(row.voters);
      if (body.value && voters.size >= 5000 && !voters.has(voter)) return send(409, { error: '这条分享的投票已达上限' });
      if (body.value) voters.add(voter); else voters.delete(voter);
      const next = { ...row, voters: [...voters] };
      persist(rows.map((item, i) => i === index ? next : item));
      return send(200, { reason: view(next) });
    } catch (error) {
      console.error('原因分享保存失败:', error.message);
      return send(503, { error: '暂时无法保存，请稍后重试' });
    }
  };
}

module.exports = { createReasonsApi };
