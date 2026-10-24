(() => {
  'use strict';
  const mount = document.getElementById('sleep-reasons');
  if (!mount) return;
  mount.classList.add('reasons-window', 'window');
  mount.innerHTML = `<div class="window-bar"><span>夜猫子留言板 / 睡不着的原因</span><span aria-hidden="true">✦</span></div>
    <div class="reasons-body"><h2>今晚，是什么让你醒着？</h2>
    <p class="reasons-hint">这里的分享和票数来自同一服务器的访客。公开留言，请勿填写姓名、邮箱或其他隐私。</p>
    <form class="reasons-form"><label for="reason-text">分享你的原因 <span>（最多 280 字）</span></label>
    <textarea id="reason-text" name="reason" rows="3" maxlength="280" required placeholder="比如：脑海里还在回放今天的对话……"></textarea>
    <div class="reasons-actions"><button class="primary" type="submit">匿名分享 ↗</button><button class="reasons-refresh" type="button">刷新留言</button></div></form>
    <p class="reasons-feedback" role="status" aria-live="polite"></p>
    <p class="reasons-hint">每个浏览器可为每条原因投一票，点击可撤回。使用匿名 Cookie 记票；清除 Cookie 或更换浏览器可绕过限制，票数仅供交流参考。</p>
    <ul class="reasons-list" aria-label="睡不着原因列表"></ul></div>`;
  const form = mount.querySelector('form');
  const textarea = mount.querySelector('textarea');
  const list = mount.querySelector('ul');
  const feedback = mount.querySelector('[role="status"]');
  const refresh = mount.querySelector('.reasons-refresh');
  let busy = false;
  let reasons = [];
  const say = text => { feedback.textContent = text; };
  async function request(url, options) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '服务暂时不可用，请稍后重试');
    return data;
  }
  function render() {
    list.replaceChildren();
    if (!reasons.length) {
      const empty = document.createElement('li');
      empty.textContent = '留言板还很安静，来留下第一条原因吧。';
      list.append(empty);
    }
    for (const reason of reasons) {
      const item = document.createElement('li');
      const text = document.createElement('p');
      text.textContent = reason.text;
      const meta = document.createElement('div');
      meta.className = 'reason-meta';
      const time = document.createElement('time');
      time.dateTime = reason.at;
      time.textContent = new Date(reason.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const vote = document.createElement('button');
      vote.type = 'button';
      vote.setAttribute('aria-pressed', String(reason.voted));
      vote.textContent = `${reason.voted ? '撤回共鸣' : '我也一样'} · ${reason.votes} 票`;
      vote.setAttribute('aria-label', `${reason.voted ? '撤回共鸣' : '我也一样'}：${reason.text}，${reason.votes} 票`);
      vote.addEventListener('click', async () => {
        if (busy) return;
        setBusy(true);
        try {
          const data = await request(`/api/reasons/${reason.id}/vote`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: !reason.voted }) });
          reasons = reasons.map(row => row.id === reason.id ? data.reason : row);
          render();
          list.querySelectorAll('button')[reasons.findIndex(row => row.id === reason.id)]?.focus();
          say(data.reason.voted ? '已投下共鸣票。再次点击可撤回。' : '已撤回共鸣票。');
        } catch (error) { say(error.message || '网络连接失败，请重试'); }
        finally { setBusy(false); }
      });
      meta.append(time, vote);
      item.append(text, meta);
      list.append(item);
    }
  }
  function setBusy(value) {
    busy = value;
    mount.querySelectorAll('button').forEach(button => { button.disabled = value; });
    mount.setAttribute('aria-busy', String(value));
  }
  async function load() {
    setBusy(true);
    say('正在读取留言……');
    try { reasons = (await request('/api/reasons')).reasons; render(); say('留言已更新。'); }
    catch { say('暂时无法读取留言，请确认服务已启动，再点击刷新留言。'); }
    finally { setBusy(false); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!textarea.value.trim()) { say('先写一点睡不着的原因吧。'); textarea.focus(); return; }
    setBusy(true);
    try {
      const data = await request('/api/reasons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: textarea.value }) });
      reasons.unshift(data.reason);
      render(); textarea.value = ''; say('已公开分享。愿今晚的心事轻一点。');
    } catch (error) { say(error.message || '网络连接失败，内容已保留，请重试'); }
    finally { setBusy(false); }
  });
  refresh.addEventListener('click', load);
  load();
})();
