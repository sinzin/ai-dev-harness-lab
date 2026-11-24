// ハーネス自身の整合性チェック。指示（guides）と検査（sensors）がずれていないかを見る。
//   1. .claude/settings.json の Edit deny が ownership.json から導いた集合と一致している
//      （同じ内容を2か所に持つので、ずれると守りに穴があく。ずれを検出する）
//   2. .claude/agents/*.md の frontmatter に未知のフィールドが無く、name / description がある
//      （Claude Code は綴りを間違えたフィールドを、エラーにせず黙って無視する）
//   3. 設定が参照する .claude/hooks/ のスクリプトが存在する
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontMatter, reportAndExit, root } from './lib/docs.mjs';

const read = (file) => readFileSync(join(root, file), 'utf8');
const violations = [];
const add = (message, fix) => violations.push({ message, fix });

// 1. deny の同期
const ownership = JSON.parse(read('scripts/ownership.json'));
const settings = JSON.parse(read('.claude/settings.json'));
const expected = new Set([...ownership.codex, ...ownership.human].map((pattern) => `Edit(/${pattern})`));
const actual = new Set((settings.permissions?.deny ?? []).filter((rule) => rule.startsWith('Edit(')));
for (const rule of expected) {
  if (!actual.has(rule)) add(`.claude/settings.json の deny に ${rule} がありません`, `ownership.json の担当外・人間の領域なので、deny に ${rule} を追加する`);
}
for (const rule of actual) {
  if (!expected.has(rule)) add(`.claude/settings.json の deny に ownership.json に無い ${rule} があります`, 'ownership.json に合わせて deny から外す（Claude の担当範囲を塞いでいる可能性）');
}

// 2. サブエージェントの frontmatter
const AGENT_FIELDS = new Set([
  'name', 'description', 'tools', 'disallowedTools', 'model', 'permissionMode', 'skills', 'hooks', 'memory',
  'isolation', 'maxTurns', 'mcpServers', 'background', 'omitClaudeMd', 'effort', 'color', 'initialPrompt',
]);
const agentsDir = join(root, '.claude/agents');
for (const name of existsSync(agentsDir) ? readdirSync(agentsDir).filter((f) => f.endsWith('.md')) : []) {
  const fm = frontMatter(read(`.claude/agents/${name}`));
  if (fm === null) {
    add(`.claude/agents/${name}: front matter がありません`, '--- で囲んだ front matter に name と description を書く');
    continue;
  }
  const keys = fm.split('\n').map((line) => line.match(/^([A-Za-z][A-Za-z0-9]*):/)?.[1]).filter(Boolean);
  for (const key of keys.filter((k) => !AGENT_FIELDS.has(k))) {
    add(`.claude/agents/${name}: 未知のフィールド ${key}`, '綴りを確認する（複数語は camelCase。例: disallowedTools）。Claude Code は未知のフィールドを黙って無視する');
  }
  for (const required of ['name', 'description']) {
    if (!keys.includes(required)) add(`.claude/agents/${name}: ${required} がありません`, `front matter に ${required} を書く`);
  }
}

// 3. フックのスクリプト
const hookCommands = JSON.stringify(settings.hooks ?? {});
for (const script of new Set(hookCommands.match(/\.claude\/hooks\/[\w.-]+/g) ?? [])) {
  if (!existsSync(join(root, script))) add(`${script} が存在しません（settings.json の hooks が参照している）`, 'スクリプトを置くか、hooks から外す');
}

if (violations.length > 0) reportAndExit('ハーネスの不整合', violations);
console.log('OK: ハーネスの整合性（deny ↔ ownership、agents、hooks）');
