import {
  AD_CAMPAIGN_PARAM_PATTERNS,
  COSMETIC_CONFIG,
  KNOWN_REDIRECT_AND_POPUP_DOMAINS,
  MESSAGE_TYPES,
} from '@/constants';
import { PageStatusPayload } from '@/types';
import { isProtectedElement } from '@/content/cosmetic-filter';

/**
 * Checks if a URL or destination hostname belongs to known advertising or redirect networks.
 */
export function isKnownAdOrRedirectUrl(targetUrl: string): boolean {
  if (!targetUrl || typeof targetUrl !== 'string') return false;
  const clean = targetUrl.trim().toLowerCase();

  // Ignore safe local/hash navigation
  if (clean.startsWith('#') || clean.startsWith('javascript:void') || clean === 'about:blank') {
    return false;
  }

  // Check known ad campaign tracking parameters (e.g. utm_medium=display, aff_id, clickid)
  if (AD_CAMPAIGN_PARAM_PATTERNS.some((pattern) => pattern.test(clean))) {
    return true;
  }

  try {
    const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    const host = parsed.hostname.replace(/^www\./, '');
    return KNOWN_REDIRECT_AND_POPUP_DOMAINS.some((adDomain) => host === adDomain || host.endsWith(`.${adDomain}`));
  } catch {
    return KNOWN_REDIRECT_AND_POPUP_DOMAINS.some((adDomain) => clean.includes(adDomain));
  }
}

export class RedirectAndPopupProtector {
  private isRunning = false;
  private currentHostname: string;
  private config: PageStatusPayload;
  private originalWindowOpen: typeof window.open | null = null;
  private recentUserGestureTime = 0;
  private popupsTriggeredInGesture = 0;

  constructor(hostname: string, config: PageStatusPayload) {
    this.currentHostname = hostname.toLowerCase().replace(/^www\./, '');
    this.config = config;
  }

  public updateConfig(newConfig: PageStatusPayload): void {
    this.config = newConfig;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.config.blockPopups) {
      this.interceptWindowOpen();
    }

    if (this.config.blockClickRedirects) {
      this.attachClickProtections();
      this.neutralizeInvisibleOverlays();
    }

    if (this.config.blockAdRedirects) {
      this.neutralizeMetaRefresh();
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.restoreWindowOpen();
    this.detachClickProtections();
  }

  /**
   * Neutralizes invisible clickjacking overlays that intercept clicks across the entire screen.
   */
  public neutralizeInvisibleOverlays(): number {
    let neutralizedCount = 0;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const elements = document.querySelectorAll('div, a, span, section');
    for (const el of Array.from(elements)) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.dataset.padbClickNeutralized) continue;

      const style = window.getComputedStyle(el);
      const position = style.position;
      if (position !== 'fixed' && position !== 'absolute') continue;

      const zIndex = parseInt(style.zIndex, 10);
      if (isNaN(zIndex) || zIndex < COSMETIC_CONFIG.CLICKJACK_HIGH_Z_INDEX) continue;

      const rect = el.getBoundingClientRect();
      const coverage = (rect.width * rect.height) / (viewWidth * viewHeight);

      if (coverage >= COSMETIC_CONFIG.CLICKJACK_OVERLAY_MIN_COVERAGE_RATIO) {
        const opacity = parseFloat(style.opacity);
        const isTransparent = isNaN(opacity) || opacity <= COSMETIC_CONFIG.CLICKJACK_MAX_OPACITY;

        if (isTransparent && !isProtectedElement(el)) {
          el.dataset.padbClickNeutralized = 'true';
          el.style.setProperty('pointer-events', 'none', 'important');
          el.style.setProperty('display', 'none', 'important');
          neutralizedCount++;
          this.reportProtectedEvent(MESSAGE_TYPES.REPORT_CLICK_PROTECTED);
        }
      }
    }

    return neutralizedCount;
  }

  /**
   * Scans and disarms deceptive meta refresh redirects
   */
  public neutralizeMetaRefresh(): void {
    const metaTags = document.querySelectorAll('meta[http-equiv="refresh" i]');
    for (const meta of Array.from(metaTags)) {
      const content = meta.getAttribute('content') || '';
      const match = content.match(/url=(.+)/i);
      if (match && match[1]) {
        const targetUrl = match[1].trim();
        if (isKnownAdOrRedirectUrl(targetUrl)) {
          meta.remove();
          this.reportProtectedEvent(MESSAGE_TYPES.REPORT_REDIRECT_BLOCKED, targetUrl);
        }
      }
    }
  }

  /**
   * Intercepts `window.open` calls to prevent ad pop-ups and pop-unders
   */
  private interceptWindowOpen(): void {
    if (this.originalWindowOpen) return;

    this.originalWindowOpen = window.open;
    const self = this;

    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string
    ): Window | null {
      const targetStr = url ? String(url) : '';
      const now = Date.now();
      const hasRecentGesture = now - self.recentUserGestureTime < COSMETIC_CONFIG.POPUP_GESTURE_EXPIRY_MS;

      // 1. Block if destination matches known advertising/redirect networks
      if (isKnownAdOrRedirectUrl(targetStr)) {
        self.reportProtectedEvent(MESSAGE_TYPES.REPORT_POPUP_BLOCKED, targetStr);
        return null;
      }

      // 2. Block if triggered without any recent user gesture (automatic pop-up)
      if (!hasRecentGesture) {
        self.reportProtectedEvent(MESSAGE_TYPES.REPORT_POPUP_BLOCKED, targetStr || 'blank_without_gesture');
        return null;
      }

      // 3. Rate-limit popups per gesture (prevent multiple popups on a single click)
      if (self.popupsTriggeredInGesture >= COSMETIC_CONFIG.MAX_ALLOWED_POPUPS_PER_GESTURE) {
        self.reportProtectedEvent(MESSAGE_TYPES.REPORT_POPUP_BLOCKED, targetStr);
        return null;
      }

      // 4. Strict navigation check: block third-party origin popups
      if (self.config.strictNavigation && targetStr && targetStr.startsWith('http')) {
        try {
          const destHost = new URL(targetStr).hostname.replace(/^www\./, '');
          if (destHost !== self.currentHostname && !self.config.isSiteAllowlisted) {
            self.reportProtectedEvent(MESSAGE_TYPES.REPORT_POPUP_BLOCKED, targetStr);
            return null;
          }
        } catch {
          // Ignored
        }
      }

      self.popupsTriggeredInGesture++;
      if (self.originalWindowOpen) {
        return self.originalWindowOpen.call(window, url, target, features);
      }
      return null;
    };
  }

  private restoreWindowOpen(): void {
    if (this.originalWindowOpen) {
      window.open = this.originalWindowOpen;
      this.originalWindowOpen = null;
    }
  }

  private handleClickCapture = (event: MouseEvent): void => {
    this.recentUserGestureTime = Date.now();
    this.popupsTriggeredInGesture = 0;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Find if the click originated inside an anchor tag
    const anchor = target.closest('a');
    if (!anchor) return;

    // Never block legitimate login, payment, or authentication links
    if (isProtectedElement(anchor)) return;

    const href = anchor.getAttribute('href') || '';
    if (!href) return;

    // 1. Check known ad/redirect domain
    if (isKnownAdOrRedirectUrl(href)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.reportProtectedEvent(MESSAGE_TYPES.REPORT_REDIRECT_BLOCKED, href);
      return;
    }

    // 2. Strict Navigation: Block cross-domain links that open in a new tab if strictly untrusted
    if (this.config.strictNavigation && anchor.target === '_blank' && href.startsWith('http')) {
      try {
        const destHost = new URL(href).hostname.replace(/^www\./, '');
        if (destHost !== this.currentHostname && !this.config.isSiteAllowlisted) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.reportProtectedEvent(MESSAGE_TYPES.REPORT_REDIRECT_BLOCKED, href);
        }
      } catch {
        // Ignored
      }
    }
  };

  private attachClickProtections(): void {
    document.addEventListener('click', this.handleClickCapture, true);
    document.addEventListener('auxclick', this.handleClickCapture, true);
  }

  private detachClickProtections(): void {
    document.removeEventListener('click', this.handleClickCapture, true);
    document.removeEventListener('auxclick', this.handleClickCapture, true);
  }

  private reportProtectedEvent(type: string, destination?: string): void {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type,
        hostname: this.currentHostname,
        destination,
      }).catch(() => {
        // Service worker sleeping
      });
    }
  }
}
