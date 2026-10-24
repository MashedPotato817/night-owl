(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('dialog');
  $('about').addEventListener('click', () => {
    $('dialog-caption').textContent = 'night_owl / message';
    $('dialog-title').textContent = '一间留给清醒者的深夜小站。';
    $('dialog-copy').textContent = '夜猫子 BBS 3.0：今晚几点睡、私有睡前清单、公开的清醒心事，还有陪伴夜晚的声音。用顶部导航，去想去的房间。\n\n清单和邮箱仅供你的浏览器凭据访问；原因分享是公开内容，请勿填写隐私。邮件提醒需要站点配置邮件服务并保持运行。\n\n愿你有属于自己的夜晚，也有安心入睡的时刻。';
    if (document.querySelector('meta[name="night-owl-mode"]')?.content === 'static') $('dialog-copy').textContent = '当前为 GitHub Pages 静态演示。\n\n作息示例投票、本机睡前清单、助眠链接可用。邮件提醒、共享心事与共鸣投票需要服务端，当前未开放。\n\n本机数据仅保存在当前浏览器。愿你今晚安心入眠。';
    $('dialog-confirm').textContent = '知道了';
    dialog.showModal();
  });
  for (const id of ['close-dialog', 'dialog-confirm', 'dialog-cancel']) $(id).addEventListener('click', () => dialog.close());
  function clock() {
    const now = new Date();
    $('clock').textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
    $('clock').dateTime = now.toISOString();
  }
  clock(); setInterval(clock, 1000);
})();
