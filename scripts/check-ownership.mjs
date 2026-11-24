// 役割ごとに「編集してよいパス」を守っているかの事後チェック。
// 指示書や権限設定（.claude/settings.json）をすり抜けた変更も、ここで拾う。
//
// 使い方: node scripts/check-ownership.mjs <claude|codex> [base-ref]
//   - 作業ツリーの変更（未コミット・追跡外ファイルを含む）を検査する
//   - base-ref を渡すと、base-ref から現在の作業ツリーまでの差分も検査する
//   - ownership.json の "human" に当たるパスは、どの役割からも編集できない（役割の許可より優先）
//   - どれにも載っていないパスは、役割の担当外として扱う
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { reportAndExit } from './lib/docs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { human = [], ...roles } = JSON.parse(readFileSync(new URL('./ownership.json', import.meta.url), 'utf8'));
const [role, base] = process.argv.slice(2);

if (!role || !(role in roles)) {
  console.error(`使い方: node scripts/check-ownership.mjs <${Object.keys(roles).join('|')}> [base-ref]`);
  process.exit(2);
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

let prefix;
try {
  prefix = git('rev-parse', '--show-prefix').trim(); // 親リポジトリの下にある場合のパス補正
} catch {
  console.error('git リポジトリではありません。先に git init してください。');
  process.exit(2);
}

function changedFiles() {
  const files = new Set();

  // -z: NUL 区切り。リネーム／コピーは「新パス, 旧パス」の2要素になるので、旧パスも変更として数える。
  const entries = git('status', '--porcelain=v1', '-z', '-uall', '--', '.').split('\0').filter(Boolean);
  for (let i = 0; i < entries.length; i += 1) {
    files.add(entries[i].slice(3));
    if (/[RC]/.test(entries[i].slice(0, 2))) files.add(entries[(i += 1)]);
  }

  if (base) {
    for (const file of git('diff', '--name-only', '-z', base, '--', '.').split('\0').filter(Boolean)) {
      files.add(file);
    }
  }

  return [...files].map((file) => (prefix && file.startsWith(prefix) ? file.slice(prefix.length) : file)).sort();
}

const toRegExp = (glob) =>
  new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
      .replace(/\*\*/g, '\0')
      .replace(/\*/g, '[^/]*')
      .replace(/\0/g, '.*')}$`,
  );

const mine = roles[role].map(toRegExp);
const humanOnly = human.map(toRegExp);
const files = changedFiles();
const handoffDir = role === 'claude' ? 'handoff/to-codex/' : 'handoff/to-claude/';

const violations = [];
for (const file of files) {
  if (humanOnly.some((pattern) => pattern.test(file))) {
    violations.push({ message: `${file}（人間の領域）`, fix: '変更を元に戻す。必要な変更は人間に依頼する（エージェントは自分を縛る指示・権限・検査を編集しない）' });
  } else if (!mine.some((pattern) => pattern.test(file))) {
    violations.push({ message: `${file}（${role} の担当外）`, fix: `変更を元に戻す。必要な変更は ${handoffDir} に依頼を書いて担当者に渡す` });
  }
}

if (violations.length > 0) reportAndExit(`${role} の編集範囲外の変更`, violations);
console.log(`OK: ${role} の変更 ${files.length} 件はすべて編集範囲内`);
