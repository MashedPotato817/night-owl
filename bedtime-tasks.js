(() => {
  'use strict';
  const mount = document.getElementById('bedtime-tasks');
  if (!mount) return;
  mount.classList.add('window', 'bedtime-window');
  mount.innerHTML = `<div class="window-bar"><span>✉ 睡前任务清单 / tomorrow.txt</span><span aria-hidden="true">─ □ ×</span></div>
    <div class="bedtime-body"><h2 id="tasks-heading">把没做完的事，交给明天。</h2>
    <p>清单只凭本浏览器的私有凭据访问。请勿在共用设备记录敏感内容；服务端保存明文，不是端到端加密。</p>
    <form id="tasks-form"><label for="tasks-items">今天还没做完的事 <small>每行一件，最多 30 件，每件 300 字</small></label>
    <textarea id="tasks-items" rows="5" maxlength="10000" placeholder="回复那封邮件&#10;把方案的最后一页补完" required></textarea>
    <div class="tasks-fields"><label for="tasks-email">提醒邮箱<input id="tasks-email" type="email" maxlength="254" autocomplete="email" placeholder="you@example.com"></label>
    <label for="tasks-time">明天几点提醒<input id="tasks-time" type="time" value="09:00" required></label></div>
    <p id="tasks-timezone" class="fineprint"></p><p id="tasks-config" class="tasks-config"></p>
    <div class="tasks-actions"><button type="button" id="tasks-draft">保存到本浏览器</button><button class="primary" id="tasks-schedule" type="submit" disabled>安排明天的邮件 ↗</button><button type="button" id="tasks-delete">删除清单与提醒</button></div>
    </form><p id="tasks-status" role="status" aria-live="polite"></p>
    <p class="fineprint">关闭网页后，提醒服务仍须运行才能按时发送。服务重启后会补发到期提醒。清除浏览器数据会丢失访问凭据；邮件已被接收后无法撤回。</p></div>`;
  const $ = id => document.getElementById(id);
  const fields = { items: $('tasks-items'), email: $('tasks-email'), time: $('tasks-time') };
  const status = $('tasks-status');
  const tokenKey = 'night-owl-tasks-token-v2';
  const draftKey = 'night-owl-tasks-draft-v2';
  let token = '';
  let configured = false;
  let working = false;
  let storageReady = true;
  let lastReminder = null;
  let hasLocalDraft = false;
  function report(message) { status.textContent = message; }
  function timezone() {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, minutes] = fields.time.value.split(':').map(Number);
    tomorrow.setHours(hours || 0, minutes || 0, 0, 0);
    $('tasks-timezone').textContent = `按本设备时区：${Intl.DateTimeFormat().resolvedOptions().timeZone}，明天 ${tomorrow.toLocaleDateString('zh-CN')} ${fields.time.value || '09:00'}。`;
    return tomorrow.getTimezoneOffset();
  }
  function content() { return { items: fields.items.value.split('\n').map(item => item.trim()).filter(Boolean), email: fields.email.value.trim(), time: fields.time.value }; }
  function input() { return { ...content(), offset: timezone(), currentOffset: new Date().getTimezoneOffset() }; }
  function fill(data) {
    fields.items.value = Array.isArray(data.items) ? data.items.join('\n') : '';
    fields.email.value = typeof data.email === 'string' ? data.email : '';
    fields.time.value = /^\d\d:\d\d$/.test(data.time) ? data.time : '09:00'; timezone();
  }
  function describe(reminder) {
    if (!reminder) return '还没有安排邮件提醒。';
    const when = new Date(reminder.scheduledAt).toLocaleString('zh-CN');
    const message = ({ scheduled: `已安排：${when}，发送到 ${reminder.email}。`, sending: '邮件正在发送，请稍候。', sent: `邮件服务已接收（${reminder.email}），请留意收件箱与垃圾邮件；接收不保证实际送达。`, failed: reminder.error })[reminder.status] || '提醒状态未知。';
    const sameContent = JSON.stringify(content()) === JSON.stringify({ items: reminder.items, email: reminder.email, time: reminder.time });
    return message + (sameContent ? '' : ' 当前内容尚未更新到该邮件提醒；重新安排后才会更新。');
  }
  function lock(value) {
    working = value;
    for (const element of $('tasks-form').elements) element.disabled = value;
    $('tasks-schedule').disabled = value || !configured || !storageReady;
  }
  async function api(path, method = 'GET', body) {
    const response = await fetch(path, { method, cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '请求未成功，请稍后重试');
    return result;
  }
  try {
    token = localStorage.getItem(tokenKey) || '';
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch { report('本地草稿已损坏，请重新填写。'); }
    if (draft && Array.isArray(draft.items)) { fill(draft); hasLocalDraft = true; }
    localStorage.setItem('night-owl-storage-test', '1'); localStorage.removeItem('night-owl-storage-test');
  } catch { storageReady = false; report('浏览器存储不可用，当前内容仅在此页面保留，无法安排可管理的私有提醒。'); }
  const signature = () => JSON.stringify([fields.items.value, fields.email.value, fields.time.value]);
  let savedState = signature();
  window.addEventListener('beforeunload', event => {
    if (signature() !== savedState) { event.preventDefault(); event.returnValue = ''; }
  });
  timezone(); fields.time.addEventListener('change', timezone);
  $('tasks-draft').addEventListener('click', () => {
    try { localStorage.setItem(draftKey, JSON.stringify(input())); hasLocalDraft = true; savedState = signature(); report('已保存到本浏览器。' + (lastReminder ? ' 现有邮件提醒未更改。' + describe(lastReminder) : '尚未安排邮件。')); }
    catch { report('浏览器保存失败，请先复制清单备份。'); }
  });
  $('tasks-form').addEventListener('submit', async event => {
    event.preventDefault(); if (working || !configured || !storageReady) return;
    const data = input();
    if (!data.items.length || data.items.length > 30 || data.items.some(item => item.length > 300)) return report('请填写 1–30 件事，每件最多 300 字。');
    if (!data.email) { fields.email.focus(); return report('请填写接收提醒的邮箱。'); }
    lock(true);
    try {
      if (!token) {
        const session = await api('/api/tasks/session', 'POST');
        localStorage.setItem(tokenKey, session.token); token = session.token;
      }
      lastReminder = (await api('/api/tasks', 'PUT', data)).reminder;
      savedState = signature();
      report(describe(lastReminder));
      try { localStorage.setItem(draftKey, JSON.stringify(data)); hasLocalDraft = true; } catch { report(describe(lastReminder) + ' 本地副本保存失败。'); }
    } catch (error) { report(error.message || '连接失败，未确认安排成功。'); }
    finally { lock(false); }
  });
  $('tasks-delete').addEventListener('click', async () => {
    if (working || !window.confirm('删除本浏览器的清单和服务器上的待发送提醒？已发送邮件无法撤回。')) return;
    lock(true);
    try {
      if (token) await api('/api/tasks', 'DELETE');
      localStorage.removeItem(draftKey); localStorage.removeItem(tokenKey); token = ''; lastReminder = null; hasLocalDraft = false;
      fill({}); savedState = signature(); report('已删除清单与待发送提醒。');
    } catch (error) { report(error.message || '删除未确认成功，请重试。'); }
    finally { lock(false); }
  });
  async function refresh(initial = false) {
    if (working) return;
    try {
      if (initial) {
        configured = (await api('/api/tasks/config')).configured;
        $('tasks-config').textContent = configured ? '邮件服务已配置，可安排次日提醒。' : '邮件服务未配置：可保存本浏览器清单，暂不能安排邮件。';
        lock(false);
      }
      if (token) {
        const reminder = (await api('/api/tasks')).reminder;
        if (initial && reminder && !hasLocalDraft && signature() === savedState) { fill(reminder); savedState = signature(); }
        if (initial || JSON.stringify(reminder) !== JSON.stringify(lastReminder)) report(describe(reminder));
        lastReminder = reminder;
      }
    } catch {
      if (initial) { $('tasks-config').textContent = '提醒服务连接失败，请通过本地 Node 服务打开本页。'; report('尚未确认服务器上的提醒状态，可稍后刷新重试。'); }
    }
  }
  refresh(true);
  window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 30000);
})();
