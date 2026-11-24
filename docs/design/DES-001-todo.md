---
id: DES-001
requirements: [REQ-001]
status: approved
---
# DES-001 ToDo リスト 設計

## 方針
- 純粋関数（`todo.js`）と、DOM・保存の処理（`app.js`）を分ける。状態は不変データとして扱い、操作関数は新しい配列を返す。
- 外部依存なし。ES Modules を `<script type="module">` で読み込む。ES Modules は `file://` では動かないので、確認用に `npm run serve` を用意する。

## 構成
| ファイル | 役割 |
|---|---|
| `site/index.html` | 画面の骨格。読み込むのは `style.css` と `app.js` だけ |
| `site/style.css` | 見た目。ライト／ダーク両対応 |
| `site/todo.js` | 純粋関数。DOM と localStorage に触れない |
| `site/app.js` | イベント処理、描画、localStorage の入出力 |

## データとインターフェース
```
Task  = { id: string, title: string, done: boolean, createdAt: number }
State = { tasks: Task[], filter: 'all' | 'active' | 'done' }
```
保存先は localStorage のキー `todo-lab:v1`。値は `tasks` の JSON。`filter` は保存しない。

| 関数（`todo.js`） | 振る舞い |
|---|---|
| `normalizeTitle(raw)` | 文字列化して前後の空白（全角含む）を除く。null / undefined は空文字 |
| `addTask(tasks, rawTitle, {id, now})` | 末尾に追加した新しい配列を返す。正規化後が空なら**同じ配列（同じ参照）**を返す |
| `toggleTask(tasks, id)` | 該当 id の `done` を反転。該当なしなら内容は変わらない |
| `removeTask(tasks, id)` | 該当 id を除く |
| `filterTasks(tasks, filter)` | `'active'` / `'done'` で絞る。それ以外は全件 |
| `countActive(tasks)` | `done` でないものの数 |
| `serialize(tasks)` / `deserialize(json)` | JSON 変換。`deserialize` は null・不正な JSON・配列でない値なら空配列、Task の形に合わない要素は捨てる |

## 画面・振る舞い
- 追加は `<form>` の submit。ネイティブの挙動で Enter キーでも送信される。
- 一覧は `<ul>`。各行は `<label><input type="checkbox"> タイトル</label>` と「削除」`<button>`。
- **タイトルは `textContent` で描画する。HTML 文字列を組み立てない**（XSS 対策）。
- 絞り込みは 3 つの `<button>` で、選択中のものに `aria-pressed="true"`。
- 件数は `<p aria-live="polite">未完了 N 件</p>`。
- 再描画後のフォーカス: 切り替え → 同じ行のチェックボックス（絞り込みで行が消えたら入力欄）。追加・削除 → 入力欄。
- 保存に失敗しても（プライベートモードなど）握りつぶし、メモリ上で動作を続ける。

## 設計判断（要件に書かれていないこと）
- 絞り込み状態は保存しない（再読み込みで「すべて」に戻る）。
- 同じタイトルの重複を許可する。タイトル長に上限は設けない。
- 並び順は追加順（新しいものが下）。
- 空入力の送信では何も表示せず、入力欄にフォーカスを戻す。

## トレーサビリティ
| 要件ID | 設計要素 | 自動テスト | 手動確認 |
|---|---|---|---|
| FR-001 | `normalizeTitle` `addTask`、form の submit | todo.test.mjs `[FR-001]` | M-1 |
| FR-002 | `toggleTask`、行のチェックボックス | todo.test.mjs `[FR-002]` | M-2 |
| FR-003 | `removeTask`、行の削除ボタン | todo.test.mjs `[FR-003]` | M-2 |
| FR-004 | `filterTasks`、絞り込みボタン | todo.test.mjs `[FR-004]` | M-2 |
| FR-005 | `serialize` `deserialize`、`load` / `save` | todo.test.mjs `[FR-005]` | M-3 M-5 |
| FR-006 | `countActive`、`#active-count` | todo.test.mjs `[FR-006]` | M-2 |
| NFR-001 | 外部依存なし、読み込むのは相対パス 2 ファイル | static.test.mjs `[NFR-001]` | — |
| NFR-002 | ネイティブ要素、ラベル、`aria-live`、`aria-pressed`、フォーカス復帰 | static.test.mjs `[NFR-002]` | M-1 M-2 |
| NFR-003 | `todo.js` を純粋関数だけにする | todo.test.mjs `[NFR-003]` | — |

## テスト計画
### 自動（`npm test`）
`todo.js` の全関数（正常・空入力・存在しない id・壊れた保存データ・元の配列を変更しないこと）と、`index.html` / `app.js` の静的チェック。`app.js` の DOM 操作そのものは自動テストしない。

### 手動（`npm run serve` で確認）
- **M-1** 入力して Enter で追加でき、入力欄が空になりフォーカスが残る。空白だけでは追加されない。
- **M-2** チェック・削除・絞り込みが、マウスと Tab / Space / Enter の両方で動く。件数が更新される。
- **M-3** 再読み込みしてもタスクと完了状態が残る。
- **M-4** タイトルに `<img src=x onerror=alert(1)>` を入れても、文字列として表示されるだけで実行されない。
- **M-5** DevTools で `localStorage.setItem('todo-lab:v1', '{')` してから再読み込みしても、空のリストで起動する。

## リスクと未決事項
- `app.js` が自動テストの外にあるため、DOM まわりの退行は手動確認に頼る。増やすならブラウザテストの導入が必要（NFR-001 との兼ね合いで、導入するなら開発用のみ）。

## レビュー対応
| レビュー | 指摘 | 対応 | 説明 |
|---|---|---|---|
| — | — | — | 初版（レビュー前） |
