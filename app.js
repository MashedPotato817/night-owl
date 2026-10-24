'use strict';
const $ = selector => document.querySelector(selector);
const { options, validVote, tally } = PollCore;
const storageKey = 'night-owl-bedtime-v1';
let vote = null;
let storageAvailable = true;
let confirmAction = null;
try {
  const saved = localStorage.getItem(storageKey);
  try { vote = validVote(JSON.parse(saved)); } catch { vote = null; }
} catch { storageAvailable = false; }
$('#options').innerHTML = options.map((o, i) => `<label class="option" for="vote-${o.id}"><input type="radio" name="reason" id="vote-${o.id}" value="${o.id}" required><span class="option-icon" aria-hidden="true">${o.icon}</span><span class="option-text"><strong>${o.name}</strong><small>${o.copy}</small></span><span class="option-number" aria-hidden="true">0${i + 1}</span></label>`).join('');
function announce(message) { $('#feedback').textContent = message; }
function persist(next) {
  vote = next;
  try { next ? localStorage.setItem(storageKey, JSON.stringify(next)) : localStorage.removeItem(storageKey); storageAvailable = true; }
  catch { storageAvailable = false; }
}
function render() {
  const selected = options.find(o => o.id === vote?.id);
  const { total, rows } = tally(vote);
  $('#identity-feedback').hidden = !selected;
  $('#identity-name').textContent = selected?.identity || '';
  $('#identity-comment').textContent = selected?.comment || '';
  $('#total-label').textContent = `${total.toLocaleString('en-US')} 票 · 示例统计`;
  $('#result-bars').innerHTML = rows.map(o => `<div class="result-row"><div class="result-label"><span>${o.name}${o.id === vote?.id ? '<b class="your-vote">我的选择</b>' : ''}</span><strong>${o.percent}% <small>${o.count} 票</small></strong></div><div class="bar-track" role="meter" aria-label="${o.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${o.percent}" aria-valuetext="${o.count}票，${o.percent}%"><div style="width:${o.percent}%;background:${o.color}"></div></div></div>`).join('');
  $('#receipt-title').textContent = selected ? selected.identity : '夜猫子，请入座。';
  $('#receipt-copy').textContent = selected ? `计划 ${selected.name} 入睡。\n${selected.comment}` : '投下今晚的睡眠计划，\n查收你的专属夜猫子身份。';
  $('#receipt-state').textContent = selected ? (storageAvailable ? '已投递 ✓' : '仅本次会话') : '等待投递';
  $('#receipt-time').textContent = selected ? new Date(vote.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-- : --';
  $('#withdraw').hidden = !vote;
  $('#edit-vote').textContent = vote ? '修改我的选择 ↗' : '我也要投票 ↗';
  $('#submit-vote').textContent = vote ? '更新我的一票 ↗' : '投下我的一票 ↗';
  $('#status-text').textContent = vote ? '已收到 · 谢谢你的深夜信号' : '就绪 · 等待你的深夜信号';
  document.querySelectorAll('input[name="reason"]').forEach(input => { input.checked = input.value === vote?.id; });
  $('#submit-vote').disabled = !vote;
}
function showView(view, focus = false) {
  const results = view === 'results';
  $('#poll-form').hidden = results;
  $('#results').hidden = !results;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  if (focus) {
    const target = results ? (vote ? $('#identity-name') : $('#result-title')) : $('input[name="reason"]:checked') || $('input[name="reason"]');
    target.setAttribute('tabindex', '-1');
    target.focus();
    if (!results) target.removeAttribute('tabindex');
  }
}
$('#poll-form').addEventListener('change', () => { $('#submit-vote').disabled = !$('input[name="reason"]:checked'); announce(''); });
$('#poll-form').addEventListener('submit', event => {
  event.preventDefault();
  const selected = $('input[name="reason"]:checked');
  if (!selected) return;
  persist({ version: 1, id: selected.value, at: new Date().toISOString() });
  render(); showView('results', true);
  announce(storageAvailable ? '投票成功！你的选择已保存在本浏览器。' : '投票成功。浏览器存储不可用，刷新后记录可能丢失。');
});
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view, true)));
$('#peek').addEventListener('click', () => showView('results', true));
$('#edit-vote').addEventListener('click', () => { showView('vote', true); announce('选好后提交，即可更新你的这一票。'); });
function openDialog(title, copy, action = null, confirm = '知道了') {
  $('#dialog-title').textContent = title; $('#dialog-caption').textContent = action ? '投票管理' : 'night_owl / message';
  $('#dialog-copy').textContent = copy; $('#dialog-confirm').textContent = confirm;
  $('#dialog-cancel').hidden = !action; confirmAction = action; $('#dialog').showModal();
}
$('#about').addEventListener('click', () => openDialog('一间留给清醒者的深夜小站。', '夜猫子 BBS 2.0：把待办放进私有清单，设定明早的邮件提醒；公开分享清醒的原因，或者找一段陪伴入眠的声音。\n\n清单和邮箱只供你的浏览器凭据访问；原因分享是公开内容，请勿填写隐私。提醒需要站点配置邮件服务并保持运行。\n\n作息投票使用明确标注的示例统计。愿你今晚安心入眠。'));
$('#withdraw').addEventListener('click', () => openDialog('要收回这份深夜心事吗？', '撤回后，将删除本浏览器的选票与时间记录。你随时可以重新投票。', () => { persist(null); render(); showView('vote', true); announce(storageAvailable ? '已撤回，你可以重新选择。' : '已在当前会话撤回，但浏览器存储不可用，旧记录可能仍存在。'); }, '确认撤回'));
$('#goodnight').addEventListener('click', () => openDialog('今天就到这里吧。晚安 ☾', '把没做完的事留给明天，把这一刻留给自己。\n\n放下屏幕，舒展一下肩膀。愿你今晚睡个好觉。', null, '给今天画个句号 ✓'));
$('#close-dialog').addEventListener('click', () => $('#dialog').close());
$('#dialog-cancel').addEventListener('click', () => $('#dialog').close());
$('#dialog-confirm').addEventListener('click', () => { const action = confirmAction; $('#dialog').close(); confirmAction = null; action?.(); });
const notes = ['今天已经很努力了。\n剩下的事，明天再说也可以。', '不是每一天都要满分。\n平平安安地度过，也很了不起。', '夜晚可以留一点给自己。\n也记得，留一点温柔给明天。'];
let noteIndex = 0;
$('#note-copy').setAttribute('aria-live', 'polite');
$('#next-note').addEventListener('click', () => { noteIndex = (noteIndex + 1) % notes.length; $('#note-copy').textContent = notes[noteIndex]; $('.note-top span:last-child').textContent = `0${noteIndex + 1} / 03`; });
function clock() { const now = new Date(); $('#clock').textContent = now.toLocaleTimeString('zh-CN', { hour12: false }); $('#clock').dateTime = now.toISOString(); }
window.addEventListener('storage', event => { if (event.key !== storageKey && event.key !== null) return; try { vote = validVote(JSON.parse(event.newValue)); } catch { vote = null; } render(); showView(vote ? 'results' : 'vote'); announce('本浏览器的投票记录已同步。'); });
render(); showView(vote ? 'results' : 'vote'); clock(); setInterval(clock, 1000);
if (!storageAvailable) announce('浏览器存储不可用，本次投票可能无法在刷新后恢复。');
