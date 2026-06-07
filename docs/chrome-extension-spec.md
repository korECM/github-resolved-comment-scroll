# Spec — 크롬 확장 포팅 (공유 코어)

작성일: 2026-06-08

## 목표

기존 유저스크립트(`github-resolved-comment-scroll.user.js`, Greasy Fork 배포본)를 크롬 확장(Manifest V3)으로도 제공한다. 핵심 로직을 단일 소스(`src/core.js`)로 두고, 빌드 스크립트가 유저스크립트와 확장 두 산출물을 생성한다. 기존 유저스크립트 사용자의 자동 업데이트를 깨지 않는다.

## 결정사항

| 항목 | 결정 |
|------|------|
| 배포 형태 | 공유 코어로 유저스크립트 + 크롬 확장 **둘 다 유지** |
| 빌드 | 의존성 0의 순수 Node 스크립트(`build/build.mjs`) |
| 확장 범위 | 유저스크립트와 **동일 기능**. content script 하나, 팝업/옵션/백그라운드 없음 |
| 권한 | **전무** (`permissions`/`host_permissions`/`action`/`background` 모두 없음) |
| 버전 | **1.0.0** (이후 유저스크립트/확장 버전 동기화, `package.json`이 단일 소스) |
| 아이콘 | 원본은 외부(GPT)에서 생성, `sips`로 16/48/128 PNG 변환 |
| 작업 범위 | 코드 + 빌드 + 패키징(zip). Web Store 업로드는 사용자가 직접 |

## 저장소 구조

### Before
```
github-resolved-comment-scroll.user.js   # 메타블록 + 로직 합본 (301줄)
README.md · LICENSE · docs/spec.md
```

### After
```
src/core.js                 # 순수 로직 (IIFE 본체 + CSS 문자열). 단일 진실 소스
userscript/header.txt       # ==UserScript== 메타블록만 분리 (@version 은 토큰 치환)
extension/manifest.json     # MV3 매니페스트 템플릿 (version 은 토큰 치환)
extension/icons/            # icon-16.png / icon-48.png / icon-128.png
build/build.mjs             # Node 빌드 스크립트
package.json                # version 단일 소스 + pnpm scripts
.gitignore                  # dist/ 무시
dist/                       # 빌드 산출물 (gitignore)
  ├── extension/            # 언팩 확장 (manifest + content.js + icons)
  └── extension.zip         # Web Store 업로드용
github-resolved-comment-scroll.user.js   # ★ 루트 산출물은 그대로 유지·커밋
README.md · LICENSE · docs/
```

★ **핵심 제약**: 현재 `.user.js`의 `@downloadURL`/`@updateURL`이
`raw.githubusercontent.com/korECM/github-resolved-comment-scroll/main/github-resolved-comment-scroll.user.js`
를 가리킨다. 기존 Greasy Fork/Tampermonkey 사용자의 자동 업데이트가 깨지지 않도록
**루트 `.user.js` 경로를 유지**하고, 빌드 산출물을 그 자리에 커밋한다.

## src/core.js — 거의 무변경 (공유 코어의 이점)

- **Before**: `.user.js` 28~301줄 IIFE 본체. `injectStyle()`이 `GM_addStyle` 우선, 없으면 `<style>` 폴백.
- **After**: 메타블록(1~26줄)을 떼고 IIFE 본체를 그대로 `src/core.js`로 이동. **로직 변경 없음.**
  - 확장에서는 `GM_addStyle`이 `undefined` → 기존 `<style>` 폴백 경로로 자동 진입.
  - **CSP 관련**: 유저스크립트는 GitHub CSP(`script-src github.githubassets.com`) 때문에 `GM_addStyle`로 우회해야 했지만, 확장 content script는 isolated world라 DOM에 넣는 `<style>`이 페이지 CSP 적용을 받지 않는다. 폴백 경로가 확장에서 정상 동작한다. (빌드 후 실제 로드로 확인)
  - 진단 마커 `id="grcs-style"` 유지 → README의 진단법(`document.getElementById('grcs-style')`)이 확장에서도 그대로 통한다.

## extension/manifest.json (MV3)

```jsonc
{
  "manifest_version": 3,
  "name": "GitHub: Scroll to Resolved Comment",
  "version": "__VERSION__",          // 빌드시 package.json에서 치환
  "description": "...",               // 유저스크립트 @description 재사용
  "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" },
  "content_scripts": [{
    "matches": ["https://github.com/*"],
    "js": ["content.js"],             // = src/core.js
    "run_at": "document_idle",        // @run-at document-idle 대응
    "all_frames": false               // @noframes 대응
  }]
}
```
- 권한 전무 → content script matches만으로 충분. 최소 권한이라 스토어 심사가 가볍다.

## build/build.mjs (의존성 0 — Node 내장 + macOS `zip`)

`package.json`의 `version`을 단일 소스로 읽어:
1. **유저스크립트**: `userscript/header.txt`(`__VERSION__` 치환) + `src/core.js` → 루트 `github-resolved-comment-scroll.user.js`
2. **확장**: `dist/extension/`에 `manifest.json`(`__VERSION__` 치환) + `content.js`(=`src/core.js` 복사) + 아이콘 복사
3. **패키징**: `dist/extension.zip` (macOS 내장 `zip` 호출)

실행: `pnpm build`. (`package.json` scripts에 등록)

## 아이콘

외부에서 생성한 정사각 원본 PNG(권장 1024px, 투명 배경)를 `sips`로 변환:
```
sips -z 128 128 원본.png --out extension/icons/icon-128.png
sips -z 48 48 원본.png --out extension/icons/icon-48.png
sips -z 16 16 원본.png --out extension/icons/icon-16.png
```

원본 생성 프롬프트(영문 권장):
> A minimalist flat app icon, 1024×1024, centered on a transparent background. A rounded code-review speech bubble with a downward arrow pointing into it, suggesting "jump to a comment". GitHub-style palette: dark slate (#24292f) bubble with a green (#2ea44f) accent arrow. Clean geometric shapes, thick rounded strokes, no text, high contrast, subtle padding. Flat vector style.

## README / docs

- README에 "Chrome 확장으로 설치" 섹션 추가(스토어 링크는 등록 후 채움). 유저스크립트 안내는 유지.
- `docs/spec.md`에 확장 빌드/배포 형태를 한 줄 추가하거나 본 문서로 링크.

## 검증

- 빌드된 루트 `.user.js`가 기존과 기능 동일 — 메타블록 외 로직 diff 없음 확인.
- `dist/extension/`을 `chrome://extensions` 언팩 로드 → resolved 코멘트 permalink로 펼침 + 스크롤 + 하이라이트 동작 (수동).
- 확장에서 `document.getElementById('grcs-style')`가 `null`이 아님 확인.
- `pnpm build` 재실행이 idempotent (산출물 동일).

## 비목표 (YAGNI)

- 팝업/옵션 페이지/설정 저장 — 추가하지 않는다.
- Firefox(`browser.*`)/Safari 확장 동시 빌드 — 이번 범위 밖. 단 core.js는 브라우저 API 비의존이라 추후 확장 가능.
- TypeScript/번들러 도입 — 300줄 단일 파일엔 과하다.
- GitHub Enterprise 도메인 — 기존과 동일하게 `github.com`만.
