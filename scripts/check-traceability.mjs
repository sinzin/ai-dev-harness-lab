// 要件ID（FR-xxx / NFR-xxx）が「要件 → 設計 → テスト」でつながっているかを検査する。
//   重複ID     : 同じIDが複数の要件で定義されている
//   未定義ID   : 設計書・テストが、どの要件書にも無いIDを参照している
//   設計漏れ   : approved の要件書の項目が、どの設計書にも現れない
//   テスト漏れ : approved の設計書が参照する項目が、どのテストにも現れない
// draft の文書は「設計漏れ」「テスト漏れ」の対象外（書きかけを責めない）。
//
// 使い方: node scripts/check-traceability.mjs [--scope=all|design]
//   --scope=design … テスト漏れを見ない。設計が approved になってから Codex が実装するまでの間は
//                    テストが無くて当然なので、Claude 側の検査（Stop フック）はこちらを使う。
import { listFiles, readText, reportAndExit, statusOf } from './lib/docs.mjs';

const scope = process.argv.find((arg) => arg.startsWith('--scope='))?.split('=')[1] ?? 'all';
if (!['all', 'design'].includes(scope)) {
  console.error('使い方: node scripts/check-traceability.mjs [--scope=all|design]');
  process.exit(2);
}

const ID = /\b(?:N?FR)-\d{3}\b/g;
const DEFINITION = /^\s*[-*]\s+\*\*((?:N?FR)-\d{3})\*\*/gm;
const idsIn = (text) => new Set(text.match(ID) ?? []);

const requirements = listFiles('docs/requirements', '.md').map((file) => {
  const text = readText(file);
  return { file, status: statusOf(text), defs: [...text.matchAll(DEFINITION)].map((m) => m[1]) };
});
const designs = listFiles('docs/design', '.md').map((file) => {
  const text = readText(file);
  return { file, status: statusOf(text), refs: idsIn(text) };
});
const testFiles = listFiles('tests', '.mjs');
const testRefs = new Set(testFiles.flatMap((file) => [...idsIn(readText(file))]));

const violations = [];
const add = (message, fix) => violations.push({ message, fix });

for (const doc of [...requirements, ...designs]) {
  if (!doc.status) add(`${doc.file}: front matter に status がありません`, 'front matter に `status: draft` を書く');
}

const defined = new Map();
for (const req of requirements) {
  for (const id of req.defs) {
    if (defined.has(id)) add(`${req.file}: 重複ID ${id}（${defined.get(id)} でも定義されている）`, 'どちらかを別の番号に振り直す');
    else defined.set(id, req.file);
  }
}

const designRefs = new Set(designs.flatMap((doc) => [...doc.refs]));

for (const doc of designs) {
  for (const id of doc.refs) {
    if (!defined.has(id)) add(`${doc.file}: 未定義ID ${id}`, `要件書に \`- **${id}** …\` と定義するか、ID の誤記を直す`);
  }
}
for (const id of testRefs) {
  if (!defined.has(id)) add(`tests/: 未定義ID ${id}`, `テスト名のタグ [${id}] の誤記を直すか、要件書に定義する`);
}
for (const req of requirements.filter((doc) => doc.status === 'approved')) {
  for (const id of req.defs) {
    if (!designRefs.has(id)) {
      add(`${req.file}: 設計漏れ ${id}（どの設計書にも現れない）`, `設計書のトレーサビリティ表に ${id} を追加し、設計要素とテスト方針を書く`);
    }
  }
}
if (scope === 'all') {
  for (const doc of designs.filter((d) => d.status === 'approved')) {
    for (const id of doc.refs) {
      if (defined.has(id) && !testRefs.has(id)) {
        add(`${doc.file}: テスト漏れ ${id}（どのテストにも現れない）`, `テスト名に [${id}] を付けたテストを tests/ に追加する`);
      }
    }
  }
}

console.log(`要件 ${defined.size} 項目 / 設計書 ${designs.length} 件 / テストファイル ${testFiles.length} 件（検査範囲: ${scope === 'all' ? '要件→設計→テスト' : '要件→設計'}）`);
if (violations.length > 0) reportAndExit('要件のつながり', violations);
console.log('OK: つながりに欠落なし');
