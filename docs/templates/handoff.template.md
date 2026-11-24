---
id: HO-000
design: DES-000
size: normal   # normal | small（小さな変更。00-workflow.md §5）
from: claude
to: codex
---
# HO-000 実装依頼: （題名）

## 目的
<!-- 1 文 -->

## 読む順番
1. `docs/requirements/…`
2. `docs/design/…`（approved であること）

## 実装範囲
## 範囲外
<!-- やってはいけないこと、触ってはいけないファイル -->

## 完了条件
- `npm run verify` が成功する
- `npm run check:owner -- codex` と `npm run check:approval` が成功する
- 設計書の手動確認（M-n）の結果を報告に書く

## 未確定事項
<!-- 無ければ「なし」。あれば止まって handoff/to-claude/ に質問を書く -->
