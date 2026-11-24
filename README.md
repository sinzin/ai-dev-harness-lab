# AI駆動開発 ハーネス実験場

AI駆動開発の「ハーネス設計」（AIを囲む役割分担・指示・権限・検証・レビューの仕組み）を、小さなデモで手を動かして学ぶためのフォルダです。

| 役割 | 担当 |
|---|---|
| 要件定義・設計書の作成 | **Claude** |
| 設計レビュー・実装・実装レビュー | **Codex** |
| 承認ゲート、ハーネス自体（指示書・権限・スクリプト）の管理 | **人間** |

題材は、ブラウザだけで動く ToDo リスト（`site/`）です。最初から `REQ-001 → DES-001 → 実装 → テスト` までつながっています。**この実装は仕組みを動かすための見本として最初から入れたもので、Codex が書いたものではありません。** 役割分担を通して動かすのは、「一周してみる」から。

ハーネスの各部品が何の役割か（guide / sensor × computational / inferential）は **[docs/harness-map.md](docs/harness-map.md)** にまとめています。まずそれを読むのがおすすめです。

## 流れ

```
要件 REQ ─▶ 設計 DES ─▶ 設計レビュー ─▶ 引き渡し HO ─▶ 実装 ─▶ 実装レビュー ─▶ 振り分け
Claude      Claude       Codex           Claude         Codex    Codex           人間
  │                      (読取専用)                      verify   (別セッション・読取専用)
  └ requirements-critic                                  が通るまで
    に見せてから、人間が approved（単独コミット）
```

各ゲートの詳細・ID規約・小さな変更の省略の仕方は [docs/00-workflow.md](docs/00-workflow.md)（正本）。

## フォルダ構成

```
ai-dev-harness-lab/
├── CLAUDE.md                  Claude への指示（要件・設計の担当）
├── AGENTS.md                  Codex への指示（レビュー・実装の担当）
├── docs/
│   ├── 00-workflow.md         役割・手順・規約の正本（両方の指示書が参照）
│   ├── harness-map.md         ハーネスの部品を分類した地図。弱点と参考資料つき
│   ├── requirements/          要件書（Claude）      REQ-001-todo.md
│   ├── design/                設計書（Claude）      DES-001-todo.md
│   └── templates/             文書の雛形（人間が管理）
├── handoff/
│   ├── to-codex/              Claude → Codex の引き渡しメモ
│   └── to-claude/             Codex → Claude の質問・報告
├── reviews/
│   ├── design/                Codex による設計レビュー
│   └── code/                  Codex による実装レビュー
├── site/                      デモサイト（Codex の担当範囲）
│   ├── AGENTS.md              site/ だけのルール（人間の領域）
│   ├── index.html  style.css
│   ├── todo.js                純粋ロジック（DOM に触れない）
│   └── app.js                 描画・イベント・localStorage
├── tests/                     自動テスト（Codex の担当範囲）
│   ├── AGENTS.md              tests/ だけのルール（人間の領域）
│   ├── todo.test.mjs          ロジックの単体テスト
│   └── static.test.mjs        静的・構造テスト（層の境界、外部依存、HTML 文字列）
├── scripts/                   ハーネス本体（人間が管理）
│   ├── verify.sh              「完了」の定義。全チェックの入口
│   ├── check-traceability.mjs 要件 → 設計 → テストの欠落検出
│   ├── check-approval.mjs     承認ゲート（approved にできるのは人間だけ、承認済みは凍結）
│   ├── check-ownership.mjs    役割ごとの編集範囲チェック
│   ├── check-harness.mjs      deny ↔ ownership、agents、hooks のずれ検出
│   ├── harness-selftest.mjs   上の検査が、違反させたとき本当に鳴るかの確認
│   ├── ownership.json         編集範囲の唯一の正本
│   ├── lib/docs.mjs           共通処理
│   └── serve.mjs              デモ用の静的サーバー
└── .claude/
    ├── settings.json          Claude の編集禁止パス（deny）と Stop フック
    ├── hooks/stop-check.mjs   Claude の終了直前に検査を走らせるフック
    ├── agents/requirements-critic.md   要件を批判的に読む読み取り専用サブエージェント
    └── commands/handoff.md    /handoff コマンド
```

## 動かす

必要なのは Node.js 20 以上だけです（依存パッケージなし）。

```bash
git add -A && git commit -m "chore: seed"   # 基準点。check:owner / check:approval はここからの変更を見る
npm run verify                              # 構文 → ハーネス整合性 → テスト → トレーサビリティ
npm run harness:selftest                    # 検査が違反を本当に検出するかの確認（約 6 秒）
npm run serve                               # http://localhost:5173
```

**Claude Code でこのフォルダを使うとき**は、このフォルダで `claude` を**対話モードで一度起動**し、信頼ダイアログを承認してください。承認前は、プロジェクトの `permissions.allow` が無視されます（`claude -p` で試したときにその警告が出ました）。

## 一周してみる（REQ-002「期限日」）

ToDo に期限日を付ける機能を、役割分担どおりに通します。**各工程の終わりにコミットし、エージェントを動かす前は作業ツリーをクリーンに**してください。

1. **要件（Claude）** — このフォルダで `claude` を起動して:
   > `docs/templates/requirements.template.md` を使って、REQ-002「タスクに期限日を付けられ、期限切れを強調表示する」を draft で作って。書き終えたら requirements-critic に見せて、指摘を反映して。不明点は「未確定事項」に書いて、私に質問して。
2. **承認（人間）** — 質問に答え、要件書の `status` を `approved` に。**その変更だけを単独でコミット**する。
3. **設計（Claude）** — 「REQ-002 の設計書 DES-002 を作って」。終了時に Stop フックが `check:docs --scope=design` と `check:approval` を走らせる。
4. **設計レビュー（Codex・新規セッション・読み取り専用）**
   ```bash
   codex exec --sandbox read-only "AGENTS.md の「設計レビュー」に従って DES-002 をレビューして。レビュー本文を Markdown だけで出力して" > reviews/design/DES-002-r1.md
   ```
5. **対応と承認** — Claude が指摘に対応して設計書の「レビュー対応」表に記録 → 人間が `approved` にして単独でコミット。ここから `npm run check:docs` は「テスト漏れ」で落ちる（実装すべきものがある、という合図）。
6. **引き渡し（Claude）** — `/handoff DES-002`
7. **実装（Codex）** — `codex` を起動して:
   > `handoff/to-codex/` の HO-002 に従って実装して。AGENTS.md の「実装を頼まれたとき」の手順で。
8. **機械チェック** — `npm run verify`、`npm run check:owner -- codex`、`npm run check:approval`
9. **実装レビュー（Codex・手順 7 とは別の新規セッション・読み取り専用）**
   ```bash
   codex exec --sandbox read-only "AGENTS.md の「実装レビュー」に従って DES-002 の実装をレビューして。レビュー本文を Markdown だけで出力して" > reviews/code/DES-002-r1.md
   ```
10. **振り分け（人間）** — 設計の誤りは 3 へ、実装の誤りは 6〜7 へ戻す。

**小さな変更**（既存の要件の範囲内のバグ修正など）は、要件書・設計書を作らず、`size: small` の引き渡しメモだけで進められます（`docs/00-workflow.md` §5）。

## 試してみること（ハーネスの学び）

| やること | 学べること |
|---|---|
| `npm run harness:selftest` を実行し、`scripts/check-traceability.mjs` のどこかをわざと壊してからもう一度実行する | 検査が本当に鳴るかを確かめるセンサーのテスト（「一度も鳴らないのは、品質が高いからか、検出が甘いからか」） |
| Claude に `site/app.js` を直させてみる（要・信頼ダイアログの承認） | 権限の deny が実行前に止める |
| Claude に「DES-001 の status を approved にして」ではなく、「承認済みの DES-001 に 1 行追記して」と頼む | 承認済みの凍結を `check:approval` が検出し、Stop フックが差し戻す |
| 要件書を書かせたあと、`requirements-critic` に見せる場合と見せない場合を比べる | 同じモデルでも、コンテキストを分けたレビューがどこまで効くか |
| 実装した同じ Codex セッションに自己レビューさせた場合と、別の新規セッションで読み取り専用にした場合を比べる | AIレビュー（inferential sensor）の独立性 |
| `docs/00-workflow.md` のルールを 1 行変えて、Claude と Codex の振る舞いが変わるか見る | 正本を 1 か所にする意味 |

## 検証の状況（正直に）

| | 状況 |
|---|---|
| `npm run verify`（構文・ハーネス整合性・自動テスト 18 件・トレーサビリティ） | 確認済み |
| `npm run harness:selftest`（28 件。検査が違反を検出し、違反が無いときは黙ること） | 確認済み。検査をわざと壊したコピーで、selftest が失敗することも確認 |
| デモサイトの画面の動作（M-1〜M-5） | 前回ブラウザで確認済み。`site/` はその後変更していない |
| 設定ファイルの書式（deny のパス指定、Stop フック、サブエージェントの frontmatter） | 公式ドキュメントで確認して書いた |
| **Claude Code が実際に deny を適用するか、Stop フックが起動して差し戻すか、`requirements-critic` が認識されるか** | **未確認**。この環境の Claude Code CLI が未ログインで、モデルを使った実機テストができなかった。上の「試してみること」で確かめてください |
| Codex のコマンド（`codex exec --sandbox read-only` など） | **未確認**。Codex が入っていない。`codex exec --help` で確認してください |

## 限界（意図的に残してあるもの）

- **強制には段階がある。** 指示書だけ < 権限の deny < 事後の機械チェック < OS レベルの強制。承認ゲートは `check:approval` で機械化したが、「基準コミットより前に人間が承認コミットを済ませている」ことが前提で、エージェントが自分でコミットしてしまうと見逃す（`base-ref` に信頼できるコミットを渡して検査する）。
- **deny が止められないもの。** Edit の deny は、組み込みの編集ツールに加えて、Bash の `>` リダイレクトや `cat` `sed` `tee` のように Claude Code が認識するファイルコマンドにも適用される（公式ドキュメント）。適用されないのは、`node` や `python` のスクリプトが内部でファイルを書く場合。それを拾うのは `check:owner`（事後）か、OS レベルのサンドボックス。サンドボックスは、有効にすると Docker や `localhost` への接続などが失敗しうるため、このラボでは有効にしていない。
- **同じ内容が 2 か所にある。** `settings.json` の deny と `ownership.json`。ずれは `check:harness` が検出するが、`CLAUDE.md` と `00-workflow.md` の文章のずれは検出できない。
- **自己レビューの弱さ。** Codex が実装し、同じ会話でレビューすると、自分の思い込みを見落としやすい。新規セッション・読み取り専用にしているのはそのためだが、同じモデルであることは変わらない。
- **`app.js`（DOM 操作）は自動テストの外。** 設計書の手動確認 M-1〜M-5 で見る。
- **検査が見るのは「IDがつながっているか」まで。** 仕様と実装の内容が一致しているかは見ていない。

## 参考資料

[docs/harness-map.md](docs/harness-map.md) の末尾に、参照した資料と、それぞれから何を借りたかを載せています。OpenAI の Harness Engineering の記事は、本文を読めていません（取得が拒否された）。
