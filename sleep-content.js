(() => {
  'use strict';

  const host = document.getElementById('sleep-content');
  if (!host || host.dataset.ready === 'true') return;
  host.dataset.ready = 'true';
  host.classList.add('sleep-content');
  host.setAttribute('aria-labelledby', 'sleep-content-title');

  // Official landing pages only; no players, remote images, or background requests.
  const groups = [
    {
      title: '听一段故事', label: '01 / PODCAST', kind: '英语播客',
      entries: [
        {
          name: 'Sleep With Me', source: 'Sleep With Me 官方网站',
          url: 'https://www.sleepwithmepodcast.com/',
          description: '让漫无目的的闲聊与故事，陪你慢慢结束今天。',
          detail: '英语人声 · 节目含广告，部分内容需订阅',
        },
        {
          name: 'Nothing Much Happens', source: 'Nothing Much Happens 官方网站',
          url: 'https://www.nothingmuchhappens.com/stories',
          description: '从村庄里的小事开始，听一个轻缓的日常故事。',
          detail: '英语人声 · 可浏览节目，部分内容需订阅',
        },
      ],
    },
    {
      title: '让音乐做背景', label: '02 / AMBIENT', kind: '环境音乐',
      entries: [
        {
          name: 'Drone Zone', source: 'SomaFM 官方电台',
          url: 'https://somafm.com/dronezone/',
          description: '以少量节拍和缓缓铺开的声音纹理，填满安静的房间。',
          detail: '环境电子音乐 · 在线电台 · 英文页面',
        },
        {
          name: 'Deep Space One', source: 'SomaFM 官方电台',
          url: 'https://somafm.com/deepspaceone/',
          description: '深空氛围、电子与实验音乐，给今晚留一点漫游的空间。',
          detail: '太空氛围音乐 · 在线电台 · 英文页面',
        },
      ],
    },
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  const bar = element('div', 'window-bar');
  bar.append(element('span', '', '♫ night_radio.exe'));
  const decoration = element('span', 'window-decor', '─　□　×');
  decoration.setAttribute('aria-hidden', 'true');
  bar.append(decoration);

  const body = element('div', 'sleep-content-body');
  body.append(element('p', 'sleep-content-kicker', '晚安资料夹 / GOOD NIGHT LINKS'));
  body.append(element('h2', '', '找一点声音，陪你慢下来。'));
  body.lastChild.id = 'sleep-content-title';
  const note = element('p', 'sleep-content-note', '选一个入口，前往官方页面自行播放。所有链接均在新窗口打开；本站不自动播放。');
  note.id = 'sleep-content-note';
  body.append(note);

  const directory = element('div', 'sleep-content-groups');
  groups.forEach((group, groupIndex) => {
    const section = element('section', 'sleep-content-group');
    const titleId = `sleep-content-group-${groupIndex}`;
    section.setAttribute('aria-labelledby', titleId);
    const heading = element('div', 'sleep-content-group-heading');
    const title = element('h3', '', group.title);
    title.id = titleId;
    heading.append(title, element('span', '', group.label));
    section.append(heading);
    const list = element('ul', 'sleep-content-list');
    group.entries.forEach((entry) => {
      const item = element('li', 'sleep-content-card');
      item.append(element('span', 'sleep-content-kind', group.kind));
      item.append(element('h4', '', entry.name));
      item.append(element('p', 'sleep-content-description', entry.description));
      item.append(element('p', 'sleep-content-detail', entry.detail));
      item.append(element('p', 'sleep-content-source', `来源：${entry.source}`));
      const link = element('a', 'sleep-content-link', '前往官网收听 ↗');
      link.href = entry.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.referrerPolicy = 'no-referrer';
      link.setAttribute('aria-label', `前往 ${entry.name} 官网收听（新窗口打开）`);
      item.append(link);
      list.append(item);
    });
    section.append(list);
    directory.append(section);
  });
  body.append(directory);
  body.append(element('p', 'sleep-content-footnote', '内容仅供放松陪伴。外部网站的访问、广告及订阅规则以对方页面为准。链接核实于 2026-10-24。'));
  host.append(bar, body);
})();
