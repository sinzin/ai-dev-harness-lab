# ワークフロー（Claude × Codex × 人間）

この文書が**役割・手順・規約の正本**です。`CLAUDE.md` と `AGENTS.md` はここを参照します。ルールを変えるときは、まずここだけを直します。

## 1. 役割と編集範囲

| 役割 | 担当 | 編集してよい場所 |
|---|---|---|
| 要件定義・設計 | Claude | `docs/requirements/` `docs/design/` `handoff/to-codex/` |
| 設計レビュー・実装・実装レビュー | Codex | `site/` `tests/` `reviews/` `handoff/to-claude/` |
| 承認・ハーネス管理 | 人間 | 上記以外すべて |

**人間だけが編集できるもの**（ハーネス自身）: `scripts/` `docs/templates/` `docs/00-workflow.md` `docs/harness-map.md` `CLAUDE.md` `AGENTS.md`（`site/AGENTS.md` など各ディレクトリのものを含む）`README.md` `package.json` `.gitignore` `.claude/`。エージェントは、自分を縛る指示・権限・検査を編集しません。人間の領域は、エージェントの領域より優先されます（例: `site/AGENTS.md` は `site/` の中にあるが、人間の領域）。

編集範囲の定義は `scripts/ownership.json` が**唯一の正本**です。Claude の編集禁止（`.claude/settings.json` の deny）はここから導いたもので、両者が一致しているかを `npm run check:harness` が検査します。

## 2. 手順とゲート

| # | 工程 | 担当 | 成果物 | 次へ進む条件 |
|---|---|---|---|---|
| 1 | 要件定義 | Claude | `docs/requirements/REQ-nnn-<slug>.md`（draft）。書き終えたら `requirements-critic`（読み取り専用の別コンテキスト）に見せ、指摘を反映するか未確定事項に載せる | 人間が確認して `status: approved` にし、**その変更だけを単独でコミット**する |
| 2 | 設計 | Claude | `docs/design/DES-nnn-<slug>.md`（draft） | `npm run check:docs -- --scope=design` に「設計漏れ」「未定義ID」が無い |
| 3 | 設計レビュー | Codex（新規セッション・読み取り専用） | `reviews/design/DES-nnn-r<k>.md` | blocker / major に対応済み → 人間が `approved` にして単独でコミット |
| 4 | 引き渡し | Claude | `handoff/to-codex/HO-nnn.md`（`/handoff DES-nnn`） | 設計書が `approved` |
| 5 | 実装 | Codex | `site/` `tests/` | `npm run verify`・`npm run check:owner -- codex`・`npm run check:approval` がすべて成功 |
| 6 | 実装レビュー | Codex（5 とは別の新規セッション・読み取り専用） | `reviews/code/DES-nnn-r<k>.md` | blocker / major が無い（あれば 2 か 4 に戻る） |
| 7 | 振り分け | 人間（+ Claude） | — | 設計の誤り → 工程 2、実装の誤り → 工程 4 |

各工程の終わりにコミットします（`docs:` `review:` `feat:` など）。コミットが引き渡しの単位であり、`check:owner` と `check:approval` の基準点です。**エージェントを動かす前に、作業ツリーをクリーンにしておきます**（前の工程の変更が混ざると、検査が誰の変更か区別できません）。

## 3. 規約

### ID
- `REQ-nnn` 要件書 / `DES-nnn` 設計書（番号は対応する REQ と揃える）/ `HO-nnn` 引き渡し / `Q-nnn` 質問
- `FR-nnn` 機能要件 / `NFR-nnn` 非機能要件。**全文書を通して一意**。要件書では `- **FR-001** …` の形で定義する。
- 設計書は、扱う要件の ID を本文（トレーサビリティ表）に書く。テストは名前に `[FR-001]` のようにタグを付ける。

### status（文書の front matter）
`draft` → `approved` → `superseded`。

- **`approved` にできるのは人間だけ。** 人間が内容を確認し、status を変えるだけの単独コミットで承認する。
- **approved の文書は凍結。** 内容を変えるなら、status を `draft` に戻してから直し、再承認を受ける。
- 上の 2 つは `npm run check:approval` が、基準コミット（既定 HEAD）と作業ツリーを比べて検査する。

### レビュー
- 重大度: `blocker`（誤動作・要件違反・セキュリティ）/ `major`（設計との乖離・テスト不足）/ `minor` / `nit`
- 指摘には必ず根拠（要件ID・設計書の節・コード位置）を付ける。根拠が書けない指摘は書かない。
- レビューでは対象を直さない。直すのは次の工程の担当者。
- 指摘への対応は、設計なら設計書の「レビュー対応」表（Claude）、実装なら次ラウンドのレビューでの再確認（Codex）で残す。

### 迷ったら止まる
仕様の曖昧さ・矛盾に気づいたら、推測で進めません。Codex は `handoff/to-claude/Q-nnn.md` に質問を書いて止まる。Claude は要件書の「未確定事項」に書いて人間に聞く。

### 検査の出力
検査スクリプトの失敗には「→ 対処」が付きます。読むのはエージェントなので、そこに書かれた行動に従います。

## 4. コマンドと自動で動くもの

| コマンド | 内容 |
|---|---|
| `npm run verify` | 構文 → ハーネスの整合性 → 自動テスト → トレーサビリティ。実装の「完了」の定義 |
| `npm run check:docs [-- --scope=design]` | 要件 → 設計 → テストの欠落検出。`design` ならテスト漏れを見ない |
| `npm run check:owner -- <role> [base-ref]` | 編集範囲の違反検出（`<role>` は `claude` か `codex`） |
| `npm run check:approval [-- <base-ref>]` | 承認ゲートの検査 |
| `npm run check:harness` | ハーネス自身の整合性（deny ↔ ownership、agents、hooks） |
| `npm run harness:selftest` | 上の検査が、違反させたときに本当に鳴るかを確かめる |
| `npm run serve` | デモサイトを http://localhost:5173 で起動 |
| Stop フック（Claude Code） | Claude が終了する直前に `check:docs --scope=design` と `check:approval` を自動で走らせ、失敗なら差し戻す（連続 2 回まで） |

## 5. 規模に応じた省略

すべての変更に要件書と設計書を作ると、小さな変更に対して文書が過剰になり、レビューの負担ばかり増えます。次のように使い分けます。

- **小さな変更**: 既存の要件（FR/NFR）の範囲内で済む、バグ修正・文言の変更・内部のリファクタ。要件書・設計書は新設しない。Claude は引き渡しメモ（`size: small`）だけを書き、対象の既存 ID・再現手順・期待結果を書く。Codex は先に失敗するテストを書いてから直す。レビューは実装レビューのみ。
- **通常の変更**: 新しい FR/NFR が要る、または既存の要件・設計の内容が変わる。上の工程 1〜7 をすべて通す。
- 迷ったら、「新しい要件 ID が要るか」で決める。要るなら通常の変更。

## 6. ハーネスを変えるとき

ハーネス（人間の領域のファイル）を変えられるのは人間だけです。変えたら `npm run verify` と `npm run harness:selftest` を実行します。検査を弱める変更をしたとき、`harness:selftest` が落ちて気づけるようにするためです。部品を足したら `docs/harness-map.md` にも載せます。
