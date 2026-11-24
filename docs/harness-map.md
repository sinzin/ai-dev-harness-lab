# ハーネス・マップ

このラボの「ハーネス」（AIを囲む仕組み）を、Böckeler の整理（[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)）で分類した地図です。部品を足したり変えたりしたら、ここも更新します（人間の領域）。

## 4つの分類

|  | computational（決定的・速い） | inferential（AIの判断。遅く高価で非決定的） |
|---|---|---|
| **guide**（行動の前に方向づける） | 権限の deny、テンプレート | `CLAUDE.md` `AGENTS.md`、ワークフロー、仕様書 |
| **sensor**（行動の後に観測し、自己修正させる） | テスト、検査スクリプト、フック | AIレビュー、`requirements-critic` |

外側のハーネスの目的は、(a) 初回で正しい結果が出る確率を上げること（guide）、(b) 人の目に届く前に、問題を自己修正させるフィードバックループを作ること（sensor）の 2 つです。

## このラボの部品

| 部品 | 分類 | 見るもの | 動くタイミング | 失敗すると |
|---|---|---|---|---|
| `CLAUDE.md` / `AGENTS.md` / `site/AGENTS.md` / `tests/AGENTS.md` | guide・inferential | 役割・禁止事項・手順 | セッション開始時、編集時 | 従わなくても何も起きない（指示だけ） |
| `docs/00-workflow.md`、`docs/templates/`、`/handoff` | guide・inferential | 手順・書式 | 各工程の開始時 | 同上 |
| 要件書・設計書（approved） | guide・inferential | 何を作るか | 実装・レビュー時 | — |
| `.claude/settings.json` の deny | guide・computational | Claude の編集範囲 | ツール実行の前 | 実行が拒否される |
| `scripts/verify.sh` の構文チェック | sensor・computational | 構文 | 実装の完了前 | 失敗 |
| 自動テスト（`tests/`）のうち、`todo.js` の単体テスト | sensor・computational | 振る舞い | 同上 | 失敗 |
| 自動テスト（`tests/static.test.mjs`）の構造テスト | sensor・computational | 層の境界（`todo.js` の純粋性）、外部依存、HTML 文字列の組み立て | 同上 | 失敗。メッセージが直し方を示す |
| `check-traceability.mjs` | sensor・computational | 要件 → 設計 → テストのつながり | 設計後、実装の完了前 | 失敗。「→ 対処」が出る |
| `check-approval.mjs` | sensor・computational | 承認ゲート（approved への変更、承認済みの変更） | Stop フック、実装の完了前 | 失敗。「→ 対処」が出る |
| `check-ownership.mjs` | sensor・computational | 役割ごとの編集範囲（事後） | 実装の完了前、人間が随時 | 失敗。「→ 対処」が出る |
| `check-harness.mjs` | sensor・computational | deny ↔ ownership のずれ、agents の綴り、hooks の実在 | `verify` の中 | 失敗 |
| Stop フック（`.claude/hooks/stop-check.mjs`） | sensor・computational | 上の 2 つを Claude の終了直前に起動 | Claude が終了するとき | 差し戻し（連続 2 回まで。その後は人間に警告） |
| `requirements-critic`（サブエージェント） | sensor・inferential | 要件書の曖昧さ・矛盾・検証不能 | 要件書を書いた後、承認前 | 指摘が返るだけ |
| Codex の設計レビュー・実装レビュー | sensor・inferential | 設計・実装の乖離、見落とし | 設計後、実装後 | 指摘が `reviews/` に残るだけ |
| 手動確認 M-1〜M-5（設計書） | sensor・人間 | 画面の動作 | 実装後 | 人間が気づく |
| `harness-selftest.mjs` | センサーのセンサー | 上の検査が、違反させたとき本当に鳴るか／違反が無いとき黙っているか | 人間がハーネスを変えたとき | 失敗 |

速いものを先に・遅いものを後に置いています（実行前の deny → 終了前の Stop フック → 完了前の `verify` → 統合前の AIレビュー → 承認の人間）。品質は左（早い段階）に寄せる、という Böckeler の助言どおりです。

## 資料から借りた考え方と、このラボでの位置

- **共通の文脈と、仕様を分ける**（[Fowler の SDD の記事](https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)）。すべてのセッションに共通する文脈（Kiro の steering、Spec Kit の constitution に当たるもの）は、ここでは `CLAUDE.md` / `AGENTS.md` / `00-workflow.md`。機能ごとの仕様は `REQ` / `DES`。
- **spec-first と spec-anchored**（同記事）。このラボは、approved の仕様を凍結し、ID で実装とテストにつなぐので、仕様を残し続ける spec-anchored を目指しています。ただし機械が見るのは「ID が存在するか」だけで、仕様と実装の内容が一致しているかは見ていません（下の「弱いところ」）。
- **harnessability**（Böckeler）。コードベースがハーネスを組み込みやすいかどうかの性質。このラボは小さく、依存がなく、モジュールの境界がはっきりしているので、ハーネスを作りやすい状態です。レガシーのコードベースは、ハーネスが最も必要なのに、最も作りにくくなります。
- **規模に合わせる**（Fowler）。小さな変更に重い仕様を課さない。`00-workflow.md` の §5。

## まだ弱いところ

| 弱点 | 試せること |
|---|---|
| **振る舞いのハーネス**。`app.js` の DOM の動作は手動確認だけ（Böckeler も、振る舞いハーネスは未解決の大きな課題と述べている） | ブラウザテストを開発用に入れる案を検討する（NFR-001 との兼ね合い） |
| **仕様と実装の内容のずれ**。ID でしか見ていない | 受入条件とテストの対応を増やす。実装レビューで見る観点に加える |
| **センサーの網羅**。`harness:selftest` は、思いついた違反しか試していない | 自分で違反のパターンを足す。誤検出（黙るべきときに鳴る）のパターンも足す |
| **同じモデルによるレビュー**。AIレビューの独立性は限られる | 実装した会話で自己レビューさせた場合と、新規セッションで読み取り専用にした場合で、指摘の数と質を比べる |
| **保守性のセンサーが無い**（重複・複雑度・カバレッジ） | `node --test --experimental-test-coverage` などで足してみる |
| **ガイドの矛盾**。`CLAUDE.md` と `00-workflow.md` の文章が食い違っても、検出する仕組みが無い（deny と ownership のずれだけは `check-harness` が見る） | 文章のルールを検査可能な形にできないか考える |
| **Bash の子プロセス**。`node` や `python` のスクリプトが内部でファイルを書く場合、Edit の deny では止められない（公式ドキュメントの記載） | OS レベルの強制である Claude Code のサンドボックスを検討する。有効にすると Docker・`localhost` への接続など一部のコマンドが失敗しうるため、このラボでは有効にしていない |
| **非決定的なセンサーのテスト**。AIレビューが正しく鳴るかは、スクリプトでは確かめにくい | 既知の欠陥を埋め込んだ設計書を用意し、レビューが拾うかを見る |

## 参考資料

- Birgitta Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)（martinfowler.com, 2026年4月）— guide / sensor、computational / inferential、harnessability
- [Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)（martinfowler.com）— spec-first / spec-anchored、共通の文脈と仕様の区別、規模の問題
- [AGENTS.md](https://agents.md) — ディレクトリごとの `AGENTS.md`（編集するファイルに最も近いものが優先）
- [Claude Code: Hooks](https://code.claude.com/docs/en/hooks)、[Permissions](https://code.claude.com/docs/en/permissions)、[Subagents](https://code.claude.com/docs/en/sub-agents)、[Sandboxing](https://code.claude.com/docs/en/sandboxing)
- OpenAI, [Harness Engineering](https://openai.com/index/harness-engineering/)（2026年2月）— このラボを作る際は本文を読めておらず（取得が拒否された）、[InfoQ の要約](https://www.infoq.com/news/2026/02/openai-harness-engineering-codex)で確認できた範囲（文書の構造化、層構造の構造テストによる強制）だけを反映している
