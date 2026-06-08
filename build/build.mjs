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
