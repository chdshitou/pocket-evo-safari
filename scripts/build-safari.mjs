#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectDir = resolve(root, 'Pocket Evo 站点导入');
const derivedData = resolve(root, 'Build/DerivedData');
const project = 'Pocket Evo 站点导入.xcodeproj';
const scheme = 'Pocket Evo 站点导入';
const fullXcodebuild = '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';
let xcodebuild = process.env.XCODEBUILD_PATH || 'xcodebuild';
try {
  const developerDir = execFileSync('xcode-select', ['-p'], { encoding: 'utf8' }).trim();
  if (developerDir.endsWith('/CommandLineTools') && existsSync(fullXcodebuild)) xcodebuild = fullXcodebuild;
} catch {
  if (existsSync(fullXcodebuild)) xcodebuild = fullXcodebuild;
}

execFileSync('node', [resolve(root, 'scripts/sync-version.mjs')], { stdio: 'inherit' });
execFileSync(xcodebuild, [
  '-project', project,
  '-scheme', scheme,
  '-configuration', 'Release',
  '-derivedDataPath', derivedData,
  'build',
], { cwd: projectDir, stdio: 'inherit' });

const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
const app = resolve(derivedData, 'Build/Products/Release/Pocket Evo 站点导入.app');
const extension = resolve(app, 'Contents/PlugIns/Pocket Evo 站点导入 Extension.appex');
const readVersion = (path) => execFileSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', '-o', '-', path], { encoding: 'utf8' }).trim();
const appVersion = readVersion(resolve(app, 'Contents/Info.plist'));
const extensionVersion = readVersion(resolve(extension, 'Contents/Info.plist'));
if (appVersion !== version || extensionVersion !== version) {
  throw new Error(`构建产物版本不一致：VERSION=${version}, App=${appVersion}, Extension=${extensionVersion}`);
}
console.log(`Safari Release 构建版本已核验：${version}`);
