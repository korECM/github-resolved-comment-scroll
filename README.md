# GitHub: Scroll to Resolved Comment

GitHub PR에서 **resolve되어 접힌 리뷰 코멘트의 permalink**(`...#discussion_r…`)로 이동하면 그 위치로 스크롤되지 않는 문제를 고치는 유저스크립트입니다. permalink로 들어오면 해당 스레드를 **자동으로 펼치고 → 스크롤 → 잠깐 하이라이트**합니다. (GitHub 자체 미해결 버그: [community #10367](https://github.com/orgs/community/discussions/10367))

## 무엇이 고쳐지나

- ✅ resolve된 리뷰 코멘트 permalink를 새 탭/주소창으로 열 때 → 펼쳐지고 스크롤됨
- ✅ 같은 PR 안에서 permalink 클릭 이동 / 뒤로·앞으로 → 동작
- ✅ 일반 코멘트·비-PR 페이지 → 아무 영향 없음

## 설치

1. 유저스크립트 매니저 설치 — [Tampermonkey](https://www.tampermonkey.net/) (권장) 또는 [Violentmonkey](https://violentmonkey.github.io/)
2. **Chrome / Edge 는 유저스크립트 실행 권한을 먼저 켜야 합니다** (안 켜면 어떤 유저스크립트도 실행 안 됨 — [Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209)):
   - **Chrome / Edge 138 이상**: Tampermonkey 아이콘 우클릭 → **확장 프로그램 관리** → **"사용자 스크립트 허용(Allow user scripts)"** 토글 **ON**
   - **그 이전 버전**: `chrome://extensions` (Edge는 `edge://extensions`) → 우측 상단 **개발자 모드** **ON**
   - Firefox / Safari 는 불필요
3. 아래 링크 클릭 → 매니저 설치 팝업에서 **Install**:

   👉 **[설치](https://raw.githubusercontent.com/korECM/github-resolved-comment-scroll/main/github-resolved-comment-scroll.user.js)**

설치 후 resolve된 코멘트의 `…` 메뉴 → **Copy link** URL을 열어 확인하세요. 업데이트는 매니저가 자동으로 갱신합니다.

## 안 될 때

콘솔에서 `document.getElementById('grcs-style')`가 `null`이면 스크립트가 실행되지 않는 것입니다. 원인:

1. **Chrome / Edge 유저스크립트 권한 미설정** (가장 흔함) — 위 설치 2단계 참고 ([FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209))
2. **`@grant`가 `none`** (유지보수자 주의) — GitHub CSP가 인라인 스크립트를 막아 실행이 안 됩니다. 이 스크립트는 `@grant GM_addStyle`로 샌드박스에서 실행해 우회하므로 `none`으로 되돌리지 마세요.

## 라이선스

[MIT](./LICENSE)
