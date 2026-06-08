# Spec — GitHub: Scroll to Resolved Comment

작성일: 2026-06-02

## 문제

GitHub PR에서 resolve된 리뷰 코멘트의 permalink(`...#discussion_r<id>`)로 이동하면 그 위치로 스크롤/점프가 되지 않는다. resolve된 리뷰 스레드가 접힌 상태(`display:none`)로 렌더링되어 레이아웃 좌표가 없기 때문에 브라우저 fragment 점프와 `scrollIntoView()` 모두 대상 위치를 계산하지 못한다. GitHub 자체 미해결 버그([community #10367](https://github.com/orgs/community/discussions/10367)).

## 목표

permalink로 진입/이동했을 때 접힌 resolve 스레드를 자동으로 펼치고 해당 코멘트로 스크롤 + 하이라이트한다. 다른 경우(일반 코멘트, 비-PR 페이지, 펼치기 실패)에는 GitHub 기본 동작을 절대 깨뜨리지 않는다.

## 비목표 (YAGNI)

- "Load more"로 lazy-load되어 DOM에 아직 없는 코멘트의 자동 로드는 v1에서 제외.
- GitHub Enterprise(자체 호스팅) 도메인 지원 제외 (`github.com`만).

## 배포 형태

- 유저스크립트(`.user.js`) 단일 파일. Tampermonkey/Violentmonkey로 설치.
- `@downloadURL`/`@updateURL` raw GitHub URL로 팀원 자동 업데이트.
- 검증 후 Greasy Fork 또는 Refined GitHub PR로 확장 가능.
- 크롬 확장(MV3): 동일 코어를 `dist/extension/`으로 빌드. 설계는 [`chrome-extension-spec.md`](./chrome-extension-spec.md).

## 설계 요약

| 항목 | 내용 |
|------|------|
| 트리거 | 최초 로드, `turbo:load`/`turbo:render`/`pjax:end`, `popstate`, `hashchange` (debounce로 합침) |
| 게이트 | `/owner/repo/pull/N` 경로 + 해시가 `#(discussion_)?r\d+` 형태일 때만 |
| 컨테이너 탐색 | 숨겨진 코멘트 id를 담은 `[data-hidden-comment-ids]` 컨테이너(신규 `<review-thread-collapsible>`)에서 대상 num 매칭. 구식은 숨겨진 요소의 `closest()` |
| 펼치기 | 닫힌 `<details>` open; 토글 버튼(`[data-action*="review-thread-collapsible#toggle"]`) click. 구식 fallback: `.js-resolvable-thread-toggler` click 또는 `d-none`/`[hidden]` 제거 |
| 지연 로드 대기 | 현재 GitHub은 토글 시 `data-deferred-content-url`로 코멘트를 지연 로드 → `requestAnimationFrame` 폴링(6s)으로 `#discussion_r<id>` 등장+렌더 대기. upgrade 전 무효 클릭은 `retryClickMs`(800ms) 간격 재시도 |
| 스크롤 | `scrollIntoView({block:'center', behavior:'smooth'})` |
| 하이라이트 | 1.8s box-shadow flash (레이아웃 영향 없음), `scroll-margin-top` 80px |
| 견고성 | 셀렉터 상수화(`SELECTORS`), 전 단계 try/catch, 못 찾으면 조용히 종료 |

## 현재 GitHub 구조 (2026-06 검증)

resolved 리뷰 스레드는 웹컴포넌트로 전환됨:

```html
<review-thread-collapsible
    class="… js-resolvable-timeline-thread-container …"
    data-resolved="true"
    data-deferred-content-url="/…/pull/9651/threads/2247413012?…"
    data-hidden-comment-ids="3330594042">
  <button data-action="click:review-thread-collapsible#toggle" aria-expanded="false">…</button>
</review-thread-collapsible>
```

검증(HTTP 레벨, refined-github PR #9651):
- 서버 HTML에 `review-thread-collapsible` 컨테이너 + `data-hidden-comment-ids` 존재 ✓
- 토글 버튼 `data-action="click:review-thread-collapsible#toggle"` + `aria-expanded` 존재 ✓
- deferred-content-url 파셜 응답에 `id="discussion_r3330594042"` 존재 ✓ (= 대기 대상 id 가정 확인)

미검증(브라우저 미설치): 실제 브라우저에서 `.click()`이 Catalyst toggle을 트리거해 fetch→삽입→스크롤까지 가는 end-to-end는 설치 후 수동 확인 필요(설치 즉시 검증 가능).

## 검증 (수동)

1. resolve된 코멘트 Copy link → 새 탭에서 열기 → 펼침 + 스크롤 + 하이라이트
2. PR 내 permalink 클릭 이동(Turbo) → 동작
3. 브라우저 뒤로/앞으로 → 동작
4. 일반(비-resolve) 코멘트 permalink → 기존 동작 유지
5. 비-PR 페이지 → 무영향
