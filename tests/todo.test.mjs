// テスト名の [FR-xxx] / [NFR-xxx] タグが、要件とのつながり（トレーサビリティ）になる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addTask,
  toggleTask,
  removeTask,
  filterTasks,
  countActive,
  serialize,
  deserialize,
} from '../site/todo.js';

const meta = (n) => ({ id: `t${n}`, now: 1000 + n });
const sample = () => [
  { id: 'a', title: 'A', done: false, createdAt: 1 },
  { id: 'b', title: 'B', done: true, createdAt: 2 },
  { id: 'c', title: 'C', done: false, createdAt: 3 },
];

test('[FR-001] 前後の空白を除いて末尾に追加する', () => {
  const next = addTask(sample(), '  牛乳を買う  ', meta(1));
  assert.equal(next.length, 4);
  assert.deepEqual(next[3], { id: 't1', title: '牛乳を買う', done: false, createdAt: 1001 });
});

test('[FR-001] 空・空白のみ（全角スペース含む）は追加せず同じ配列を返す', () => {
  const tasks = sample();
  for (const raw of ['', '   ', '\t\n', '　　', null, undefined]) {
    assert.equal(addTask(tasks, raw, meta(9)), tasks);
  }
});

test('[FR-001] 元の配列を変更しない', () => {
  const tasks = sample();
  const before = structuredClone(tasks);
  addTask(tasks, 'x', meta(1));
  assert.deepEqual(tasks, before);
});

test('[FR-002] 指定した id の done だけを反転する', () => {
  const next = toggleTask(sample(), 'a');
  assert.deepEqual(next.map((t) => t.done), [true, true, false]);
  assert.deepEqual(toggleTask(next, 'a').map((t) => t.done), [false, true, false]);
});

test('[FR-002] 存在しない id では内容が変わらない', () => {
  assert.deepEqual(toggleTask(sample(), 'zzz'), sample());
});

test('[FR-003] 指定した id のタスクだけを取り除く', () => {
  assert.deepEqual(removeTask(sample(), 'b').map((t) => t.id), ['a', 'c']);
  assert.deepEqual(removeTask(sample(), 'zzz'), sample());
});

test('[FR-004] all / active / done で絞り込む', () => {
  const tasks = sample();
  assert.deepEqual(filterTasks(tasks, 'all').map((t) => t.id), ['a', 'b', 'c']);
  assert.deepEqual(filterTasks(tasks, 'active').map((t) => t.id), ['a', 'c']);
  assert.deepEqual(filterTasks(tasks, 'done').map((t) => t.id), ['b']);
});

test('[FR-004] 未知のフィルタは all として扱う', () => {
  assert.equal(filterTasks(sample(), 'unknown').length, 3);
});

test('[FR-005] serialize → deserialize で元に戻る', () => {
  assert.deepEqual(deserialize(serialize(sample())), sample());
});

test('[FR-005] 壊れた保存データは空配列になる', () => {
  for (const bad of [null, '', '{', '{}', '"x"', '123']) {
    assert.deepEqual(deserialize(bad), [], `入力: ${bad}`);
  }
});

test('[FR-005] 形式の合わない要素だけを捨てる', () => {
  const json = JSON.stringify([...sample(), { id: 1, title: 'x' }, null, 'str']);
  assert.deepEqual(deserialize(json), sample());
});

test('[FR-006] 未完了だけを数える（絞り込みとは独立）', () => {
  assert.equal(countActive(sample()), 2);
  assert.equal(countActive([]), 0);
});
