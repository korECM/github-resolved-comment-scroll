# GitHub: Scroll to Resolved Comment

GitHub Pull Request에서 **resolve(해결 처리)되어 접힌 리뷰 코멘트의 permalink**(`...#discussion_r123…`)로 이동하면, 해당 위치로 스크롤이 되지 않는 문제를 고치는 유저스크립트입니다.

resolve된 리뷰 스레드는 PR Conversation 탭에서 **접힌 상태(`display:none`)로 렌더링**되어 레이아웃 좌표가 없습니다. 그래서 브라우저의 fragment(`#…`) 점프도, `scrollIntoView()`도 대상 위치를 찾지 못합니다. 이 스크립트는 permalink로 들어왔을 때 **해당 스레드를 자동으로 펼치고 → 스크롤 → 잠깐 하이라이트**해 줍니다.

> 참고: 이건 4년 넘게 미해결인 GitHub 자체 버그입니다 — [community discussion #10367](https://github.com/orgs/community/discussions/10367)

## 무엇이 고쳐지나

- ✅ resolve된 리뷰 코멘트 permalink를 **새 탭/주소창**으로 열 때 → 펼쳐지고 스크롤됨
- ✅ 같은 PR 안에서 permalink **클릭 이동**(Turbo 네비게이션) → 동작
- ✅ **뒤로/앞으로** 이동 → 동작
- ✅ resolve 아닌 일반 코멘트, 비-PR 페이지 → **아무 영향 없음** (기존 GitHub 동작 보존)

## 설치 (팀원용)

1. 브라우저에 유저스크립트 매니저를 설치합니다.
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox/Safari) — 권장
   - 또는 [Violentmonkey](https://violentmonkey.github.io/)
2. **⚠️ Chrome / Edge 사용자는 "유저스크립트 실행 권한"을 먼저 켜야 합니다.**
   Tampermonkey 5.3+ 부터 Chrome 계열에서는 이 설정 없이는 **어떤 유저스크립트도 실행되지 않습니다** ([Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209)). 둘 중 하나를 켜세요:
   - **Chrome / Edge 138 이상**: Tampermonkey 아이콘 우클릭 → **확장 프로그램 관리(Manage extension)** → **"사용자 스크립트 허용(Allow user scripts)"** 토글 **ON**
   - **그 이전 버전**: 주소창에 `chrome://extensions` (Edge는 `edge://extensions`) → 우측 상단 **개발자 모드(Developer mode)** 토글 **ON**
   - Firefox / Safari 는 이 단계가 필요 없습니다.

3. 아래 링크를 클릭하면 매니저가 설치 팝업을 자동으로 띄웁니다 → **Install** 클릭.

   👉 **[github-resolved-comment-scroll.user.js 설치](https://raw.githubusercontent.com/korECM/github-resolved-comment-scroll/main/github-resolved-comment-scroll.user.js)**

4. 끝. GitHub PR에서 resolve된 코멘트 링크로 이동해 보세요.

스크립트가 업데이트되면 매니저가 `@updateURL`을 통해 **자동으로 갱신**합니다.

## 사용법 / 검증

resolve된 리뷰 코멘트의 우측 `…` 메뉴 → **Copy link** 로 얻은 URL(`https://github.com/<owner>/<repo>/pull/<n>#discussion_r…`)을 새 탭에서 열면, 해당 스레드가 펼쳐지고 그 코멘트로 스크롤되며 잠깐 노란 테두리로 강조됩니다.

## 동작 방식

`github-resolved-comment-scroll.user.js` 한 파일로 동작합니다.

1. 최초 로드 / Turbo·PJAX 전환 / `hashchange` / `popstate` 시 현재 `location.hash`를 검사
2. 해시가 리뷰 코멘트 형태(`#discussion_r…` 또는 `#r…`)이고 PR 페이지일 때만 동작
3. 이미 보이면 곧장 스크롤. 아니면 숨겨진 코멘트 id를 담은 스레드 컨테이너(`[data-hidden-comment-ids]`, 신규 `<review-thread-collapsible>`)를 찾음
4. 컨테이너의 토글 버튼을 클릭해 펼침. 현재 GitHub은 코멘트 본문을 **토글 시 지연 로드**(`data-deferred-content-url`)하므로, `requestAnimationFrame` 폴링으로 코멘트(`#discussion_r…`)가 나타나고 렌더될 때까지 대기 (웹컴포넌트 upgrade 전 무효 클릭은 일정 간격으로 재시도)
5. 렌더가 끝나면 `scrollIntoView({block:'center'})` + 하이라이트
6. 어느 단계든 실패하거나 시간 초과(6s) 시 **조용히 종료**해 GitHub 기본 동작을 깨뜨리지 않음

GitHub DOM은 자주 바뀌므로(2026년 현재 resolved 스레드는 `<review-thread-collapsible>` 웹컴포넌트로 전환됨), 사용하는 셀렉터는 스크립트 상단 `SELECTORS` 객체에 모아 두었습니다. 구식 구조(`.js-resolvable-thread-toggler` 등)도 fallback으로 함께 처리합니다. 동작이 깨지면 그 부분만 수정하면 됩니다.

### 알려진 제한 (v1)

- resolve된 스레드의 **지연 로드는 처리합니다**(토글 → 로드 → 스크롤).
- 다만 resolve 컨테이너가 아닌 일반 "Load more"/pagination 뒤에 숨어 **아직 DOM에 없는** 코멘트는 점프하지 않고 조용히 종료합니다. 향후 자동 "Load more" 클릭 지원을 고려할 수 있습니다.
- Files changed 탭의 인라인 스레드는 구조가 조금 다를 수 있어 추가 검증이 필요합니다(현재는 Conversation 탭 기준으로 검증됨).

## 문제 해결

**설치했는데 아무 동작도 안 한다면** — 콘솔에서 `document.getElementById('grcs-style')`를 실행해 보세요. `null`이면 스크립트가 실행조차 안 되는 것입니다. 흔한 원인 두 가지:

1. **Chrome / Edge 유저스크립트 권한 미설정** (팀원에게 가장 흔함) — 위 설치 2단계("사용자 스크립트 허용" 토글 또는 개발자 모드)를 켜지 않으면 Tampermonkey 5.3+ 에서 어떤 유저스크립트도 실행되지 않습니다. → [Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209)
2. **`@grant`를 `none`으로 되돌림** (유지보수자 주의) — GitHub은 CSP로 인라인 스크립트(`script-src github.githubassets.com`)를 차단하므로 `@grant none`이면 스크립트가 페이지에 주입되지 못해 실행이 막힙니다. 이 스크립트는 `@grant GM_addStyle`을 선언해 **샌드박스(격리 컨텍스트)** 에서 실행해 CSP를 우회합니다 — `none`으로 되돌리지 마세요.

## 다른 곳에 호스팅한다면

이 레포를 `korECM`가 아닌 다른 계정/조직(GitHub org 등)에 올린다면, 자동 업데이트가 동작하도록 아래 두 곳의 owner를 실제 위치로 바꿔 주세요.

- `github-resolved-comment-scroll.user.js`의 `@downloadURL` / `@updateURL`
- 이 README의 설치 링크

## 라이선스

[MIT](./LICENSE)
