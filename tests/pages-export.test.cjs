const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildPages, assets } = require('../scripts/build-pages.cjs');
test('Pages仅导出静态白名单、声明静态模式，四页导航兼容仓库子路径', t => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'night-pages-export-'));
  t.after(() => {
    assert.ok(path.resolve(target).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(target, { recursive: true, force: true });
  });
  buildPages(target);
  assert.deepEqual(fs.readdirSync(target).sort(), [...assets, '.nojekyll'].sort());
  for (const file of assets.filter(name => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(target, file), 'utf8');
    assert.ok(html.includes('name="night-owl-mode" content="static"'));
    assert.ok(html.includes('class="static-mode '));
    assert.doesNotMatch(html, /href="\//);
    for (const link of ['./', 'tasks.html', 'reasons.html', 'radio.html']) assert.ok(html.includes(`href="${link}"`));
  }
  assert.ok(!fs.readFileSync(path.join(target, 'tasks.html'), 'utf8').includes('或设定明早的邮件提醒'));
  assert.ok(!fs.readFileSync(path.join(target, 'reasons.html'), 'utf8').includes('也给相似的心事投一票'));
  fs.writeFileSync(path.join(target, 'unexpected-private-data.json'), 'must not publish');
  assert.throws(() => buildPages(target), /非发布文件/);
});
