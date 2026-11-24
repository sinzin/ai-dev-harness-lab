// Claude Code の Stop フック。Claude が「終わります」と言う直前に、文書まわりの検査を走らせる。
// 失敗したら exit 2 で終了を止め、stderr を Claude に返して直させる。
// 直らない場合に延々と続かないよう、連続 MAX_BLOCKS 回で諦めて、人間向けの警告だけ出して終了させる。
//
// 走らせるのは Claude の担当範囲（要件・設計）の検査だけ:
//   - 要件 → 設計のつながり（--scope=design。テスト漏れは Codex の実装が済むまで見ない）
//   - 承認ゲート（approved にしていないか、承認済みの文書を黙って変えていないか）
// 編集範囲（check:owner）は権限の deny が止めており、他者の未コミットの変更を誤検出するので、ここでは走らせない。
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const MAX_BLOCKS = 2;

let sessionId = 'unknown';
try {
  sessionId = JSON.parse(readFileSync(0, 'utf8')).session_id ?? sessionId;
} catch {
  // 入力が無くても動く
}
const counter = join(tmpdir(), `harness-stop-${String(sessionId).replace(/[^\w-]/g, '_')}.count`);

const checks = [
  ['scripts/check-traceability.mjs', '--scope=design'],
  ['scripts/check-approval.mjs'],
];

const failures = [];
for (const args of checks) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) failures.push(`$ node ${args.join(' ')}\n${(result.stderr || result.stdout).trim()}`);
}

if (failures.length === 0) {
  rmSync(counter, { force: true });
  process.exit(0);
}

const count = (existsSync(counter) ? Number(readFileSync(counter, 'utf8')) || 0 : 0) + 1;
writeFileSync(counter, String(count));
const report = failures.join('\n\n');

if (count > MAX_BLOCKS) {
  rmSync(counter, { force: true });
  console.log(JSON.stringify({ systemMessage: `ハーネスの検査が通らないまま Claude が終了しました（${MAX_BLOCKS} 回差し戻したため）。\n${report}` }));
  process.exit(0);
}

console.error(
  `終了前の検査に失敗しました。直してから終了してください。直せない場合（自分の変更ではない、人間の判断が要る）は、理由を人間に報告してください。\n\n${report}`,
);
process.exit(2);
