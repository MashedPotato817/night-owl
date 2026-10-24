(function (root) {
  'use strict';
  const options = [
    { id: 'before23', icon: '☀', name: '23 点前', copy: '早点下线，把好梦提前签收', identity: '好梦先行官', comment: '月亮刚上班，你已经准备打卡下班。', votes: 123, color: '#b7c99a' },
    { id: '23to00', icon: '☾', name: '23:00 – 00:00', copy: '赶在今天结束前，说一句晚安', identity: '午夜守门员', comment: '在今天与明天之间，认真按下保存键。', votes: 256, color: '#a9b9df' },
    { id: '00to01', icon: '✦', name: '00:00 – 01:00', copy: '再给自己一点点自由时间', identity: '月光收藏家', comment: '把白天没来得及享受的小快乐，装进口袋。', votes: 328, color: '#b8a2d0' },
    { id: '01to02', icon: '▣', name: '01:00 – 02:00', copy: '夜深了，我的窗口还亮着', identity: '灵感值班员', comment: '再写一行就睡，也记得给自己留个休止符。', votes: 225, color: '#dcba83' },
    { id: 'after02', icon: '☄', name: '02:00 以后', copy: '收到来自深夜频道的同类信号', identity: '银河巡夜员', comment: '宇宙很大，今晚的任务也可以明天继续。', votes: 92, color: '#9ac8c6' }
  ];
  function validVote(value) {
    return value && value.version === 1 && options.some(o => o.id === value.id) && typeof value.at === 'string' && Number.isFinite(Date.parse(value.at)) ? { version: 1, id: value.id, at: value.at } : null;
  }
  function tally(vote) {
    const safeVote = validVote(vote);
    const rows = options.map(o => ({ ...o, count: o.votes + (safeVote?.id === o.id ? 1 : 0) }));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const rounded = rows.map((row, index) => ({ index, fraction: row.count * 100 / total % 1, percent: Math.floor(row.count * 100 / total) }));
    let remaining = 100 - rounded.reduce((sum, row) => sum + row.percent, 0);
    [...rounded].sort((a, b) => b.fraction - a.fraction || a.index - b.index).forEach(row => { if (remaining-- > 0) rounded[row.index].percent++; });
    return { total, rows: rows.map((row, i) => ({ ...row, percent: rounded[i].percent })) };
  }
  const api = { options, validVote, tally };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PollCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
