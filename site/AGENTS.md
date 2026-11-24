# site/ のルール（Codex 向け）

ルートの `AGENTS.md` に加えて、`site/` 配下を編集するときのルールです。編集するファイルに最も近い `AGENTS.md` が優先されます。

- `todo.js` は純粋関数だけ。`import` を持たず、`document` `window` `localStorage` などブラウザ API に触れない（NFR-003。`npm test` が検査する）。
- DOM と保存の処理は `app.js`。画面に出す文字列は `textContent` で入れ、HTML 文字列を組み立てない（DES-001）。
- 外部ライブラリ・外部URL・ビルド工程を足さない（NFR-001）。
- 見た目を変えても、ラベル・`aria-live`・`aria-pressed`・操作後のフォーカス復帰を壊さない（NFR-002）。
- 設計書にない振る舞いを足さない。必要なら `handoff/to-claude/` に質問を書いて止まる。
