import {
  AD_CAMPAIGN_PARAM_PATTERNS,
  ANTI_ADBLOCK_SELECTORS,
  FORCE_UNHIDE_SELECTORS,
  isProtectedDomain,
  KNOWN_REDIRECT_AND_POPUP_DOMAINS,
  STEALTH_CONFIG,
} from '@/constants';

/**
 * Defuses anti-adblock warning elements and unhides legitimate content/download links.
 */
export function defuseAntiAdblockElements(): void {
  if (typeof window !== 'undefined' && isProtectedDomain(window.location.hostname)) {
    return;
  }

  if (typeof document === 'undefined') {
    return;
  }

  for (const selector of ANTI_ADBLOCK_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const el of Array.from(elements)) {
      if (el instanceof HTMLElement && !el.dataset.padbDefused) {
        el.dataset.padbDefused = 'true';
        el.classList.add('hide-popup');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');

        window.dispatchEvent(
          new CustomEvent('__padb_stealth_event', {
            detail: { type: 'stealth_defused' },
          })
        );
      }
    }
  }

  for (const selector of FORCE_UNHIDE_SELECTORS) {
    const unhideTargets = document.querySelectorAll(selector);
    for (const el of Array.from(unhideTargets)) {
      if (el instanceof HTMLElement) {
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
      }
    }
  }
}

/**
 * Personal AdBlock - Anti-Adblock Stealth Defuser & Page-Level Interceptor
 * Runs in the page's MAIN execution world at document_start.
 */
export function initStealthDefuser(): void {
  // Never interfere with essential productivity, AI, or developer platforms (ChatGPT, Claude, Google, GitHub, etc.)
  if (typeof window !== 'undefined' && isProtectedDomain(window.location.hostname)) {
    return;
  }

  // Always run DOM defusal pass if document is accessible
  if (typeof document !== 'undefined') {
    defuseAntiAdblockElements();
  }

  // Avoid double-initialization of globals
  if ((window as unknown as { __padb_stealth_initialized?: boolean }).__padb_stealth_initialized) {
    return;
  }
  (window as unknown as { __padb_stealth_initialized?: boolean }).__padb_stealth_initialized = true;

  function isAdUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (AD_CAMPAIGN_PARAM_PATTERNS.some((pattern) => pattern.test(lower))) {
      return true;
    }
    return KNOWN_REDIRECT_AND_POPUP_DOMAINS.some((domain) => lower.includes(domain));
  }

  // 1. Spoof Anti-Adblock Global Bait Variables
  try {
    const win = window as unknown as Record<string, unknown>;
    win.canRunAds = true;
    win.isAdBlockActive = false;
    win.adblock = false;
    win.adBlockerDetected = false;
    win.google_ad_client = STEALTH_CONFIG.SPOOFED_CLIENT_ID;

    // Spoof adsbygoogle with a smart mock that marks ad units loaded
    const fakeAdsByGoogle: unknown[] = [];
    const pushMock = function (...args: unknown[]) {
      try {
        const pending = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
        pending.forEach((ins) => {
          ins.setAttribute('data-adsbygoogle-status', 'done');
        });
      } catch {
        // Ignored
      }
      return args.length;
    };
    Object.defineProperty(pushMock, 'name', { value: 'push', configurable: true });
    Object.defineProperty(pushMock, 'toString', {
      value: () => STEALTH_CONFIG.DUMMY_NATIVE_TO_STRING,
      configurable: true,
    });

    Object.defineProperty(fakeAdsByGoogle, 'push', {
      value: pushMock,
      writable: true,
      configurable: true,
    });
    (fakeAdsByGoogle as unknown as { loaded?: boolean }).loaded = true;
    win.adsbygoogle = fakeAdsByGoogle;
  } catch {
    // Fail-safe
  }

  // 2. Intercept Deceptive `window.open` in Page World for ad redirects
  try {
    const originalOpen = window.open;

    const patchedOpen = function (
      url?: string | URL,
      target?: string,
      features?: string
    ): Window | null {
      const urlStr = url ? String(url) : '';

      // If heading to a known ad network or display campaign, block and return fake window proxy
      if (isAdUrl(urlStr)) {
        window.dispatchEvent(
          new CustomEvent('__padb_stealth_event', {
            detail: { type: 'popup_blocked', destination: urlStr },
          })
        );

        // Dummy proxy window object to satisfy script calling .focus() or .blur()
        const dummyWindow: Record<string, unknown> = {
          closed: false,
          focus: () => {},
          blur: () => {},
          close: () => {},
          postMessage: () => {},
        };
        return dummyWindow as unknown as Window;
      }

      return originalOpen.call(window, url, target, features);
    };

    Object.defineProperty(patchedOpen, 'name', { value: 'open', configurable: true });
    Object.defineProperty(patchedOpen, 'toString', {
      value: () => STEALTH_CONFIG.DUMMY_WINDOW_OPEN_TO_STRING,
      configurable: true,
    });

    window.open = patchedOpen as typeof window.open;
  } catch {
    // Fail-safe
  }

  // 3. Auto-Defuse Anti-Adblock DOM Warnings & Restore Download Links
  try {
    if (typeof MutationObserver !== 'undefined' && (document.documentElement || document.body)) {
      const observer = new MutationObserver(() => {
        defuseAntiAdblockElements();
      });

      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
      });
    }
  } catch {
    // Fail-safe
  }

  // 4. YouTube Instant Skip via Page-World Player Object
  if (typeof window !== 'undefined' && window.location.hostname.includes('youtube.com')) {
    const skipPageWorldAds = () => {
      try {
        const player = (document.getElementById('movie_player') ||
          document.querySelector('.html5-video-player')) as (HTMLElement & {
          skipAd?: () => void;
          cancelPlayback?: () => void;
        }) | null;

        if (player && typeof player.skipAd === 'function') {
          const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
          if (adShowing) {
            player.skipAd();
          }
        }
      } catch {
        // Fail-safe
      }
    };

    window.setInterval(skipPageWorldAds, 100);
  }
}

// Auto-execute if in browser environment
if (typeof window !== 'undefined') {
  initStealthDefuser();
}
