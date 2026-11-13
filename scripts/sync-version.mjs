#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checkOnly = process.argv.includes('--check');
const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`VERSION 格式无效：${version}`);

const resource = resolve(root, 'Pocket Evo 站点导入/Pocket Evo 站点导入 Extension/Resources');
const manifests = ['manifest.json', 'manifest.safari.json'];
const drift = [];
for (const name of manifests) {
  const path = resolve(resource, name);
  const original = await readFile(path, 'utf8');
  const parsed = JSON.parse(original);
  if (parsed.version !== version) {
    drift.push(`${name}: ${parsed.version} → ${version}`);
    if (!checkOnly) {
      parsed.version = version;
      await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`);
    }
  }
}

const projectPath = resolve(root, 'Pocket Evo 站点导入/Pocket Evo 站点导入.xcodeproj/project.xcproj');
const project = await readFile(projectPath, 'utf8');
const currentVersions = [...project.matchAll(/"MARKETING_VERSION":\s*"([^"]+)"/g)].map((match) => match[1]);
if (currentVersions.length !== 2) {
  throw new Error(`预期 Xcode App 和 Extension 各有一个 MARKETING_VERSION，实际找到 ${currentVersions.length} 个`);
}
if (currentVersions.some((value) => value !== version)) {
  drift.push(`Xcode targets: ${[...new Set(currentVersions)].join(', ')} → ${version}`);
  if (!checkOnly) {
    const aligned = project.replace(/("MARKETING_VERSION":\s*")[^"]+("\s*,?)/g, `$1${version}$2`);
    await writeFile(projectPath, aligned);
  }
}

if (checkOnly && drift.length) {
  console.error(`版本不一致（VERSION=${version}）：\n- ${drift.join('\n- ')}\n请运行 node scripts/sync-version.mjs`);
  process.exit(1);
}
if (drift.length) console.log(`已统一到 ${version}：\n- ${drift.join('\n- ')}`);
else console.log(`版本一致：${version}`);
