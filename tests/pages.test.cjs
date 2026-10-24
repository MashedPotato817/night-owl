const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server.cjs');

test('独立页面可直接访问和刷新，导航一致且只加载本页业务脚本', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'night-pages-'));
  const { server } = createApp({ dataDir });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pages = [
    ['/', '今晚几点睡', ['poll-core.js', 'app.js']],
    ['/tasks.html', '睡前清单', ['site.js', 'bedtime-tasks.js']],
    ['/reasons.html', '清醒心事', ['site.js', 'reasons.js']],
    ['/radio.html', '助眠电台', ['site.js', 'sleep-content.js']]
  ];
  for (const [route, title, expectedScripts] of pages) {
    for (let reload = 0; reload < 2; reload++) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`<title>${title} · 夜猫子 BBS</title>`));
      assert.deepEqual([...html.matchAll(/<script defer src="([^"]+)"/g)].map(match => match[1]), expectedScripts);
      const nav = html.match(/<nav aria-label="主导航">(.*?)<\/nav>/)[1];
      assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
      for (const [target, label] of pages) assert.ok(nav.includes(`href="${target}"`) && nav.includes(label));
      for (const resource of [...expectedScripts, 'styles.css', 'pages.css']) assert.equal((await fetch(base + '/' + resource)).status, 200);
    }
  }
  assert.equal((await fetch(base + '/unlisted.html')).status, 404);
  assert.equal((await fetch(base + '/.night-owl-data/reminders.json')).status, 404);
});
