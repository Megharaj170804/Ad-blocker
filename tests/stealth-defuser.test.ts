import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initStealthDefuser } from '@/stealth/stealth-defuser';
import { STEALTH_CONFIG } from '@/constants';

describe('Stealth Mode & Anti-Adblock Defuser', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset stealth flag if present
    delete (window as unknown as { __padb_stealth_initialized?: boolean }).__padb_stealth_initialized;
    initStealthDefuser();
  });

  it('spoofs standard anti-adblock variables in the global window context', () => {
    const win = window as unknown as Record<string, unknown>;

    expect(win.canRunAds).toBe(true);
    expect(win.isAdBlockActive).toBe(false);
    expect(win.adblock).toBe(false);
    expect(win.adBlockerDetected).toBe(false);
    expect(win.google_ad_client).toBe(STEALTH_CONFIG.SPOOFED_CLIENT_ID);
    expect(Array.isArray(win.adsbygoogle)).toBe(true);
    expect((win.adsbygoogle as { loaded?: boolean }).loaded).toBe(true);
  });

  it('provides a functioning adsbygoogle.push mock that completes without error', () => {
    const win = window as unknown as Record<string, unknown>;
    const adsbygoogle = win.adsbygoogle as { push: Function };

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    document.body.appendChild(ins);

    expect(() => adsbygoogle.push({})).not.toThrow();
    expect(ins.getAttribute('data-adsbygoogle-status')).toBe('done');
  });

  it('camouflages window.open.toString() as a native function', () => {
    expect(window.open.toString()).toBe(STEALTH_CONFIG.DUMMY_WINDOW_OPEN_TO_STRING);
  });

  it('defuses bait element honeypots by returning mock offsetHeight', () => {
    const baitElement = document.createElement('div');
    baitElement.className = 'adsbox pub_300x250';
    document.body.appendChild(baitElement);

    // In JSDOM, default offsetHeight is 0, but our stealth defuser hooks it for bait elements
    expect(baitElement.offsetHeight).toBe(250);
  });

  it('silently blocks ad window.open calls and returns a compatible Window proxy', () => {
    const eventSpy = vi.fn();
    window.addEventListener('__padb_stealth_event', eventSpy);

    const proxyWin = window.open('https://popads.net/serve');

    expect(eventSpy).toHaveBeenCalled();
    expect(proxyWin).not.toBeNull();
    // Verify dummy window has callable methods so script doesn't crash
    if (proxyWin) {
      expect(typeof proxyWin.focus).toBe('function');
      expect(typeof proxyWin.close).toBe('function');
      expect(proxyWin.closed).toBe(false);
    }
  });

  it('blocks window.open for sponsored display ad campaigns with tracking params', () => {
    const eventSpy = vi.fn();
    window.addEventListener('__padb_stealth_event', eventSpy);

    const proxyWin = window.open(
      'https://www.naidunia.com/business/article?utm_source=referral&utm_medium=display&utm_campaign=life_spiritual_buss'
    );

    expect(eventSpy).toHaveBeenCalled();
    expect(proxyWin).not.toBeNull();
  });

  it('intercepts synthetic anchor .click() triggers to ad networks', () => {
    const eventSpy = vi.fn();
    window.addEventListener('__padb_stealth_event', eventSpy);

    const anchor = document.createElement('a');
    anchor.href = 'https://adsterra.com/landing';
    document.body.appendChild(anchor);

    anchor.click();

    expect(eventSpy).toHaveBeenCalled();
  });

  it('defuses .warn-box anti-adblock element and forces display of download links', () => {
    const warnBox = document.createElement('div');
    warnBox.className = 'warn-box';
    warnBox.textContent = '⚠️ Download Links Disabled! Please support our website by disabling AdBlock';

    const downloadLinks = document.createElement('div');
    downloadLinks.className = 'download-links-div';
    downloadLinks.textContent = 'Download Movie HD 1080p';

    document.body.appendChild(warnBox);
    document.body.appendChild(downloadLinks);

    // Re-run defusal check on DOM
    initStealthDefuser();

    expect(warnBox.classList.contains('hide-popup')).toBe(true);
    expect(downloadLinks.style.display).toBe('block');
  });

  it('mocks fetch for anti-adblock ad script bait while passing through benchmark tests', async () => {
    // 1. Bait script check on streaming sites
    const baitRes = await window.fetch('https://vr.cissoiddownset.com/service.js');
    expect(baitRes.status).toBe(200);
    const baitText = await baitRes.text();
    expect(baitText).toContain('ads_loaded');
  });
});
