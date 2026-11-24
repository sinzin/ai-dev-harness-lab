// 文書まわりの共通処理（ファイル列挙・front matter）。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));

export const listFiles = (dir, ext) =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir)).filter((name) => name.endsWith(ext)).sort().map((name) => join(dir, name))
    : [];

export const readText = (file) => readFileSync(join(root, file), 'utf8');

export const frontMatter = (text) => text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? null;

export const statusOf = (text) => frontMatter(text)?.match(/^status:\s*(\S+)/m)?.[1] ?? null;

// 検査の失敗を「何が / どう直すか」の形で出す。読むのはエージェントなので、そのまま行動できる文にする。
export function reportAndExit(title, violations) {
  console.error(`NG: ${title} ${violations.length} 件`);
  for (const { message, fix } of violations) {
    console.error(`  - ${message}`);
    console.error(`    → 対処: ${fix}`);
  }
  process.exit(1);
}
