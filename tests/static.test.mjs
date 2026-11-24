// DOM を動かさずに確認できる範囲の静的・構造チェック。画面の動作は設計書の手動確認（M-1〜M-5）で見る。
// 失敗メッセージは「何が違反で、どう直すか」を書く。読むのはエージェントなので、そのまま行動できる文にする。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = fileURLToPath(new URL('../site/', import.meta.url));
const read = (name) => readFileSync(join(siteDir, name), 'utf8');
const siteFiles = readdirSync(siteDir).filter((name) => /\.(html|css|js)$/.test(name));
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('[NFR-001] site/ のファイルは外部URLを参照しない', () => {
  for (const name of siteFiles) {
    assert.doesNotMatch(
      read(name),
      /https?:\/\//,
      `${name} に外部URLがあります。外部リソースは使わず、必要なものは site/ 内に置いてください（NFR-001）`,
    );
  }
});

test('[NFR-001] index.html が読み込むのは相対パスの style.css と app.js だけ', () => {
  const refs = [...read('index.html').matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    refs.sort(),
    ['app.js', 'style.css'],
    'index.html が想定外のファイルを読み込んでいます。外部の script / stylesheet を足さず、既存の style.css と app.js に書いてください（NFR-001）',
  );
});

test('[NFR-002] 言語の宣言があり、入力欄にラベルが結び付いている', () => {
  const html = read('index.html');
  assert.match(html, /<html[^>]*\slang="ja"/, '<html> に lang="ja" を付けてください（NFR-002）');
  assert.match(html, /<label[^>]*\sfor="new-title"/, '入力欄に <label for="new-title"> を付けてください（NFR-002）');
  assert.match(html, /<input[^>]*\sid="new-title"/, '入力欄の id を new-title にしてください（NFR-002）');
});

test('[NFR-002] 件数表示は aria-live で通知され、絞り込みボタンは aria-pressed を持つ', () => {
  const html = read('index.html');
  const countTag = html.match(/<[^>]*id="active-count"[^>]*>/)?.[0] ?? '';
  assert.match(countTag, /aria-live="polite"/, '#active-count に aria-live="polite" を付けてください（NFR-002）');
  const pressed = html.match(/<button[^>]*data-filter="[^"]+"[^>]*aria-pressed="[^"]+"/g) ?? [];
  assert.equal(pressed.length, 3, '絞り込みの 3 つのボタンすべてに aria-pressed を付けてください（NFR-002）');
});

test('[NFR-003] todo.js は import を持たない純粋関数だけで、ブラウザ API に触れない', () => {
  const code = stripComments(read('todo.js'));
  assert.doesNotMatch(
    code,
    /^\s*import\s/m,
    'todo.js が import を持っています。純粋関数だけにして、依存する処理は app.js に置いてください（NFR-003, DES-001 構成）',
  );
  assert.doesNotMatch(
    code,
    /\b(document|window|localStorage|sessionStorage|navigator|fetch)\b/,
    'todo.js がブラウザ API を参照しています。DOM・保存・通信の処理は app.js に移してください（NFR-003, DES-001 構成）',
  );
});

test('[DES-001] タイトルは textContent で描画する（HTML 文字列を組み立てない）', () => {
  assert.doesNotMatch(
    stripComments(read('app.js')),
    /innerHTML|outerHTML|insertAdjacentHTML|document\.write/,
    'app.js が HTML 文字列を組み立てています。createElement と textContent を使ってください（DES-001 画面・振る舞い。XSS 対策）',
  );
});
