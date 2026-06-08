#!/usr/bin/env node
// 단일 코어(src/core.js)에서 유저스크립트와 크롬 확장 산출물을 생성한다.
// 의존성 0 — Node 내장 모듈 + macOS zip 만 사용.
import {
  readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;

const core = readFileSync(join(root, 'src/core.js'), 'utf8');

// 1) 유저스크립트 = header(@version 치환) + 빈 줄 + core
//    header.txt(26줄) + '\n' 으로 원본의 27번째 빈 줄을 재현한다.
const header = readFileSync(join(root, 'userscript/header.txt'), 'utf8')
  .replaceAll('__VERSION__', version);
const userscript = `${header}\n${core}`;
writeFileSync(join(root, 'github-resolved-comment-scroll.user.js'), userscript);
console.log('✓ userscript →', 'github-resolved-comment-scroll.user.js');

// 2) 크롬 확장 → dist/extension/ (manifest + content.js + icons)
const distExt = join(root, 'dist/extension');
rmSync(distExt, { recursive: true, force: true });
mkdirSync(join(distExt, 'icons'), { recursive: true });

const manifest = JSON.parse(
  readFileSync(join(root, 'extension/manifest.json'), 'utf8').replaceAll('__VERSION__', version),
);

// 아이콘 16/48/128 이 모두 있으면 manifest에 주입 + 복사, 아니면 생략(경고).
// 파일 없이 icons를 선언하면 언팩 로드시 에러나므로, 없을 땐 깨끗이 뺀다.
const sizes = [16, 48, 128];
const iconsDir = join(root, 'extension/icons');
const haveIcons = sizes.every((s) => existsSync(join(iconsDir, `icon-${s}.png`)));
if (haveIcons) {
  manifest.icons = Object.fromEntries(sizes.map((s) => [String(s), `icons/icon-${s}.png`]));
  for (const s of sizes) {
    copyFileSync(join(iconsDir, `icon-${s}.png`), join(distExt, 'icons', `icon-${s}.png`));
  }
} else {
  rmSync(join(distExt, 'icons'), { recursive: true, force: true });
  console.warn('⚠ extension/icons/icon-{16,48,128}.png 없음 → manifest.icons 생략 (스토어 업로드 전 필요)');
}

writeFileSync(join(distExt, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(distExt, 'content.js'), core);
console.log('✓ extension →', 'dist/extension/');
