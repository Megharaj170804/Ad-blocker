import {
  ANTI_ADBLOCK_SELECTORS,
  COSMETIC_CONFIG,
  FORCE_UNHIDE_SELECTORS,
  MESSAGE_TYPES,
} from '@/constants';

// Curated high-precision selectors for ad containers and banners
export const AD_BANNER_SELECTORS: readonly string[] = [
  'ins.adsbygoogle',
  '[id^="google_ads_"]',
  '[id*="ad-slot" i]',
  '[id*="ad_container" i]',
  '[id*="gpt-ad" i]',
  '[data-ad-client]',
  '[data-ad-slot]',
  '[data-ad-unit]',
  '[data-adzone]',
  '[class*="sponsored-post" i]',
  '[class*="sponsored-content" i]',
  '[class*="ad-banner" i]',
  '[class*="ad-placement" i]',
  '[class*="ad-wrapper" i]',
  '[aria-label="advertisement" i]',
  '[aria-label="sponsored" i]',
  '.taboola-placeholder',
  '#taboola-below-article-thumbnails',
  '.outbrain-recommended',
  '.trc_related_container',
  '[class*="sticky-ad" i]',
  '[id*="sticky-ad" i]',
];

// Keywords indicating intrusive promotional overlays or anti-adblock modals
const PROMOTIONAL_MODAL_KEYWORDS: readonly string[] = [
  'newsletter',
  'subscribe to our newsletter',
  'turn off your ad blocker',
  'disable adblock',
  'ad blocker detected',
  'unlock this article',
  'special offer',
  'promo code',
  'limited time deal',
  'spin the wheel',
];

// Sensitive keywords for elements that must NEVER be hidden
const SENSITIVE_TAGS: readonly string[] = ['NAV', 'HEADER', 'MAIN', 'VIDEO', 'AUDIO'];

/**
 * Checks whether an element is critical to site operation and must NEVER be hidden.
 */
export function isProtectedElement(el: Element): boolean {
  if (SENSITIVE_TAGS.includes(el.tagName)) {
    return true;
  }

  // Never hide forms containing authentication or checkout inputs
  if (el.querySelector('input[type="password"], input[name*="password" i], input[autocomplete*="password" i]')) {
    return true;
  }

  if (el.querySelector('input[name*="card" i], input[name*="cvv" i], input[autocomplete*="cc-" i]')) {
    return true;
  }

  // Never hide navigation or shopping carts
  const role = el.getAttribute('role');
  if (role === 'navigation' || role === 'search') {
    return true;
  }

  const className = (typeof el.className === 'string' ? el.className : '').toLowerCase();
  const idName = (el.id || '').toLowerCase();

  const protectedTerms = ['checkout', 'cart', 'billing', 'auth', 'signin', 'login', 'cookie-consent'];
  for (const term of protectedTerms) {
    if (className.includes(term) || idName.includes(term)) {
      return true;
    }
  }

  return false;
}

export class CosmeticFilterEngine {
  private isRunning = false;
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private pendingReportCount = 0;
  private reportTimer: number | null = null;
  private hostname = '';

  constructor(hostname: string) {
    this.hostname = hostname;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Inject passive cosmetic style sheet for static elements
    this.injectCosmeticStyleSheet();

    // Initial DOM pass
    this.scanAndFilter();

    // Observe DOM changes with debouncing
    this.setupObserver();

    // Setup periodic reporter for hidden elements
    this.startPeriodicStatsReporter();
  }

  public stop(): void {
    this.isRunning = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.reportTimer !== null) {
      window.clearInterval(this.reportTimer);
      this.reportTimer = null;
    }

    // Flush any pending stats
    this.flushStats();

    // Remove injected style
    const styleEl = document.getElementById('padb-cosmetic-styles');
    if (styleEl) {
      styleEl.remove();
    }
  }

  private injectCosmeticStyleSheet(): void {
    if (document.getElementById('padb-cosmetic-styles')) return;

    const style = document.createElement('style');
    style.id = 'padb-cosmetic-styles';
    style.textContent = `
      ${AD_BANNER_SELECTORS.join(',\n')},
      ${ANTI_ADBLOCK_SELECTORS.join(',\n')} {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      ${FORCE_UNHIDE_SELECTORS.join(',\n')} {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  private scanAndFilter(): void {
    if (!this.isRunning) return;

    let elementsHiddenThisPass = 0;

    // 1. Scan and hide static ad containers
    try {
      const combinedSelector = AD_BANNER_SELECTORS.join(',');
      const matched = document.querySelectorAll(combinedSelector);

      let processed = 0;
      for (const el of Array.from(matched)) {
        if (processed++ > COSMETIC_CONFIG.MAX_ELEMENTS_PROCESSED_PER_PASS) break;

        if (el instanceof HTMLElement && !el.dataset.padbHidden) {
          if (!isProtectedElement(el)) {
            el.dataset.padbHidden = 'true';
            el.style.setProperty('display', 'none', 'important');
            elementsHiddenThisPass++;
          }
        }
      }

      // Hide targeted anti-adblock warning boxes
      for (const selector of ANTI_ADBLOCK_SELECTORS) {
        const warnings = document.querySelectorAll(selector);
        for (const warn of Array.from(warnings)) {
          if (warn instanceof HTMLElement && !warn.dataset.padbHidden) {
            warn.dataset.padbHidden = 'true';
            warn.style.setProperty('display', 'none', 'important');
            warn.classList.add('hide-popup');
            elementsHiddenThisPass++;
          }
        }
      }

      // Force unhide legitimate links/downloads disabled by anti-adblock
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
    } catch {
      // Safe fallback if any complex query fails
    }

    // 2. Scan and remove intrusive overlays and anti-adblock modals
    elementsHiddenThisPass += this.detectAndRemoveIntrusiveModals();

    // 3. Restore scrolling if locked by an intrusive modal
    this.restorePageScrollLock();

    if (elementsHiddenThisPass > 0) {
      this.pendingReportCount += elementsHiddenThisPass;
    }
  }

  private detectAndRemoveIntrusiveModals(): number {
    let removed = 0;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    // Target elements with fixed or absolute positioning
    const candidateNodes = document.querySelectorAll('div, section, aside');
    let inspected = 0;

    for (const node of Array.from(candidateNodes)) {
      if (inspected++ > COSMETIC_CONFIG.MAX_ELEMENTS_PROCESSED_PER_PASS) break;
      if (!(node instanceof HTMLElement)) continue;
      if (node.dataset.padbHidden) continue;

      const style = window.getComputedStyle(node);
      const position = style.position;

      if (position !== 'fixed' && position !== 'absolute') continue;

      const zIndex = parseInt(style.zIndex, 10);
      if (isNaN(zIndex) || zIndex < COSMETIC_CONFIG.MODAL_MIN_Z_INDEX) continue;

      const rect = node.getBoundingClientRect();
      const coverage = (rect.width * rect.height) / (viewWidth * viewHeight);

      if (coverage >= COSMETIC_CONFIG.OVERLAY_MIN_VIEWPORT_COVERAGE_RATIO) {
        if (isProtectedElement(node)) continue;

        const textContent = (node.textContent || '').toLowerCase();
        const hasIntrusiveKeyword = PROMOTIONAL_MODAL_KEYWORDS.some((kw) => textContent.includes(kw));

        if (hasIntrusiveKeyword) {
          node.dataset.padbHidden = 'true';
          node.style.setProperty('display', 'none', 'important');
          removed++;
        }
      }
    }

    return removed;
  }

  private restorePageScrollLock(): void {
    // If body or html has overflow set to hidden without an active legitimate dialog
    const hasOpenNativeDialog = Boolean(document.querySelector('dialog[open]'));
    if (hasOpenNativeDialog) return;

    for (const target of [document.body, document.documentElement]) {
      if (!target) continue;
      const computed = window.getComputedStyle(target);
      if (computed.overflow === 'hidden' || computed.overflowY === 'hidden') {
        target.style.setProperty('overflow', 'auto', 'important');
        target.style.setProperty('overflow-y', 'auto', 'important');
      }
    }
  }

  private setupObserver(): void {
    this.observer = new MutationObserver(() => {
      if (this.debounceTimer !== null) {
        window.clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        this.scanAndFilter();
      }, COSMETIC_CONFIG.OBSERVER_DEBOUNCE_DELAY_MS);
    });

    this.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  }

  private startPeriodicStatsReporter(): void {
    this.reportTimer = window.setInterval(() => {
      this.flushStats();
    }, COSMETIC_CONFIG.BATCH_STATS_REPORT_INTERVAL_MS);
  }

  private flushStats(): void {
    if (this.pendingReportCount <= 0) return;

    const countToSend = this.pendingReportCount;
    this.pendingReportCount = 0;

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.REPORT_COSMETIC_BLOCKED,
        hostname: this.hostname,
        count: countToSend,
      }).catch(() => {
        // Safe silence if service worker is suspended or sleeping
      });
    }
  }
}
