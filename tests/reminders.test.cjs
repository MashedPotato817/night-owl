const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { tomorrowAt, createReminderStore } = require('../reminder-core.cjs');
const { createApp } = require('../server.cjs');
function temp(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'night-reminders-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
const input = { items: ['写完方案', '<script>不能执行</script>'], email: 'owl@example.com', time: '09:30', offset: -480 };
test('次日时间按提交者时区计算，跨年且不受服务器时区影响', () => {
  assert.equal(tomorrowAt('09:30', -480, new Date('2026-12-31T15:30:00Z')), '2027-01-01T01:30:00.000Z');
  assert.equal(tomorrowAt('00:15', 300, new Date('2026-10-24T03:00:00Z')), '2026-10-24T05:15:00.000Z');
  assert.throws(() => tomorrowAt('25:00', -480));
  assert.throws(() => tomorrowAt('09:00', '0'));
});
test('私有凭据隔离，持久化重启恢复并只发送一次，删除后不可读取', async t => {
  const dataDir = temp(t); let time = new Date('2026-10-24T14:00:00Z'); const sent = [];
  const options = { dataDir, configured: true, now: () => time, sendMail: async record => sent.push(structuredClone(record)) };
  const first = createReminderStore(options); const a = first.createSession(); const b = first.createSession();
  assert.match(a, /^[a-f0-9]{64}$/); assert.notEqual(a, b);
  first.save(a, input); assert.equal(first.get(b), null); assert.throws(() => first.get('wrong'), /凭据/);
  assert.equal(fs.readFileSync(path.join(dataDir, 'reminders.json'), 'utf8').includes(a), false);
  const restored = createReminderStore(options); assert.deepEqual(restored.get(a).items, input.items);
  await restored.tick(); assert.equal(sent.length, 0);
  time = new Date('2026-10-25T02:00:00Z'); await Promise.all([restored.tick(), restored.tick()]);
  assert.equal(sent.length, 1); assert.equal(restored.get(a).status, 'sent');
  const again = createReminderStore(options); await again.tick(); assert.equal(sent.length, 1);
  again.remove(a); assert.equal(again.get(a), null);
});
test('未配置邮件和非法输入不得报告安排成功；失败和发送中重启明确标识', async t => {
  const dataDir = temp(t); let time = new Date('2026-10-24T14:00:00Z');
  const disabled = createReminderStore({ dataDir }); const token = disabled.createSession();
  assert.throws(() => disabled.save(token, input), error => error.status === 503);
  const options = { dataDir, configured: true, now: () => time, sendMail: async () => { throw new Error('secret provider error'); } };
  const store = createReminderStore(options);
  assert.throws(() => store.save(token, { ...input, email: 'a@example.com\r\nBcc:steal@example.com' }));
  assert.throws(() => store.save(token, { ...input, items: [''] }));
  assert.throws(() => store.save(token, { ...input, items: ['a'.repeat(301)] }));
  store.save(token, input); time = new Date('2026-10-25T02:00:00Z'); await store.tick();
  assert.equal(store.get(token).status, 'failed'); assert.equal(store.get(token).error.includes('secret'), false);
  const file = path.join(dataDir, 'reminders.json'); const records = JSON.parse(fs.readFileSync(file)); Object.values(records)[0].status = 'sending'; fs.writeFileSync(file, JSON.stringify(records));
  const restarted = createReminderStore(options); assert.equal(restarted.get(token).status, 'failed'); assert.match(restarted.get(token).error, /未知/);
});
test('HTTP接口拒绝跨源、无凭据和过大请求；正文只返回私有用户', async t => {
  const dataDir = temp(t); const { server } = createApp({ dataDir, interval: 100000, transport: { configured: true, sendMail: async () => {} } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/tasks')).status, 401);
  assert.equal((await fetch(base + '/api/tasks/session', { method: 'POST', headers: { Origin: 'https://evil.example' } })).status, 403);
  const { token } = await (await fetch(base + '/api/tasks/session', { method: 'POST' })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const saved = await fetch(base + '/api/tasks', { method: 'PUT', headers, body: JSON.stringify(input) }); assert.equal(saved.status, 200);
  const own = await (await fetch(base + '/api/tasks', { headers })).json(); assert.deepEqual(own.reminder.items, input.items);
  const other = await (await fetch(base + '/api/tasks', { headers: { Authorization: 'Bearer ' + '0'.repeat(64) } })).json(); assert.equal(other.reminder, null);
  assert.equal((await fetch(base + '/api/tasks', { method: 'PUT', headers, body: JSON.stringify({ text: 'x'.repeat(21000) }) })).status, 413);
  assert.equal((await fetch(base + '/.night-owl-data/reminders.json')).status, 404);
  assert.equal((await fetch(base + '/api/tasks', { method: 'DELETE', headers })).status, 200);
  assert.equal((await (await fetch(base + '/api/tasks', { headers })).json()).reminder, null);
});
test('磁盘写入失败不产生幽灵提醒、不误删；发送前写失败仍可恢复', async t => {
  const dataDir = temp(t); let time = new Date('2026-10-24T14:00:00Z'); let deliveries = 0;
  const store = createReminderStore({ dataDir, configured: true, now: () => time, sendMail: async () => { deliveries++; } });
  const token = store.createSession(); const original = fs.renameSync;
  try {
    fs.renameSync = () => { throw Object.assign(new Error('disk failure'), { code: 'EACCES' }); };
    assert.throws(() => store.save(token, input)); assert.equal(store.get(token), null);
    fs.renameSync = original; store.save(token, input);
    fs.renameSync = () => { throw new Error('disk failure'); };
    assert.throws(() => store.remove(token)); assert.equal(store.get(token).status, 'scheduled');
    time = new Date('2026-10-25T02:00:00Z');
    await assert.rejects(store.tick()); assert.equal(store.get(token).status, 'scheduled'); assert.equal(deliveries, 0);
    fs.renameSync = original; await store.tick(); assert.equal(deliveries, 1); assert.equal(store.get(token).status, 'sent');
  } finally { fs.renameSync = original; }
});
test('发送后写盘失败明确标识未知且不再次发信', async t => {
  const dataDir = temp(t); let time = new Date('2026-10-24T14:00:00Z'); let deliveries = 0;
  const original = fs.renameSync;
  const store = createReminderStore({ dataDir, configured: true, now: () => time, sendMail: async () => { deliveries++; fs.renameSync = () => { throw new Error('disk failure'); }; } });
  const token = store.createSession(); store.save(token, input); time = new Date('2026-10-25T02:00:00Z');
  try {
    await assert.rejects(store.tick()); assert.equal(store.get(token).status, 'failed');
    fs.renameSync = original; await store.tick(); assert.equal(deliveries, 1);
    const restored = createReminderStore({ dataDir, configured: true, now: () => time, sendMail: async () => { deliveries++; } });
    assert.equal(restored.get(token).status, 'failed'); await restored.tick(); assert.equal(deliveries, 1);
  } finally { fs.renameSync = original; }
});
test('HTTP分块UTF-8中文完整保留，null请求返回可理解400', async t => {
  const http = require('node:http'); const dataDir = temp(t);
  const { server } = createApp({ dataDir, transport: { configured: true, sendMail: async () => {} } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { token } = await (await fetch(base + '/api/tasks/session', { method: 'POST' })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const body = Buffer.from(JSON.stringify(input)); const split = body.indexOf(Buffer.from('写')) + 1;
  const response = await new Promise((resolve, reject) => {
    const req = http.request(base + '/api/tasks', { method: 'PUT', headers }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    req.on('error', reject); req.write(body.subarray(0, split)); setTimeout(() => req.end(body.subarray(split)), 10);
  });
  assert.equal(response.status, 200); assert.deepEqual(response.body.reminder.items, input.items);
  const invalid = await fetch(base + '/api/tasks', { method: 'PUT', headers, body: 'null' });
  assert.equal(invalid.status, 400); assert.equal((await invalid.json()).error, '清单格式无效');
  assert.equal(tomorrowAt('09:00', 240, new Date('2026-03-08T04:30:00Z'), 300), '2026-03-08T13:00:00.000Z');
});
