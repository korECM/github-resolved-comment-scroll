# GitHub: Scroll to Resolved Comment

[English](#github-scroll-to-resolved-comment) · [한국어](#한국어)

[![Greasy Fork version](https://img.shields.io/greasyfork/v/580818)](https://greasyfork.org/en/scripts/580818-github-scroll-to-resolved-comment)
[![Greasy Fork installs](https://img.shields.io/greasyfork/dt/580818)](https://greasyfork.org/en/scripts/580818-github-scroll-to-resolved-comment)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

A userscript that fixes GitHub's broken permalinks to **resolved (collapsed) review comments**. When you open a `...#discussion_r…` link to a resolved comment, GitHub doesn't scroll to it — the thread is collapsed and has no layout position. This script **auto-expands the thread, scrolls to the comment, and briefly highlights it**.

> A long-standing GitHub bug, unresolved for 4+ years — [community discussion #10367](https://github.com/orgs/community/discussions/10367).

## What it fixes

- ✅ Opening a resolved review-comment permalink in a new tab / the address bar → expands & scrolls to it
- ✅ Clicking a permalink within a PR (Turbo navigation), or back/forward → works
- ✅ Regular comments and non-PR pages → left untouched

## Install

1. Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) (recommended) or [Violentmonkey](https://violentmonkey.github.io/).
2. **Chrome / Edge users must enable userscript execution first.** Without it, *no* userscript runs at all ([Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209)):
   - **Chrome / Edge 138+**: right-click the Tampermonkey icon → **Manage extension** → turn on **"Allow user scripts"**.
   - **Older versions**: open `chrome://extensions` (or `edge://extensions`) → enable **Developer mode** (top-right).
   - Firefox / Safari: not needed.
3. Install the script and confirm **Install** in your manager:

   👉 **[Install from Greasy Fork](https://greasyfork.org/en/scripts/580818-github-scroll-to-resolved-comment)** (recommended) — or [install the raw file](https://raw.githubusercontent.com/korECM/github-resolved-comment-scroll/main/github-resolved-comment-scroll.user.js)

After installing, open any resolved comment's `…` menu → **Copy link** and try it. Your manager keeps the script up to date automatically.

## Not working?

Run `document.getElementById('grcs-style')` in the DevTools console. If it returns `null`, the script isn't running. Two common causes:

1. **Userscript execution not enabled (Chrome / Edge)** — the most common case. See Install step 2 ([FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209)).
2. **`@grant` reverted to `none`** (for maintainers) — GitHub's CSP (`script-src github.githubassets.com`) blocks inline scripts, so a `@grant none` userscript is never injected. This script declares `@grant GM_addStyle` so it runs sandboxed and bypasses the CSP — don't change it back.

## Contributing

Issues and pull requests are welcome: <https://github.com/korECM/github-resolved-comment-scroll/issues>. Internal design notes live in [`docs/spec.md`](./docs/spec.md).

## License

[MIT](./LICENSE)

---

# 한국어

[English](#github-scroll-to-resolved-comment) · [한국어](#한국어)

GitHub PR에서 **resolve되어 접힌 리뷰 코멘트의 permalink**(`...#discussion_r…`)로 이동하면 그 위치로 스크롤되지 않는 문제를 고치는 유저스크립트입니다. resolve된 스레드는 접힌 상태라 레이아웃 좌표가 없어 GitHub이 스크롤하지 못합니다. 이 스크립트는 permalink로 들어오면 **해당 스레드를 자동으로 펼치고 → 스크롤 → 잠깐 하이라이트**합니다.

> 4년 넘게 미해결인 GitHub 자체 버그입니다 — [community discussion #10367](https://github.com/orgs/community/discussions/10367).

## 무엇이 고쳐지나

- ✅ resolve된 리뷰 코멘트 permalink를 새 탭 / 주소창으로 열 때 → 펼쳐지고 스크롤됨
- ✅ 같은 PR 안에서 permalink 클릭 이동(Turbo), 뒤로·앞으로 → 동작
- ✅ 일반 코멘트·비-PR 페이지 → 아무 영향 없음

## 설치

1. 유저스크립트 매니저 설치 — [Tampermonkey](https://www.tampermonkey.net/) (권장) 또는 [Violentmonkey](https://violentmonkey.github.io/)
2. **Chrome / Edge 는 유저스크립트 실행 권한을 먼저 켜야 합니다.** 안 켜면 *어떤* 유저스크립트도 실행되지 않습니다 ([Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209)):
   - **Chrome / Edge 138 이상**: Tampermonkey 아이콘 우클릭 → **확장 프로그램 관리** → **"사용자 스크립트 허용(Allow user scripts)"** 토글 **ON**
   - **그 이전 버전**: `chrome://extensions` (Edge는 `edge://extensions`) → 우측 상단 **개발자 모드** **ON**
   - Firefox / Safari 는 불필요
3. 스크립트를 설치하고 매니저 팝업에서 **Install**:

   👉 **[Greasy Fork에서 설치](https://greasyfork.org/ko/scripts/580818-github-scroll-to-resolved-comment)** (권장) — 또는 [raw 파일로 설치](https://raw.githubusercontent.com/korECM/github-resolved-comment-scroll/main/github-resolved-comment-scroll.user.js)

설치 후 resolve된 코멘트의 `…` 메뉴 → **Copy link** URL을 열어 확인하세요. 업데이트는 매니저가 자동으로 갱신합니다.

## 안 될 때

DevTools 콘솔에서 `document.getElementById('grcs-style')`를 실행해 `null`이면 스크립트가 실행되지 않는 것입니다. 흔한 원인 두 가지:

1. **Chrome / Edge 유저스크립트 권한 미설정** — 가장 흔함. 설치 2단계 참고 ([FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209))
2. **`@grant`를 `none`으로 되돌림** (유지보수자 주의) — GitHub CSP(`script-src github.githubassets.com`)가 인라인 스크립트를 막아 `@grant none`이면 실행되지 않습니다. 이 스크립트는 `@grant GM_addStyle`로 샌드박스 실행해 우회하므로 되돌리지 마세요.

## 기여

이슈·PR 환영합니다: <https://github.com/korECM/github-resolved-comment-scroll/issues>. 내부 설계 노트는 [`docs/spec.md`](./docs/spec.md)에 있습니다.

## 라이선스

[MIT](./LICENSE)
