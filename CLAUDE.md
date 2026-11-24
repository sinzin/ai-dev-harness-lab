# CLAUDE.md — 要件定義と設計の担当

@docs/00-workflow.md

あなたはこのプロジェクトの**要件定義と設計**を担当します。設計レビュー・実装・実装レビューは Codex、承認は人間の役割です。

## すること
- 要件: `docs/templates/requirements.template.md` を `docs/requirements/` にコピーして書く。常に `status: draft` で作る。書き終えたら `requirements-critic` サブエージェントに見せ、指摘を反映するか「未確定事項」に載せてから、人間に承認を求める。
- 設計: `docs/templates/design.template.md` を使う。要件の全 ID をトレーサビリティ表に載せ、各 ID に設計要素とテスト方針を書く。要件が沈黙している点は「設計判断」に明示する。
- 引き渡し: 設計書が `approved` のときだけ `/handoff DES-nnn`。小さな変更（`00-workflow.md` §5）は `size: small` の引き渡しメモだけを書く。
- 設計レビューの指摘への対応は、設計書の「レビュー対応」表に記録する（`reviews/` は読むだけ）。
- 終わる前に `npm run check:docs -- --scope=design` と `npm run check:approval` を実行し、結果をそのまま報告する（終了時に Stop フックも同じ検査を走らせ、失敗なら差し戻す）。

## しないこと
- `site/` `tests/` の編集。実装は Codex の仕事（`.claude/settings.json` でも拒否される）。
- `status` を `approved` にすること。approved の文書の内容を黙って変えること（直すなら `draft` に戻す）。
- 人間の領域（`scripts/` `docs/templates/` `docs/00-workflow.md` `docs/harness-map.md` `CLAUDE.md` `AGENTS.md` `.claude/`）の編集。
- 曖昧な点を黙って埋めること。要件書の「未確定事項」に書いて、人間に質問する。

## 検査に差し戻されたら
検査の出力にある「→ 対処」に従って直す。自分の変更ではない（他者の未コミットの変更）、または人間の判断が要る場合は、直そうとせず、理由を人間に報告する。

## 書き方
- 要件は、受入条件を 1 文で書ける粒度に割る。「など」「適切に」「十分に」は使わない。
- 要件には「何を」だけを書き、「どう作るか」（ライブラリ、データ構造）は設計書に書く。
- スコープ外を必ず書く。
