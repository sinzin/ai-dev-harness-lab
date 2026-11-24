---
description: 設計書から、Codex への実装引き渡しメモを作る
argument-hint: DES-001 [small]
---
$ARGUMENTS の設計書を読み、`docs/templates/handoff.template.md` に従って `handoff/to-codex/` に引き渡しメモを作成してください。

- 先に設計書の `status` を確認する。`approved` でなければメモは作らず、その旨を報告して止まる。
- 引数に `small` があれば `size: small`（`docs/00-workflow.md` §5）。既存の approved な設計書の範囲内の変更であることを確認し、範囲を超えるなら通常の工程に戻すよう人間に伝えて止まる。
- ファイル名は `HO-<設計書と同じ番号>-<slug>.md`。
- 実装範囲・範囲外・完了条件を書く。設計書にない仕様を足さない。
- 未確定事項があれば、メモには書かず人間に質問する（Codex に推測させない）。
