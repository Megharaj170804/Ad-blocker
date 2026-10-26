import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  saveSettings,
  getStats,
  incrementStats,
  resetStats,
  _resetMemoryStorage,
  DEFAULT_SETTINGS,
} from '@/storage/settings';

describe('Storage & Statistics Engine', () => {
  beforeEach(() => {
    _resetMemoryStorage();
  });

  it('retrieves default settings when no storage exists', async () => {
    const settings = await getSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.networkFilteringEnabled).toBe(true);
    expect(settings.cosmeticFilteringEnabled).toBe(true);
    expect(settings.trackerBlockingEnabled).toBe(true);
    expect(settings.allowlist).toEqual([]);
  });

  it('persists partial updates to settings', async () => {
    await saveSettings({ enabled: false, allowlist: ['news.com'] });
    const updated = await getSettings();

    expect(updated.enabled).toBe(false);
    expect(updated.allowlist).toEqual(['news.com']);
    // Unmodified settings should retain defaults
    expect(updated.networkFilteringEnabled).toBe(DEFAULT_SETTINGS.networkFilteringEnabled);
  });

  it('increments stats correctly for network, tracker, and cosmetic categories', async () => {
    // 1. Increment network request
    await incrementStats('network', 'example.com', 2);
    let stats = await getStats();
    expect(stats.totalBlockedRequests).toBe(2);
    expect(stats.sessionBlockedRequests).toBe(2);
    expect(stats.siteStats['example.com']?.blockedRequests).toBe(2);
    expect(stats.siteStats['example.com']?.elementsHidden).toBe(0);

    // 2. Increment cosmetic elements
    await incrementStats('cosmetic', 'example.com', 5);
    stats = await getStats();
    expect(stats.cosmeticElementsHidden).toBe(5);
    // Total network requests shouldn't change when cosmetic increments
    expect(stats.totalBlockedRequests).toBe(2);
    expect(stats.siteStats['example.com']?.elementsHidden).toBe(5);

    // 3. Increment tracker
    await incrementStats('tracker', 'analytics.net', 3);
    stats = await getStats();
    expect(stats.trackersBlocked).toBe(3);
    expect(stats.totalBlockedRequests).toBe(5); // 2 + 3
    expect(stats.siteStats['analytics.net']?.blockedRequests).toBe(3);
  });

  it('resets all statistics to initial zero counts', async () => {
    await incrementStats('network', 'site.com', 10);
    await incrementStats('cosmetic', 'site.com', 15);

    await resetStats();
    const stats = await getStats();

    expect(stats.totalBlockedRequests).toBe(0);
    expect(stats.sessionBlockedRequests).toBe(0);
    expect(stats.trackersBlocked).toBe(0);
    expect(stats.cosmeticElementsHidden).toBe(0);
    expect(stats.siteStats).toEqual({});
  });
});
