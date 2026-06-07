# 크롬 확장 포팅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 유저스크립트를 단일 코어(`src/core.js`)로 분리하고, Node 빌드 스크립트로 유저스크립트와 MV3 크롬 확장 두 산출물을 생성한다.

**Architecture:** `src/core.js`(IIFE 본체, 로직 무변경)를 단일 진실 소스로 둔다. `userscript/header.txt`(유저스크립트 메타블록)와 `extension/manifest.json`(MV3 템플릿)을 각각의 래퍼로 두고, `build/build.mjs`가 `package.json`의 version을 주입해 ① 루트 `.user.js` ② `dist/extension/` ③ `dist/extension.zip`을 만든다.

**Tech Stack:** 순수 ES Module Node 스크립트(의존성 0), macOS `sips`(아이콘 변환)/`zip`(패키징), pnpm scripts.

**참고 문서:** 설계는 `docs/chrome-extension-spec.md`. 핵심 제약 — 루트 `.user.js` 경로는 유지(기존 `@updateURL` 자동 업데이트 보존).

**커밋 규칙:** 아래 모든 커밋 메시지 끝에 다음 트레일러를 붙인다(빈 줄 한 줄 띄우고):
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 1: 프로젝트 스캐폴딩 (package.json / .gitignore / 디렉터리)

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- 디렉터리(`src/`, `userscript/`, `extension/icons/`, `build/`)는 `mkdir`로 만든다. 빈 디렉터리는 git에 들어가지 않으나, 후속 태스크가 각 디렉터리에 실제 파일을 추가하므로 `.gitkeep`은 불필요.

- [ ] **Step 1: 디렉터리 생성**

Run:
```bash
cd /Users/devsisters/Programming/OpenSources/github-resolved-comment-scroll
mkdir -p src userscript extension/icons build
```
Expected: 에러 없이 완료.

- [ ] **Step 2: `package.json` 작성**

`package.json`:
```json
{
  "name": "github-resolved-comment-scroll",
  "version": "1.0.0",
  "description": "Auto-expand, scroll to, and highlight resolved (collapsed) GitHub review comments from their permalink — userscript + Chrome extension.",
  "type": "module",
  "private": true,
  "license": "MIT",
  "homepage": "https://github.com/korECM/github-resolved-comment-scroll",
  "scripts": {
    "build": "node build/build.mjs"
  }
}
```

- [ ] **Step 3: `.gitignore` 작성**

`.gitignore`:
```
dist/
node_modules/
```

- [ ] **Step 4: 검증 — version 읽기 확인**

Run: `node -p "require('./package.json').version"`
Expected: `1.0.0`

- [ ] **Step 5: 커밋**

```bash
git add package.json .gitignore
git commit -m "chore: 빌드용 package.json·gitignore 추가 (버전 1.0.0)"
```

---

### Task 2: 유저스크립트 분리 (header.txt + src/core.js)

원본 `github-resolved-comment-scroll.user.js`는 **1~26줄 헤더 영역**, **27줄 빈 줄**, **28~301줄 IIFE 본체**로 구성된다. 본체는 한 글자도 바꾸지 않고 그대로 `src/core.js`로 옮기고, 메타블록은 `userscript/header.txt`로 옮기되 `@version` 값만 토큰(`__VERSION__`)으로 바꾼다.

**Files:**
- Create: `userscript/header.txt` (원본 1~26줄, @version 토큰화)
- Create: `src/core.js` (원본 28~301줄, 무변경)

- [ ] **Step 1: 원본 백업 (회귀 검증 기준)**

Run:
```bash
cp github-resolved-comment-scroll.user.js /tmp/grcs-orig.user.js
wc -l /tmp/grcs-orig.user.js
```
Expected: `301 /tmp/grcs-orig.user.js`

- [ ] **Step 2: 본체를 `src/core.js`로 추출 (무변경)**

Run:
```bash
sed -n '28,301p' /tmp/grcs-orig.user.js > src/core.js
```

- [ ] **Step 3: 추출 정확성 검증 (본체가 원본과 동일한가)**

Run: `diff <(sed -n '28,301p' /tmp/grcs-orig.user.js) src/core.js && echo "IDENTICAL"`
Expected: `IDENTICAL` (diff 출력 없음)

- [ ] **Step 4: 헤더를 `userscript/header.txt`로 추출**

Run:
```bash
sed -n '1,26p' /tmp/grcs-orig.user.js > userscript/header.txt
```

- [ ] **Step 5: header.txt의 @version 을 토큰화**

`userscript/header.txt`의 다음 줄을 수정한다 (공백 정렬 유지):
- Before: `// @version      0.2.2`
- After: `// @version      __VERSION__`

검증 Run: `grep '@version' userscript/header.txt`
Expected: `// @version      __VERSION__`

- [ ] **Step 6: header.txt에 토큰 외 다른 변경이 없는지 검증**

Run: `diff <(sed -n '1,26p' /tmp/grcs-orig.user.js) <(sed 's/__VERSION__/0.2.2/' userscript/header.txt) && echo "HEADER OK"`
Expected: `HEADER OK` (토큰을 원래 값으로 되돌리면 원본 헤더와 동일)

- [ ] **Step 7: 커밋**

```bash
git add userscript/header.txt src/core.js
git commit -m "refactor: 유저스크립트를 헤더(header.txt)와 본체(core.js)로 분리"
```

---

### Task 3: 빌드 스크립트 — 유저스크립트 산출 + 회귀 검증

`build/build.mjs`를 작성한다. 이 태스크에서는 **유저스크립트 산출 부분만** 먼저 만들고, 빌드된 `.user.js`가 원본과 기능 동일(본체 무변경 + version만 1.0.0)임을 검증한다. 확장 산출은 Task 4에서 같은 파일에 추가한다.

**Files:**
- Create: `build/build.mjs`
- Modify(빌드 산출): `github-resolved-comment-scroll.user.js`

- [ ] **Step 1: `build/build.mjs` 작성 (유저스크립트 파트)**

`build/build.mjs`:
```js
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
```

- [ ] **Step 2: 빌드 실행**

Run: `pnpm build`
Expected: `✓ userscript → github-resolved-comment-scroll.user.js`

- [ ] **Step 3: 회귀 검증 — 본체가 원본과 동일한가**

Run: `diff <(sed -n '28,$p' github-resolved-comment-scroll.user.js) src/core.js && echo "BODY IDENTICAL"`
Expected: `BODY IDENTICAL`

- [ ] **Step 4: 회귀 검증 — 헤더는 version만 바뀌었는가**

Run:
```bash
diff <(sed 's/1\.0\.0/0.2.2/' github-resolved-comment-scroll.user.js) /tmp/grcs-orig.user.js && echo "ONLY VERSION CHANGED"
```
Expected: `ONLY VERSION CHANGED` (산출물에서 1.0.0을 0.2.2로 되돌리면 원본과 완전히 동일)

- [ ] **Step 5: version 확인**

Run: `grep '@version' github-resolved-comment-scroll.user.js`
Expected: `// @version      1.0.0`

- [ ] **Step 6: 커밋**

```bash
git add build/build.mjs github-resolved-comment-scroll.user.js
git commit -m "feat: 빌드 스크립트로 유저스크립트 생성 (버전 1.0.0)"
```

---

### Task 4: manifest.json + 빌드에 확장 산출 추가 (아이콘 graceful)

**Files:**
- Create: `extension/manifest.json`
- Modify: `build/build.mjs` (확장 산출 파트 추가)

- [ ] **Step 1: `extension/manifest.json` 작성 (icons는 빌드가 주입하므로 미포함)**

`extension/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "GitHub: Scroll to Resolved Comment",
  "version": "__VERSION__",
  "description": "Auto-expand, scroll to, and highlight resolved (collapsed) review comments when you open their permalink (#discussion_r…) on GitHub PRs.",
  "content_scripts": [
    {
      "matches": ["https://github.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ]
}
```

- [ ] **Step 2: `build/build.mjs`에 확장 산출 파트 추가**

`build/build.mjs`의 끝(`console.log('✓ userscript …')` 다음)에 추가:
```js

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
```

- [ ] **Step 3: 빌드 실행 (아이콘 없는 상태)**

Run: `pnpm build`
Expected:
```
✓ userscript → github-resolved-comment-scroll.user.js
⚠ extension/icons/icon-{16,48,128}.png 없음 → manifest.icons 생략 (스토어 업로드 전 필요)
✓ extension → dist/extension/
```

- [ ] **Step 4: 산출물 구조 검증**

Run: `ls dist/extension && echo "---" && node -e "const m=require('./dist/extension/manifest.json'); console.log('version', m.version); console.log('icons', m.icons)"`
Expected:
```
content.js
manifest.json
---
version 1.0.0
icons undefined
```

- [ ] **Step 5: content.js가 core와 동일한지 검증**

Run: `diff src/core.js dist/extension/content.js && echo "CONTENT IDENTICAL"`
Expected: `CONTENT IDENTICAL`

- [ ] **Step 6: 커밋**

```bash
git add extension/manifest.json build/build.mjs
git commit -m "feat: MV3 manifest + 빌드 확장 산출 (아이콘 없으면 생략)"
```

---

### Task 5: 패키징 — dist/extension.zip 빌드 스텝

**Files:**
- Modify: `build/build.mjs` (zip 파트 추가)

- [ ] **Step 1: `build/build.mjs` 끝에 zip 파트 추가**

`build/build.mjs`의 끝(`console.log('✓ extension …')` 다음)에 추가:
```js

// 3) Web Store 업로드용 zip → dist/extension.zip
const zipPath = join(root, 'dist/extension.zip');
rmSync(zipPath, { force: true });
execFileSync('zip', ['-r', '-q', '../extension.zip', '.'], { cwd: distExt });
console.log('✓ zip →', 'dist/extension.zip');
```

- [ ] **Step 2: 빌드 실행**

Run: `pnpm build`
Expected: 마지막 줄에 `✓ zip → dist/extension.zip`

- [ ] **Step 3: zip 내용 검증**

Run: `unzip -l dist/extension.zip`
Expected: `manifest.json` 과 `content.js` 가 목록에 포함 (icons는 아직 없음).

- [ ] **Step 4: 커밋**

```bash
git add build/build.mjs
git commit -m "feat: 확장 zip 패키징 빌드 스텝 추가"
```

---

### Task 6: 아이콘 변환 절차 (원본 PNG → sips → icons/)

사용자가 외부(GPT 등)에서 만든 정사각 원본 PNG를 제공한다(권장 1024px, 투명 배경). 원본을 `extension/icons/source.png`로 두고 `sips`로 3종을 생성한다.

**Files:**
- Create: `extension/icons/icon-16.png`, `icon-48.png`, `icon-128.png` (변환 산출)
- Create: `build/make-icons.sh` (재현용 변환 스크립트)

- [ ] **Step 1: 변환 스크립트 작성**

`build/make-icons.sh`:
```bash
#!/usr/bin/env bash
# 원본 PNG → 확장 아이콘 16/48/128 생성. 사용법: build/make-icons.sh <source.png>
set -euo pipefail
SRC="${1:-extension/icons/source.png}"
OUT="extension/icons"
for s in 16 48 128; do
  sips -z "$s" "$s" "$SRC" --out "$OUT/icon-$s.png" >/dev/null
  echo "✓ icon-$s.png"
done
```

Run: `chmod +x build/make-icons.sh`

- [ ] **Step 2: 원본 배치 (사용자 제공 후)**

사용자가 제공한 원본 PNG를 `extension/icons/source.png`로 저장한다.

Run: `file extension/icons/source.png`
Expected: `... PNG image data ...` (정사각 권장)

- [ ] **Step 3: 아이콘 생성**

Run: `build/make-icons.sh`
Expected:
```
✓ icon-16.png
✓ icon-48.png
✓ icon-128.png
```

- [ ] **Step 4: 생성된 크기 검증**

Run: `for s in 16 48 128; do sips -g pixelWidth -g pixelHeight extension/icons/icon-$s.png | grep pixel; done`
Expected: 각각 width/height 가 16, 48, 128.

- [ ] **Step 5: 아이콘 포함 빌드 후 manifest 검증**

Run: `pnpm build && node -e "console.log(require('./dist/extension/manifest.json').icons)"`
Expected:
```
✓ userscript → github-resolved-comment-scroll.user.js
✓ extension → dist/extension/
✓ zip → dist/extension.zip
{ '16': 'icons/icon-16.png', '48': 'icons/icon-48.png', '128': 'icons/icon-128.png' }
```
(이제 `⚠` 경고가 사라지고 icons가 주입됨)

- [ ] **Step 6: 커밋 (source.png는 커밋, 산출 아이콘도 커밋)**

```bash
git add extension/icons/source.png extension/icons/icon-16.png extension/icons/icon-48.png extension/icons/icon-128.png build/make-icons.sh
git commit -m "feat: 확장 아이콘(16/48/128) + 변환 스크립트 추가"
```

---

### Task 7: README / docs 업데이트

**Files:**
- Modify: `README.md` (Chrome 확장 설치 섹션 추가, 영/한 모두)
- Modify: `docs/spec.md` (배포 형태에 확장 추가 또는 본 설계 문서 링크)

- [ ] **Step 1: README 영문 Install 섹션에 확장 안내 추가**

`README.md`의 영문 "## Install" 섹션 끝(유저스크립트 안내 다음)에 다음 하위 섹션을 추가:
```markdown
### As a Chrome extension

Prefer a one-time install with no userscript manager? Load it as an extension:

1. Build the unpacked extension: `pnpm build` (output: `dist/extension/`).
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `dist/extension/`.

A Chrome Web Store listing will be linked here once published. The extension's content script runs in an isolated world, so the Chrome/Edge "Allow user scripts" toggle is **not** required.
```

- [ ] **Step 2: README 한국어 "설치" 섹션에 확장 안내 추가**

`README.md`의 한국어 "## 설치"(또는 해당) 섹션 끝에 다음을 추가:
```markdown
### Chrome 확장으로 설치

유저스크립트 매니저 없이 한 번에 설치하려면 확장으로 불러옵니다:

1. 언팩 확장 빌드: `pnpm build` (산출물: `dist/extension/`).
2. `chrome://extensions` → **개발자 모드** 켜기 → **압축해제된 확장 프로그램을 로드** → `dist/extension/` 선택.

Chrome Web Store 등록 후 여기에 링크를 추가합니다. 확장 content script는 isolated world에서 실행되므로 Chrome/Edge의 "사용자 스크립트 허용" 설정이 **필요 없습니다**.
```

- [ ] **Step 3: docs/spec.md 배포 형태 갱신**

`docs/spec.md`의 "## 배포 형태" 항목에 한 줄 추가:
```markdown
- 크롬 확장(MV3): 동일 코어를 `dist/extension/`으로 빌드. 설계는 [`chrome-extension-spec.md`](./chrome-extension-spec.md).
```

- [ ] **Step 4: 검증 — 링크/마크다운 깨짐 없는지 육안 확인**

Run: `grep -n "chrome-extension-spec\|chrome://extensions\|pnpm build" README.md docs/spec.md`
Expected: 추가한 줄들이 각 파일에서 보임.

- [ ] **Step 5: 커밋**

```bash
git add README.md docs/spec.md
git commit -m "docs: README/spec에 크롬 확장 설치 안내 추가 (영/한)"
```

---

### Task 8: 확장 수동 검증 + 최종 확인

확장이 실제 GitHub PR에서 동작하는지 브라우저로 검증한다. (자동 테스트 불가 영역 — 수동.)

**Files:** 없음 (검증·문서 단계)

- [ ] **Step 1: 빌드 최신화**

Run: `pnpm build`
Expected: 3개 `✓` 라인, 경고 없음(아이콘 포함 시).

- [ ] **Step 2: 언팩 로드**

`chrome://extensions` → 개발자 모드 → **압축해제된 확장 프로그램을 로드** → `dist/extension/` 선택.
Expected: 확장이 에러 없이 로드되고 아이콘이 보임.

- [ ] **Step 3: 동작 검증 (resolved 코멘트 permalink)**

resolve된 리뷰 코멘트의 `…` 메뉴 → **Copy link** → 새 탭에서 열기.
Expected: 접힌 스레드가 자동으로 펼쳐지고 해당 코멘트로 스크롤 + 1.8초 하이라이트.

- [ ] **Step 4: 스크립트 실행 진단**

대상 PR 페이지의 DevTools 콘솔에서 Run: `document.getElementById('grcs-style')`
Expected: `null`이 아닌 `<style id="grcs-style">` 요소 반환 (= content script 실행 + CSP 비차단 확인).

- [ ] **Step 5: 비대상 페이지 무간섭 확인**

일반(비-resolved) 코멘트 permalink, 비-PR 페이지를 열어 본다.
Expected: GitHub 기본 동작 그대로, 깨짐 없음.

- [ ] **Step 6: 최종 상태 확인 및 정리**

Run: `git status && git log --oneline -8`
Expected: working tree clean, Task 1~7 커밋이 순서대로 보임. `dist/`는 gitignore로 추적 안 됨.

---

## 빌드/검증 요약 (구현 후 빠른 점검)

- `pnpm build` → 루트 `.user.js`(version 1.0.0) + `dist/extension/` + `dist/extension.zip` 생성.
- 루트 `.user.js` 본체는 원본과 동일(`diff … BODY IDENTICAL`), `@updateURL` 자동 업데이트 보존.
- 확장: 권한 전무, content script 하나, isolated world라 CSP 우회 불필요.
- Web Store 업로드는 `dist/extension.zip`을 사용자가 직접 (이번 범위 밖).
