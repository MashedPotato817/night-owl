const fs = require('node:fs');
const path = require('node:path');
const assets = ['index.html', 'tasks.html', 'reasons.html', 'radio.html', 'styles.css', 'pages.css', 'bedtime-tasks.css', 'reasons.css', 'sleep-content.css', 'app.js', 'poll-core.js', 'site.js', 'bedtime-tasks.js', 'reasons.js', 'sleep-content.js'];
function buildPages(destination = path.join(__dirname, '..', '_site')) {
  const source = path.resolve(__dirname, '..');
  const target = path.resolve(destination);
  if (target === source) throw new Error('发布目录不能覆盖源码');
  fs.mkdirSync(target, { recursive: true });
  const allowed = new Set([...assets, '.nojekyll']);
  if (fs.readdirSync(target).some(name => !allowed.has(name))) throw new Error('发布目录存在非发布文件，请选择空目录');
  for (const name of assets) {
    let content = fs.readFileSync(path.join(source, name), 'utf8');
    if (name.endsWith('.html')) {
      content = content.replace('<body class="', '<body class="static-mode ').replace('<head>', '<head>\n  <meta name="night-owl-mode" content="static">')
        .replace(/href="\/(tasks\.html|reasons\.html|radio\.html)?"/g, (_, file) => `href="${file || './'}"`);
      if (name === 'tasks.html') content = content.replace('选择本机保存，或设定明早的邮件提醒。', '写完后保存到本浏览器，明天再回来查看。');
      if (name === 'reasons.html') content = content.replaceAll('工作、期待、一些没说完的话。写下睡不着的原因，也给相似的心事投一票。', '工作、期待、一些没说完的话。这个房间留给长夜里的心事。').replace(/<aside class="page-companion">[\s\S]*?<\/aside>/, '');
    }
    fs.writeFileSync(path.join(target, name), content);
  }
  fs.writeFileSync(path.join(target, '.nojekyll'), '');
  return target;
}
if (require.main === module) console.log(`Pages artifact: ${buildPages()}`);
module.exports = { buildPages, assets };
