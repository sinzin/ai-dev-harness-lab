#!/usr/bin/env bash
# 「完了」の定義。Codex は実装後にこれが通るまで終えない。
# 速く決定的なものを先に置く（失敗が早く分かり、遅い検査に進まずに済む）。
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 1/4 構文チェック =="
for file in site/*.js scripts/*.mjs scripts/lib/*.mjs tests/*.mjs .claude/hooks/*.mjs; do
  node --check "$file"
done

echo "== 2/4 ハーネスの整合性 =="
node scripts/check-harness.mjs

echo "== 3/4 自動テスト =="
node --test tests/*.test.mjs

echo "== 4/4 要件 → 設計 → テストのつながり =="
node scripts/check-traceability.mjs

echo "verify: OK"
