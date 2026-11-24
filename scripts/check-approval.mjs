// 承認ゲートの機械チェック。
//   1. status が approved に変わっていない（approved にできるのは人間だけ）
//   2. approved の文書の内容が、承認なしに変わっていない（承認済みは凍結。直すなら draft に戻して再承認）
// 基準コミット（既定は HEAD）と作業ツリーを比べる。人間は承認を「status を変えるだけの単独コミット」で行い、
// そのあとでエージェントを動かす。
//
// 使い方: node scripts/check-approval.mjs [base-ref]
import { execFileSync } from 'node:child_process';
import { listFiles, readText, reportAndExit, root, statusOf } from './lib/docs.mjs';

const ref = process.argv[2] ?? 'HEAD';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

let prefix;
try {
  prefix = git('rev-parse', '--show-prefix').trim();
} catch {
  console.error('git リポジトリではありません。先に git init してください。');
  process.exit(2);
}

try {
  git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
} catch {
  if (ref === 'HEAD') {
    console.log('SKIP: 基準コミットがまだありません。承認ゲートは未検査です（最初に基準コミットを作ってください）');
    process.exit(0);
  }
  console.error(`基準 ${ref} が見つかりません。`);
  process.exit(2);
}

const baseText = (file) => {
  try {
    return git('show', `${ref}:${prefix}${file}`);
  } catch {
    return null; // 基準に存在しない（新規ファイル）
  }
};

const violations = [];
for (const file of [...listFiles('docs/requirements', '.md'), ...listFiles('docs/design', '.md')]) {
  const text = readText(file);
  const before = baseText(file);
  const now = statusOf(text);
  const was = before === null ? null : statusOf(before);

  if (now === 'approved' && was !== 'approved') {
    violations.push({
      message: `${file}: status が approved に変わっています（${was ?? '新規'} → approved）`,
      fix: 'status を元に戻し、人間に承認を依頼する（承認は人間が確認して、status を変えるだけの単独コミットで行う）',
    });
  } else if (now === 'approved' && text !== before) {
    violations.push({
      message: `${file}: 承認済みの文書の内容が変わっています`,
      fix: 'status を draft に戻してから直し、人間に再承認を依頼する（承認済みは凍結）',
    });
  }
}

if (violations.length > 0) reportAndExit('承認ゲートの違反', violations);
console.log(`OK: 承認ゲートに違反なし（基準 ${ref}）`);
