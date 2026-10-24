const { test } = require('node:test');
const assert = require('node:assert/strict');
const { options, tally, validVote } = require('../poll-core.js');
const vote = id => ({ version: 1, id, at: '2026-10-24T16:00:00.000Z' });
test('示例总数与百分比一致', () => {
  assert.equal(tally(null).total, 1024);
  assert.equal(tally(null).rows.reduce((sum, o) => sum + o.percent, 0), 100);
});
test('每种选择只增加一票，改票不增加总量', () => {
  for (const option of options) {
    const result = tally(vote(option.id));
    assert.equal(result.total, 1025);
    assert.equal(result.rows.find(o => o.id === option.id).count, option.votes + 1);
    assert.equal(result.rows.reduce((sum, o) => sum + o.percent, 0), 100);
    assert.deepEqual(tally(vote(option.id)), result);
  }
});
test('撤回恢复示例，非法记录不参与统计', () => {
  for (const invalid of [null, {}, [], { version: 1, id: 'invalid', at: new Date().toISOString() }, { ...vote(options[0].id), at: 'bad' }, { ...vote(options[0].id), version: 2 }]) {
    assert.equal(validVote(invalid), null);
    assert.equal(tally(invalid).total, 1024);
  }
  assert.equal(tally(null).total, 1024);
});
