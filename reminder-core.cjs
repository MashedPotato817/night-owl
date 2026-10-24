const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function tomorrowAt(time, offset, now = new Date(), currentOffset = offset) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isInteger(offset) || Math.abs(offset) > 840 || !Number.isInteger(currentOffset) || Math.abs(currentOffset) > 840) throw new Error('提醒时间无效');
  const local = new Date(now.getTime() - currentOffset * 60000);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, hour, minute) + offset * 60000).toISOString();
}
function createReminderStore({ dataDir, sendMail, configured = false, now = () => new Date() }) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const filename = path.join(dataDir, 'reminders.json');
  let records = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {};
  function persist(next = records) {
    const temp = filename + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(temp, filename);
    records = next;
  }
  // A crash after an outbound request cannot establish whether the provider accepted it.
  for (const record of Object.values(records)) if (record.status === 'sending') {
    record.status = 'failed'; record.error = '发送时服务重启，投递结果未知；请检查邮箱后重新安排。';
  }
  persist();
  const keyFor = token => crypto.createHash('sha256').update(token).digest('hex');
  function authorize(token) {
    if (!/^[a-f0-9]{64}$/.test(token || '')) throw Object.assign(new Error('私有凭据无效'), { status: 401 });
    return keyFor(token);
  }
  function view(record) { return record ? { ...record } : null; }
  let busy = false;
  return {
    configured,
    createSession() { return crypto.randomBytes(32).toString('hex'); },
    get(token) { return view(records[authorize(token)]); },
    save(token, input) {
      const key = authorize(token);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('清单格式无效');
      if (records[key]?.status === 'sending') throw Object.assign(new Error('邮件发送中，请稍后再试'), { status: 409 });
      if (!configured) throw Object.assign(new Error('邮件服务尚未配置，无法安排提醒。清单仍可在此浏览器编辑。'), { status: 503 });
      if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 30 || input.items.some(item => typeof item !== 'string' || !item.trim() || item.length > 300)) throw new Error('请填写 1–30 条事项，每条最多 300 字');
      if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(input.email)) throw new Error('邮箱格式无效');
      if (!records[key] && Object.keys(records).length >= 1000) throw Object.assign(new Error('服务容量已满'), { status: 503 });
      const record = { items: input.items.map(item => item.trim()), email: input.email, time: input.time, offset: input.offset, scheduledAt: tomorrowAt(input.time, input.offset, now(), input.currentOffset), status: 'scheduled', error: '', updatedAt: now().toISOString() };
      persist({ ...records, [key]: record }); return view(records[key]);
    },
    remove(token) {
      const key = authorize(token);
      if (records[key]?.status === 'sending') throw Object.assign(new Error('邮件发送中，请稍后再试'), { status: 409 });
      const next = { ...records }; delete next[key]; persist(next);
    },
    async tick() {
      if (busy || !configured) return;
      busy = true;
      try {
        for (const key of Object.keys(records)) {
          // An earlier delivery awaits network I/O; meanwhile another request may cancel
          // or replace a later reminder. Always inspect its current committed value.
          const record = records[key];
          if (!record || record.status !== 'scheduled' || Date.parse(record.scheduledAt) > now().getTime()) continue;
          const sending = { ...record, status: 'sending' };
          persist({ ...records, [key]: sending });
          let result;
          try { await sendMail(sending, key + '-' + sending.updatedAt); result = { ...sending, status: 'sent', sentAt: now().toISOString(), error: '' }; }
          catch { result = { ...sending, status: 'failed', error: '邮件服务未确认接收，投递可能失败。请检查邮箱后重新安排。' }; }
          try { persist({ ...records, [key]: result }); }
          catch (error) {
            // Outbound mail may already exist. Never retry blindly after a state-write failure.
            records = { ...records, [key]: { ...sending, status: 'failed', error: '投递结果无法保存，请检查邮箱后重新安排。' } };
            throw error;
          }
        }
      } finally { busy = false; }
    }
  };
}
function createMailTransport(env = process.env) {
  const configured = Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
  return { configured, async sendMail(record, idempotencyKey) {
    if (!configured) throw new Error('Mail not configured');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [record.email], subject: '夜猫子 BBS：留给今天的待办清单', text: '昨晚的你，把这些事情交给了今天：\n\n' + record.items.map((item, i) => `${i + 1}. ${item}`).join('\n') + '\n\n慢慢来，一次完成一件。' })
    });
    if (!response.ok) throw new Error('Mail provider rejected request');
    const body = await response.json();
    if (!body.id) throw new Error('No provider confirmation');
  } };
}
module.exports = { tomorrowAt, createReminderStore, createMailTransport };
