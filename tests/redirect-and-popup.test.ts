import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isKnownAdOrRedirectUrl,
  RedirectAndPopupProtector,
} from '@/content/redirect-popup-blocker';
import { PageStatusPayload } from '@/types';

describe('Redirect, Pop-Up, and Click Protection Engine', () => {
  const dummyPayload: PageStatusPayload = {
    hostname: 'example.com',
    isGloballyEnabled: true,
    isSiteAllowlisted: false,
    cosmeticEnabled: true,
    networkEnabled: true,
    trackerEnabled: true,
    blockAdRedirects: true,
    blockPopups: true,
    blockClickRedirects: true,
    blockTrackingRedirects: true,
    strictNavigation: false,
    stealthMode: true,
    siteStats: { blockedRequests: 0, elementsHidden: 0 },
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock window dimensions
    window.innerWidth = 1000;
    window.innerHeight = 800;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accurately identifies known ad networks, redirect domains, and ad campaign URLs', () => {
    expect(isKnownAdOrRedirectUrl('https://popads.net/serve?id=123')).toBe(true);
    expect(isKnownAdOrRedirectUrl('http://adsterra.com/direct')).toBe(true);
    expect(isKnownAdOrRedirectUrl('https://syndication.exoclick.com/splash')).toBe(true);
    expect(isKnownAdOrRedirectUrl('https://linkvertise.com/download')).toBe(true);
    expect(isKnownAdOrRedirectUrl('https://vr.cissoiddownset.com/ad/script')).toBe(true);
    expect(
      isKnownAdOrRedirectUrl(
        'https://www.naidunia.com/business/article?utm_source=referral&utm_medium=display&utm_campaign=life_spiritual_buss'
      )
    ).toBe(true);
    expect(isKnownAdOrRedirectUrl('https://partner.com/deal?aff_id=98765')).toBe(true);
    expect(isKnownAdOrRedirectUrl('https://tracker.com/click?clickid=xyz123')).toBe(true);

    expect(isKnownAdOrRedirectUrl('https://google.com/search')).toBe(false);
    expect(isKnownAdOrRedirectUrl('https://wikipedia.org/wiki/Main_Page')).toBe(false);
    expect(isKnownAdOrRedirectUrl('/account/settings')).toBe(false);
    expect(isKnownAdOrRedirectUrl('#section-2')).toBe(false);
  });

  it('neutralizes invisible clickjacking overlays while protecting legitimate dialogs', () => {
    // 1. Invisible clickjacking overlay covering screen
    const clickjackOverlay = document.createElement('div');
    clickjackOverlay.style.position = 'fixed';
    clickjackOverlay.style.zIndex = '10000';
    clickjackOverlay.style.opacity = '0';
    // Mock getBoundingClientRect
    vi.spyOn(clickjackOverlay, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    document.body.appendChild(clickjackOverlay);

    // 2. Legitimate login modal
    const loginDialog = document.createElement('div');
    loginDialog.style.position = 'fixed';
    loginDialog.style.zIndex = '10000';
    loginDialog.className = 'auth-modal';
    const pwd = document.createElement('input');
    pwd.type = 'password';
    loginDialog.appendChild(pwd);
    document.body.appendChild(loginDialog);

    const protector = new RedirectAndPopupProtector('example.com', dummyPayload);
    const neutralized = protector.neutralizeInvisibleOverlays();

    expect(neutralized).toBe(1);
    expect(clickjackOverlay.dataset.padbClickNeutralized).toBe('true');
    expect(clickjackOverlay.style.pointerEvents).toBe('none');

    // Login modal must remain active and protected
    expect(loginDialog.dataset.padbClickNeutralized).toBeUndefined();
    expect(loginDialog.style.pointerEvents).not.toBe('none');
  });

  it('intercepts and blocks unauthorized window.open ad popups', () => {
    const protector = new RedirectAndPopupProtector('example.com', dummyPayload);
    protector.start();

    // 1. Direct call to known ad network (should be blocked and return null)
    const resultAd = window.open('https://popads.net/serve');
    expect(resultAd).toBeNull();

    // 2. Pop-up without user gesture
    const resultUnprompted = window.open('https://unknown-pop.com');
    expect(resultUnprompted).toBeNull();

    protector.stop();
  });

  it('disarms deceptive meta refresh redirects pointing to ad networks', () => {
    const metaRefresh = document.createElement('meta');
    metaRefresh.setAttribute('http-equiv', 'refresh');
    metaRefresh.setAttribute('content', '0;url=https://propellerads.com/zone?id=55');
    document.head.appendChild(metaRefresh);

    const protector = new RedirectAndPopupProtector('example.com', dummyPayload);
    protector.neutralizeMetaRefresh();

    expect(document.querySelector('meta[http-equiv="refresh"]')).toBeNull();
  });

  it('prevents click navigation on hijacked links pointing to ad networks', () => {
    const protector = new RedirectAndPopupProtector('example.com', dummyPayload);
    protector.start();

    // 1. Hijacked Ad link
    const adLink = document.createElement('a');
    adLink.href = 'https://adsterra.com/click';
    document.body.appendChild(adLink);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    adLink.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);

    // 2. Legitimate link
    const normalLink = document.createElement('a');
    normalLink.href = '#dashboard';
    document.body.appendChild(normalLink);

    const normalEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    normalLink.dispatchEvent(normalEvent);

    expect(normalEvent.defaultPrevented).toBe(false);

    protector.stop();
  });
});
