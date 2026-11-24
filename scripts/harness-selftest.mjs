// ハーネスの「センサーが本当に鳴るか」を確かめる。
// 検査スクリプトを実際に違反させて（変異）、期待どおり失敗するかを見る。あわせて、何も違反していないときに
// 黙っていること（誤検出しないこと）も見る。「センサーが一度も鳴らないのは、品質が高いからか、検出が甘いからか」
// に答えるための、センサーのテスト。
// 本物のフォルダは触らない。一時ディレクトリにコピーして git 管理下に置き、そこで変異させる。
//
// 使い方: npm run harness:selftest   （ハーネスのファイルを変えたあとに実行する）
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labRoot = fileURLToPath(new URL('..', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'harness-selftest-'));
cpSync(labRoot, work, { recursive: true, filter: (src) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(src) });

const git = (...args) =>
  execFileSync(
    'git',
    ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'commit.gpgsign=false', ...args],
    { cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
git('init', '-q', '-b', 'main');
git('add', '-A');
git('commit', '-q', '-m', 'baseline');
const baseline = git('rev-parse', 'HEAD').trim();

const run = (...cmd) => spawnSync(cmd[0] === 'node' ? process.execPath : cmd[0], cmd.slice(1), { cwd: work, encoding: 'utf8' });
const output = (result) => `${result.stdout}${result.stderr}`.trim();
const edit = (file, fn) => writeFileSync(join(work, file), fn(readFileSync(join(work, file), 'utf8')));
const append = (file, text) => appendFileSync(join(work, file), text);
const write = (file, text) => writeFileSync(join(work, file), text);
const commit = (message) => {
  git('add', '-A');
  git('commit', '-q', '-m', message);
};

const fails = (cmd, text) => () => {
  const result = run(...cmd);
  const out = output(result);
  return result.status !== 0 && out.includes(text) ? null : `期待: 失敗し、出力に「${text}」を含む。実際: exit=${result.status}\n${out}`;
};
const passes = (cmd) => () => {
  const result = run(...cmd);
  return result.status === 0 ? null : `期待: 成功。実際: exit=${result.status}\n${output(result)}`;
};

const TRACE = ['node', 'scripts/check-traceability.mjs'];
const TRACE_DESIGN = ['node', 'scripts/check-traceability.mjs', '--scope=design'];
const OWNER = (role, ...rest) => ['node', 'scripts/check-ownership.mjs', role, ...rest];
const APPROVAL = ['node', 'scripts/check-approval.mjs'];
const HARNESS = ['node', 'scripts/check-harness.mjs'];
const STATIC = ['node', '--test', 'tests/static.test.mjs'];

const DESIGN = 'docs/design/DES-001-todo.md';
const draftRequirement = (status, id) =>
  `---\nid: REQ-002\ntitle: selftest\nstatus: ${status}\n---\n# REQ-002\n\n## 機能要件\n- **${id}** selftest 用の要件。\n`;

const scenarios = [];
const scenario = (group, name, mutate, check) => scenarios.push({ group, name, mutate, check });
const nothing = () => {};

scenario('要件のつながり', '何も違反していない → 黙っている', nothing, passes(TRACE));
scenario('要件のつながり', 'テストのタグを消す → テスト漏れ', () => edit('tests/todo.test.mjs', (s) => s.replace('[FR-006]', '[x]')), fails(TRACE, 'テスト漏れ FR-006'));
scenario('要件のつながり', '同じ状態でも --scope=design ならテスト漏れを見ない', () => edit('tests/todo.test.mjs', (s) => s.replace('[FR-006]', '[x]')), passes(TRACE_DESIGN));
scenario('要件のつながり', '設計書に未定義のIDを書く', () => append(DESIGN, '\n- FR-099\n'), fails(TRACE, '未定義ID FR-099'));
scenario('要件のつながり', '設計の無い approved の要件 → 設計漏れ', () => write('docs/requirements/REQ-002-selftest.md', draftRequirement('approved', 'FR-101')), fails(TRACE, '設計漏れ FR-101'));
scenario('要件のつながり', '設計の無い draft の要件は責めない', () => write('docs/requirements/REQ-002-selftest.md', draftRequirement('draft', 'FR-101')), passes(TRACE));
scenario('要件のつながり', '要件IDの重複', () => write('docs/requirements/REQ-002-selftest.md', draftRequirement('draft', 'FR-001')), fails(TRACE, '重複ID FR-001'));

scenario('編集範囲', '何も変更していない → 黙っている', nothing, passes(OWNER('claude')));
scenario('編集範囲', 'claude が設計書だけ編集 → 黙っている', () => append(DESIGN, '\n'), passes(OWNER('claude')));
scenario('編集範囲', 'claude が site/app.js を編集', () => append('site/app.js', '// x\n'), fails(OWNER('claude'), 'site/app.js（claude の担当外）'));
scenario('編集範囲', 'codex が site/AGENTS.md を編集（人間の領域が優先）', () => append('site/AGENTS.md', '\n'), fails(OWNER('codex'), 'site/AGENTS.md（人間の領域）'));
scenario('編集範囲', 'codex が scripts/ のファイルを site/ へ移動（旧パスも数える）', () => git('mv', 'scripts/verify.sh', 'site/verify.sh'), fails(OWNER('codex'), 'scripts/verify.sh（人間の領域）'));
scenario('編集範囲', 'codex が tests/ に新規ファイルを追加 → 黙っている', () => write('tests/new.test.mjs', '// new\n'), passes(OWNER('codex')));
scenario('編集範囲', 'コミット済みの違反は base-ref を渡せば拾える', () => { append('CLAUDE.md', '\n'); commit('sneaky'); }, fails(OWNER('claude', baseline), 'CLAUDE.md（人間の領域）'));

scenario('承認ゲート', '何も変更していない → 黙っている', nothing, passes(APPROVAL));
scenario('承認ゲート', 'draft の設計書を approved に変える', () => {
  edit(DESIGN, (s) => s.replace('status: approved', 'status: draft'));
  commit('draft');
  edit(DESIGN, (s) => s.replace('status: draft', 'status: approved'));
}, fails(APPROVAL, 'draft → approved'));
scenario('承認ゲート', '承認済みの設計書の内容を黙って変える', () => append(DESIGN, '\n追記\n'), fails(APPROVAL, '承認済みの文書の内容が変わっています'));
scenario('承認ゲート', '承認済みを draft に戻して直す → 黙っている', () => {
  edit(DESIGN, (s) => s.replace('status: approved', 'status: draft'));
  append(DESIGN, '\n追記\n');
}, passes(APPROVAL));

scenario('ハーネスの整合性', 'deny を1つ消す', () => {
  const settings = JSON.parse(readFileSync(join(work, '.claude/settings.json'), 'utf8'));
  settings.permissions.deny = settings.permissions.deny.filter((rule) => rule !== 'Edit(/site/**)');
  write('.claude/settings.json', JSON.stringify(settings));
}, fails(HARNESS, 'Edit(/site/**)'));
scenario('ハーネスの整合性', 'ownership.json に無い deny を足す（担当範囲を塞ぐ）', () => {
  const settings = JSON.parse(readFileSync(join(work, '.claude/settings.json'), 'utf8'));
  settings.permissions.deny.push('Edit(/docs/design/**)');
  write('.claude/settings.json', JSON.stringify(settings));
}, fails(HARNESS, 'Edit(/docs/design/**)'));
scenario('ハーネスの整合性', 'サブエージェントのフィールドを綴り間違える', () => write('.claude/agents/typo.md', '---\nname: typo\ndescription: x\ndisallowedtools: Write\n---\n本文\n'), fails(HARNESS, '未知のフィールド disallowedtools'));
scenario('ハーネスの整合性', 'フックのスクリプトが無い', () => rmSync(join(work, '.claude/hooks/stop-check.mjs')), fails(HARNESS, 'stop-check.mjs'));

scenario('構造テスト', 'app.js が HTML 文字列を組み立てる', () => append('site/app.js', '\ndocument.body.innerHTML = "";\n'), fails(STATIC, 'textContent'));
scenario('構造テスト', 'todo.js がブラウザ API に触る', () => append('site/todo.js', '\nexport const bad = () => localStorage.getItem("x");\n'), fails(STATIC, 'ブラウザ API'));
scenario('構造テスト', 'todo.js が import を持つ', () => edit('site/todo.js', (s) => `import './app.js';\n${s}`), fails(STATIC, 'import を持っています'));
scenario('構造テスト', '外部URLを足す', () => append('site/index.html', '<!-- https://example.com -->\n'), fails(STATIC, '外部URL'));

const stopHook = (sessionId) =>
  spawnSync(process.execPath, ['.claude/hooks/stop-check.mjs'], { cwd: work, input: JSON.stringify({ session_id: sessionId }), encoding: 'utf8' });
const counterFile = (sessionId) => join(tmpdir(), `harness-stop-${sessionId}.count`);

scenario('Stop フック', '違反なし → 終了を許す', nothing, () => {
  const id = `selftest-ok-${process.pid}`;
  const result = stopHook(id);
  rmSync(counterFile(id), { force: true });
  return result.status === 0 ? null : `期待: exit 0。実際: exit=${result.status}\n${output(result)}`;
});
scenario('Stop フック', '違反あり → 2回差し戻し、3回目で諦めて終了を許す', () => append(DESIGN, '\n- FR-099\n'), () => {
  const id = `selftest-ng-${process.pid}`;
  const results = [stopHook(id), stopHook(id), stopHook(id)];
  rmSync(counterFile(id), { force: true });
  const statuses = results.map((r) => r.status).join(',');
  if (statuses !== '2,2,0') return `期待: exit 2,2,0。実際: ${statuses}`;
  if (!results[0].stderr.includes('→ 対処')) return '差し戻しの出力に「→ 対処」が含まれていない';
  return results[2].stdout.includes('systemMessage') ? null : '諦めるときに人間向けの systemMessage を出していない';
});

let failed = 0;
let lastGroup = '';
for (const item of scenarios) {
  git('reset', '-q', '--hard', baseline);
  git('clean', '-fdq');
  item.mutate();
  const problem = item.check();
  if (item.group !== lastGroup) {
    console.log(`\n[${item.group}]`);
    lastGroup = item.group;
  }
  if (problem) {
    failed += 1;
    console.log(`  ✘ ${item.name}\n${problem.split('\n').map((line) => `      ${line}`).join('\n')}`);
  } else {
    console.log(`  ✔ ${item.name}`);
  }
}

rmSync(work, { recursive: true, force: true });
console.log(`\n${scenarios.length - failed}/${scenarios.length} 件で、期待どおりに鳴った（または黙っていた）`);
process.exit(failed === 0 ? 0 : 1);
