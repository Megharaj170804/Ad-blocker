import { isProtectedDomain, MESSAGE_TYPES } from '@/constants';
import { CosmeticFilterEngine } from '@/content/cosmetic-filter';
import { RedirectAndPopupProtector } from '@/content/redirect-popup-blocker';
import { PageStatusPayload } from '@/types';

let cosmeticEngine: CosmeticFilterEngine | null = null;
let redirectProtector: RedirectAndPopupProtector | null = null;
const currentHostname = window.location.hostname;

function applyProtection(payload: PageStatusPayload): void {
  if (isProtectedDomain(currentHostname)) {
    return;
  }
  const isProtected = payload.isGloballyEnabled && !payload.isSiteAllowlisted;

  // 1. Cosmetic Filtering Engine
  if (isProtected && payload.cosmeticEnabled) {
    if (!cosmeticEngine) {
      cosmeticEngine = new CosmeticFilterEngine(currentHostname);
      cosmeticEngine.start();
    }
  } else {
    if (cosmeticEngine) {
      cosmeticEngine.stop();
      cosmeticEngine = null;
    }
  }

  // 2. Redirect, Pop-Up, and Click Hijack Protector
  if (isProtected) {
    if (!redirectProtector) {
      redirectProtector = new RedirectAndPopupProtector(currentHostname, payload);
      redirectProtector.start();
    } else {
      redirectProtector.updateConfig(payload);
    }
  } else {
    if (redirectProtector) {
      redirectProtector.stop();
      redirectProtector = null;
    }
  }
}

async function initContentProtection(): Promise<void> {
  if (!window.location.protocol.startsWith('http')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_PAGE_STATUS,
      hostname: currentHostname,
    });

    if (response && response.payload) {
      applyProtection(response.payload);
    }
  } catch {
    // If background worker is dormant, it will wake on subsequent actions
  }
}

// Listen for live toggle updates from popup or options page
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === MESSAGE_TYPES.PAGE_STATUS_RESPONSE && message.payload) {
      applyProtection(message.payload);
    }
  });
}

// Listen for stealth defuser events dispatched from the MAIN world
if (typeof window !== 'undefined') {
  window.addEventListener('__padb_stealth_event', (event: Event) => {
    const customEvent = event as CustomEvent<{ type: string; destination?: string }>;
    if (customEvent?.detail) {
      const { type, destination } = customEvent.detail;
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        if (type === 'popup_blocked') {
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.REPORT_POPUP_BLOCKED,
            hostname: currentHostname,
            destination,
          }).catch(() => {});
        } else if (type === 'redirect_blocked') {
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.REPORT_REDIRECT_BLOCKED,
            hostname: currentHostname,
            destination,
          }).catch(() => {});
        }
        // Also increment anti-adblock defused count
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.REPORT_STEALTH_DEFUSED,
          hostname: currentHostname,
          technique: type,
        }).catch(() => {});
      }
    }
  });
}

// Initialize as soon as DOM is ready or immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initContentProtection();
  });
} else {
  initContentProtection();
}
