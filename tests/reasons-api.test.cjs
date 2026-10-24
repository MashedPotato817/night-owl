const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createReasonsApi } = require('../reasons-api.cjs');

async function fixture(t, dir) {
  const dataDir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'reasons-test-'));
  const handler = createReasonsApi({ dataDir });
  const server = http.createServer(async (req, res) => {
    if (!await handler(req, res, new URL(req.url, 'http://localhost'))) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); if (!dir) fs.rmSync(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route = '', method = 'GET', body, cookie, headers = {}) => fetch(`${base}/api/reasons${route}`, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) })
  });
  return { request, dataDir, server };
}

test('共享分享、幂等投票与撤回，重启恢复数据', async t => {
  const { request, dataDir } = await fixture(t);
  const first = await request();
  const cookie = first.headers.get('set-cookie').split(';')[0];
  assert.match(cookie, /^reasons_actor=/);
  assert.deepEqual((await first.json()).reasons, []);
  let response = await request('', 'POST', { text: '  想明天的事 <script>alert(1)</script>  ' }, cookie);
  assert.equal(response.status, 201);
  const reason = (await response.json()).reason;
  assert.equal(reason.text, '想明天的事 <script>alert(1)</script>');
  const route = `/${reason.id}/vote`;
  const results = await Promise.all(Array.from({ length: 5 }, () => request(route, 'PUT', { value: true }, cookie)));
  for (const result of results) assert.equal((await result.json()).reason.votes, 1);
  const other = await request();
  const otherCookie = other.headers.get('set-cookie').split(';')[0];
  assert.equal((await other.json()).reasons[0].voted, false);
  assert.equal((await (await request(route, 'PUT', { value: true }, otherCookie)).json()).reason.votes, 2);
  assert.equal((await (await request(route, 'PUT', { value: false }, cookie)).json()).reason.votes, 1);
  assert.equal((await (await request(route, 'PUT', { value: false }, cookie)).json()).reason.votes, 1);
  const restarted = await fixture(t, dataDir);
  const restored = (await (await restarted.request('', 'GET', undefined, otherCookie)).json()).reasons[0];
  assert.equal(restored.votes, 1);
  assert.equal(restored.voted, true);
  assert.equal(restored.text, reason.text);
  assert.equal('voters' in restored, false);
});

test('拒绝非法输入、跨站、超大正文和不存在的留言', async t => {
  const { request } = await fixture(t);
  for (const body of [{ text: '' }, { text: ' '.repeat(4) }, { text: '字'.repeat(281) }, {}, null, []]) {
    assert.equal((await request('', 'POST', body)).status, 400);
  }
  assert.equal((await request('', 'POST', '{')).status, 400);
  assert.equal((await request('', 'POST', 'x'.repeat(4097))).status, 413);
  assert.equal((await request('', 'POST', { text: '你好' }, undefined, { Origin: 'http://evil.test' })).status, 403);
  assert.equal((await request('', 'POST', { text: '你好' }, undefined, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await request('', 'POST', { text: '你好' }, undefined, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await request('/00000000-0000-0000-0000-000000000000/vote', 'PUT', { value: true })).status, 404);
  assert.equal((await request('', 'DELETE')).status, 405);
});

test('同地址分享节流，清除 Cookie 不能绕过地址节流', async t => {
  const { request } = await fixture(t);
  for (let i = 0; i < 5; i++) assert.equal((await request('', 'POST', { text: `原因 ${i}` })).status, 201);
  assert.equal((await request('', 'POST', { text: '第六条' })).status, 429);
});

test('中文 UTF-8 在网络分块边界保持完整', async t => {
  const { server } = await fixture(t);
  const payload = Buffer.from(JSON.stringify({ text: '夜深了还在想事情' }));
  const split = payload.indexOf(Buffer.from('夜')) + 1;
  const result = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: '/api/reasons', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    req.on('error', reject);
    req.write(payload.subarray(0, split));
    setTimeout(() => req.end(payload.subarray(split)), 20);
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.reason.text, '夜深了还在想事情');
});

test('保存失败不报告成功也不修改内存', async t => {
  const { request, dataDir } = await fixture(t);
  fs.mkdirSync(path.join(dataDir, 'reasons.json.tmp'));
  assert.equal((await request('', 'POST', { text: '保存失败' })).status, 503);
  assert.deepEqual((await (await request()).json()).reasons, []);
});

test('损坏数据启动时拒绝覆盖', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reasons-corrupt-'));
  try {
    fs.writeFileSync(path.join(dataDir, 'reasons.json'), '{');
    assert.throws(() => createReasonsApi({ dataDir }));
    assert.equal(fs.readFileSync(path.join(dataDir, 'reasons.json'), 'utf8'), '{');
  } finally { fs.rmSync(dataDir, { recursive: true, force: true }); }
});
