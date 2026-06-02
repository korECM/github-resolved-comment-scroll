// ==UserScript==
// @name         GitHub: Scroll to Resolved Comment
// @namespace    https://github.com/korECM
// @version      0.1.0
// @description  GitHub PR에서 resolve되어 접힌 리뷰 코멘트의 permalink(#discussion_r…)로 이동했을 때, 해당 스레드를 자동으로 펼치고(지연 로드 포함) 그 위치로 스크롤 + 하이라이트합니다.
// @author       korECM
// @match        https://github.com/*
// @run-at       document-idle
// @noframes
// @grant        none
// @homepageURL  https://github.com/korECM/github-resolved-comment-scroll
// @supportURL   https://github.com/korECM/github-resolved-comment-scroll/issues
// @downloadURL  https://raw.githubusercontent.com/korECM/github-resolved-comment-scroll/main/github-resolved-comment-scroll.user.js
// @updateURL    https://raw.githubusercontent.com/korECM/github-resolved-comment-scroll/main/github-resolved-comment-scroll.user.js
// ==/UserScript==

// 다른 GitHub 계정/조직 레포에 호스팅한다면 위의 @downloadURL / @updateURL 의 owner(korECM)를
// 실제 호스팅 위치로 바꿔야 자동 업데이트가 동작합니다. (README 참고)

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 설정값. GitHub DOM이 자주 바뀌므로 셀렉터는 한 곳에 모아 관리한다.
  // 동작이 깨지면 SELECTORS 만 수정하면 된다.
  //
  // 현재(2026-06) GitHub resolved 리뷰 스레드 구조:
  //   <review-thread-collapsible
  //       class="... js-resolvable-timeline-thread-container ..."
  //       data-resolved="true"
  //       data-deferred-content-url="/.../threads/<n>?..."   ← 토글 시 코멘트 본문을 지연 로드
  //       data-hidden-comment-ids="3330594042 ...">          ← 숨겨진 코멘트 id 목록
  //     <button data-action="click:review-thread-collapsible#toggle" aria-expanded="false">…</button>
  //   </review-thread-collapsible>
  // 즉 코멘트(#discussion_r<id>)는 토글 전에는 DOM에 없으므로, 컨테이너를 찾아 토글한 뒤
  // 지연 로드된 코멘트가 나타날 때까지 기다렸다 스크롤한다.
  // ---------------------------------------------------------------------------
  const CONFIG = {
    waitTimeoutMs: 6000, // 펼치고 지연 로드된 코멘트가 렌더될 때까지 기다리는 최대 시간
    retryClickMs: 800, // 토글 클릭 재시도 간격(웹컴포넌트 upgrade 전 무효 클릭 대비)
    debounceMs: 60, // 여러 네비게이션 이벤트가 몰려 들어올 때 합치는 간격
    flashMs: 1800, // 하이라이트 지속 시간 (CSS animation과 맞춤)
    scrollMarginTop: 80, // sticky 헤더에 가리지 않도록 여백
  };

  const SELECTORS = {
    // resolve된 스레드를 감싸는 컨테이너 후보 (신규 웹컴포넌트 + 구식 fallback)
    container:
      'review-thread-collapsible, [data-hidden-comment-ids], .js-resolvable-timeline-thread-container, .js-resolvable-thread',
    // 펼치기 토글 버튼 후보 (신규 Catalyst action + 구식 fallback)
    toggleButton:
      'button[data-action*="review-thread-collapsible#toggle"], button[data-target="review-thread-collapsible.button"], .js-resolvable-thread-toggler',
    // 구식 구조에서 접혀 숨겨진 본문
    oldHiddenContents:
      '.js-resolvable-thread-contents.d-none, .js-resolvable-thread-contents[hidden]',
  };

  const FLASH_CLASS = 'grcs-flash';

  let debounceTimer = null;

  // ---------------------------------------------------------------------------
  // 페이지/해시 판별
  // ---------------------------------------------------------------------------

  // isPullRequestPage 현재 페이지가 PR 페이지인지 확인한다 (/owner/repo/pull/123[...]).
  function isPullRequestPage() {
    return /^\/[^/]+\/[^/]+\/pull\/\d+/.test(location.pathname);
  }

  // isReviewCommentAnchor 해시가 리뷰 코멘트 permalink 형태인지 확인한다.
  // 예) discussion_r123456789, r123456789
  function isReviewCommentAnchor(id) {
    return /^(discussion_)?r\d+$/.test(id);
  }

  // ---------------------------------------------------------------------------
  // 요소 탐색
  // ---------------------------------------------------------------------------

  // firstExisting 후보 id 중 DOM에 존재하는 첫 요소를 반환한다.
  function firstExisting(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  // firstRendered 후보 id 중 실제로 렌더되어 스크롤 가능한 첫 요소를 반환한다.
  // 접힌 컨테이너(display:none) 안의 요소는 client rect가 없다.
  function firstRendered(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.getClientRects().length > 0) return el;
    }
    return null;
  }

  // findContainer 숨겨진 코멘트 id(num)를 담은 접힌 스레드 컨테이너를 찾는다.
  function findContainer(num, ids) {
    const nodes = document.querySelectorAll('[data-hidden-comment-ids]');
    for (const c of nodes) {
      const tokens = (c.getAttribute('data-hidden-comment-ids') || '').split(/[\s,]+/);
      if (tokens.includes(num)) return c;
    }
    // 구식 구조: 코멘트가 숨겨진 채 DOM에 이미 있는 경우 그 조상 컨테이너
    const existing = firstExisting(ids);
    return existing ? existing.closest(SELECTORS.container) : null;
  }

  // ---------------------------------------------------------------------------
  // 펼치기
  // ---------------------------------------------------------------------------

  // ensureDetailsOpen 조상의 닫힌 <details>(outdated diff 등)를 모두 연다.
  function ensureDetailsOpen(node) {
    let n = node;
    while (n && n !== document.body) {
      if (n.tagName === 'DETAILS' && !n.open) n.open = true;
      n = n.parentElement;
    }
  }

  // isExpanded 컨테이너가 이미 펼쳐졌는지 판단한다(상태를 알 수 없으면 false).
  function isExpanded(container) {
    const btn = container.querySelector(SELECTORS.toggleButton);
    if (btn && btn.hasAttribute('aria-expanded')) {
      return btn.getAttribute('aria-expanded') === 'true';
    }
    const hidden = container.querySelector(SELECTORS.oldHiddenContents);
    if (hidden) return false;
    return false;
  }

  // clickToggle 컨테이너를 펼친다 (신규: 토글 버튼 클릭, 구식: 토글러/숨김 해제).
  function clickToggle(container) {
    try {
      const btn = container.querySelector(SELECTORS.toggleButton);
      if (btn) {
        btn.click();
        return;
      }
      const hidden = container.querySelector(SELECTORS.oldHiddenContents);
      if (hidden) {
        hidden.classList.remove('d-none');
        hidden.removeAttribute('hidden');
      }
    } catch (err) {
      console.debug('[grcs] clickToggle failed:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 하이라이트 + 스크롤
  // ---------------------------------------------------------------------------

  // flash 대상 요소에 잠깐 하이라이트 링을 보여준다.
  function flash(el) {
    el.classList.remove(FLASH_CLASS);
    void el.offsetWidth; // reflow 강제로 애니메이션 재시작
    el.classList.add(FLASH_CLASS);
    setTimeout(() => el.classList.remove(FLASH_CLASS), CONFIG.flashMs);
  }

  // scrollAndFlash 하이라이트를 먼저 적용(scroll-margin 반영)한 뒤 스크롤한다.
  function scrollAndFlash(el) {
    flash(el);
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  // ---------------------------------------------------------------------------
  // 핵심 동작
  // ---------------------------------------------------------------------------

  // handleHash 현재 해시가 resolve된 리뷰 코멘트면 펼치고 스크롤한다.
  async function handleHash() {
    if (!isPullRequestPage()) return;

    const raw = decodeURIComponent(location.hash.slice(1));
    if (!raw || !isReviewCommentAnchor(raw)) return;

    const num = (raw.match(/(\d+)$/) || [])[1];
    if (!num) return;
    const ids = [`discussion_r${num}`, `r${num}`, raw];

    // 1) 이미 보이면 바로 스크롤 (일반 코멘트, 이미 펼쳐진 스레드, 재실행 등)
    const visible = firstRendered(ids);
    if (visible) {
      scrollAndFlash(visible);
      return;
    }

    // 2) 접힌 스레드를 펼치고, 지연 로드된 코멘트가 나타날 때까지 폴링한다.
    const deadline = performance.now() + CONFIG.waitTimeoutMs;
    let lastClickAt = 0;

    await new Promise((resolve) => {
      (function tick() {
        const el = firstRendered(ids);
        if (el) {
          scrollAndFlash(el);
          return resolve();
        }
        if (performance.now() > deadline) return resolve(); // 조용히 종료(기본 동작 보존)

        const container = findContainer(num, ids);
        if (container) {
          ensureDetailsOpen(container);
          const now = performance.now();
          // 아직 안 펼쳐졌고 마지막 클릭 후 충분히 지났으면 토글
          // (웹컴포넌트 upgrade 전의 무효 클릭에 대비한 재시도)
          if (!isExpanded(container) && now - lastClickAt > CONFIG.retryClickMs) {
            clickToggle(container);
            lastClickAt = now;
          }
        }
        requestAnimationFrame(tick);
      })();
    });
  }

  // scheduleHandle 여러 네비게이션 이벤트를 합쳐 한 번만 처리한다.
  function scheduleHandle() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleHash, CONFIG.debounceMs);
  }

  // ---------------------------------------------------------------------------
  // 스타일 주입 (하이라이트)
  // ---------------------------------------------------------------------------
  function injectStyle() {
    if (document.getElementById('grcs-style')) return;
    const style = document.createElement('style');
    style.id = 'grcs-style';
    style.textContent = `
      @keyframes grcs-flash-kf {
        0%   { box-shadow: 0 0 0 2px rgba(255,193,7,0.95), 0 0 0 7px rgba(255,193,7,0.45); }
        100% { box-shadow: 0 0 0 2px rgba(255,193,7,0),    0 0 0 7px rgba(255,193,7,0); }
      }
      .${FLASH_CLASS} {
        animation: grcs-flash-kf ${CONFIG.flashMs}ms ease-out;
        border-radius: 6px;
        scroll-margin-top: ${CONFIG.scrollMarginTop}px;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // 초기화
  // ---------------------------------------------------------------------------
  function init() {
    injectStyle();
    scheduleHandle(); // 최초 로드

    // 일반 해시/히스토리 변경
    window.addEventListener('hashchange', scheduleHandle);
    window.addEventListener('popstate', scheduleHandle);

    // GitHub의 Turbo/PJAX 페이지 전환
    document.addEventListener('turbo:load', scheduleHandle);
    document.addEventListener('turbo:render', scheduleHandle);
    document.addEventListener('pjax:end', scheduleHandle);
  }

  init();
})();
