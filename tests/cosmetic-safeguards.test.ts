import { describe, it, expect } from 'vitest';
import { isProtectedElement, AD_BANNER_SELECTORS } from '@/content/cosmetic-filter';

describe('Cosmetic Filtering Safety Safeguards', () => {
  it('protects login forms and authentication dialogs from being hidden', () => {
    const loginForm = document.createElement('form');
    loginForm.className = 'ad-container'; // Deceptive ad-like class name
    const passInput = document.createElement('input');
    passInput.type = 'password';
    loginForm.appendChild(passInput);

    expect(isProtectedElement(loginForm)).toBe(true);
  });

  it('protects checkout, payment, and cart elements from being hidden', () => {
    const checkoutDiv = document.createElement('div');
    checkoutDiv.className = 'checkout-button-container sponsored-ad';
    expect(isProtectedElement(checkoutDiv)).toBe(true);

    const cartContainer = document.createElement('div');
    cartContainer.id = 'shopping-cart-drawer';
    expect(isProtectedElement(cartContainer)).toBe(true);
  });

  it('protects structural semantic navigation and video elements', () => {
    const nav = document.createElement('nav');
    nav.className = 'ad-placement';
    expect(isProtectedElement(nav)).toBe(true);

    const video = document.createElement('video');
    expect(isProtectedElement(video)).toBe(true);

    const header = document.createElement('header');
    expect(isProtectedElement(header)).toBe(true);
  });

  it('allows safe ad elements to be hidden', () => {
    const adBanner = document.createElement('div');
    adBanner.className = 'sponsored-content ad-banner';
    expect(isProtectedElement(adBanner)).toBe(false);

    const googleAd = document.createElement('ins');
    googleAd.className = 'adsbygoogle';
    expect(isProtectedElement(googleAd)).toBe(false);

    const taboolaAd = document.createElement('div');
    taboolaAd.className = 'taboola-placeholder';
    expect(isProtectedElement(taboolaAd)).toBe(false);
  });

  it('provides a valid list of ad banner selectors without syntax errors', () => {
    expect(AD_BANNER_SELECTORS.length).toBeGreaterThan(10);
    for (const selector of AD_BANNER_SELECTORS) {
      expect(() => document.querySelectorAll(selector)).not.toThrow();
    }
  });
});
