import {
  STORAGE_KEYS,
  RULESET_IDS,
  THEMES,
  DEFAULT_FILTER_LISTS,
} from '@/constants';
import { ExtensionSettings, ExtensionStats, FilterListMetadata, SiteStats } from '@/types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  networkFilteringEnabled: true,
  cosmeticFilteringEnabled: true,
  trackerBlockingEnabled: true,
  blockAdRedirects: true,
  blockPopups: true,
  blockClickRedirects: true,
  blockTrackingRedirects: true,
  strictNavigation: false,
  stealthMode: true,
  allowlist: [],
  customRules: [],
  enabledLists: [
    RULESET_IDS.EASYLIST,
    RULESET_IDS.EASYPRIVACY,
    RULESET_IDS.ANNOYANCES,
  ],
  theme: THEMES.SYSTEM,
};

export const DEFAULT_STATS: ExtensionStats = {
  totalBlockedRequests: 0,
  sessionBlockedRequests: 0,
  trackersBlocked: 0,
  cosmeticElementsHidden: 0,
  redirectsBlocked: 0,
  popupsBlocked: 0,
  clicksProtected: 0,
  antiAdblockDefused: 0,
  siteStats: {},
};

export const INITIAL_FILTER_LISTS_METADATA: FilterListMetadata[] = DEFAULT_FILTER_LISTS.map((list) => ({
  id: list.id,
  name: list.name,
  description: list.description,
  url: list.url,
  category: list.category,
  enabled: list.enabled,
  ruleCount: 0,
  lastUpdated: null,
  lastUpdateStatus: 'idle',
}));

// In-memory fallback cache for Node test environments or fallback
let memoryStorage: Record<string, unknown> = {};

function isChromeStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  if (isChromeStorageAvailable()) {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as T) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return (memoryStorage[key] as T) ?? defaultValue;
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  if (isChromeStorageAvailable()) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch {
      // Chrome storage quota or disconnect fallback
      memoryStorage[key] = value;
    }
    return;
  }
  memoryStorage[key] = value;
}

export async function getSettings(): Promise<ExtensionSettings> {
  const settings = await getStorageItem<ExtensionSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated: ExtensionSettings = { ...current, ...partial };
  await setStorageItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

export async function getStats(): Promise<ExtensionStats> {
  const stats = await getStorageItem<ExtensionStats>(STORAGE_KEYS.STATS, DEFAULT_STATS);
  return { ...DEFAULT_STATS, ...stats, siteStats: stats.siteStats ?? {} };
}

export async function saveStats(partial: Partial<ExtensionStats>): Promise<ExtensionStats> {
  const current = await getStats();
  const updated: ExtensionStats = { ...current, ...partial };
  await setStorageItem(STORAGE_KEYS.STATS, updated);
  return updated;
}

export async function resetStats(): Promise<void> {
  await setStorageItem(STORAGE_KEYS.STATS, DEFAULT_STATS);
}

export async function incrementStats(
  category: 'network' | 'tracker' | 'cosmetic' | 'redirect' | 'popup' | 'click' | 'stealth',
  hostname?: string,
  count: number = 1
): Promise<void> {
  const stats = await getStats();
  const normalizedHost = hostname?.trim().toLowerCase();

  const siteStats = { ...stats.siteStats };
  if (normalizedHost) {
    const existing: SiteStats = siteStats[normalizedHost] ?? {
      blockedRequests: 0,
      elementsHidden: 0,
      redirectsBlocked: 0,
      popupsBlocked: 0,
      antiAdblockDefused: 0,
    };
    siteStats[normalizedHost] = {
      blockedRequests:
        category === 'cosmetic'
          ? existing.blockedRequests
          : existing.blockedRequests + count,
      elementsHidden:
        category === 'cosmetic'
          ? existing.elementsHidden + count
          : existing.elementsHidden,
      redirectsBlocked:
        category === 'redirect'
          ? (existing.redirectsBlocked ?? 0) + count
          : existing.redirectsBlocked ?? 0,
      popupsBlocked:
        category === 'popup'
          ? (existing.popupsBlocked ?? 0) + count
          : existing.popupsBlocked ?? 0,
      antiAdblockDefused:
        category === 'stealth'
          ? (existing.antiAdblockDefused ?? 0) + count
          : existing.antiAdblockDefused ?? 0,
    };
  }

  const isNetworkBlock = category === 'network' || category === 'tracker' || category === 'redirect';

  const updated: ExtensionStats = {
    totalBlockedRequests: isNetworkBlock ? stats.totalBlockedRequests + count : stats.totalBlockedRequests,
    sessionBlockedRequests: isNetworkBlock ? stats.sessionBlockedRequests + count : stats.sessionBlockedRequests,
    trackersBlocked: category === 'tracker' ? stats.trackersBlocked + count : stats.trackersBlocked,
    cosmeticElementsHidden: category === 'cosmetic' ? stats.cosmeticElementsHidden + count : stats.cosmeticElementsHidden,
    redirectsBlocked: category === 'redirect' ? stats.redirectsBlocked + count : stats.redirectsBlocked,
    popupsBlocked: category === 'popup' ? stats.popupsBlocked + count : stats.popupsBlocked,
    clicksProtected: category === 'click' ? stats.clicksProtected + count : stats.clicksProtected,
    antiAdblockDefused: category === 'stealth' ? stats.antiAdblockDefused + count : stats.antiAdblockDefused,
    siteStats,
  };

  await setStorageItem(STORAGE_KEYS.STATS, updated);
}

export async function getFilterLists(): Promise<FilterListMetadata[]> {
  const lists = await getStorageItem<FilterListMetadata[]>(STORAGE_KEYS.RULE_STATUS, INITIAL_FILTER_LISTS_METADATA);
  return lists;
}

export async function saveFilterLists(lists: FilterListMetadata[]): Promise<void> {
  await setStorageItem(STORAGE_KEYS.RULE_STATUS, lists);
}

export async function updateFilterListStatus(
  id: string,
  update: Partial<FilterListMetadata>
): Promise<void> {
  const currentLists = await getFilterLists();
  const updatedLists = currentLists.map((list) => {
    if (list.id === id) {
      return { ...list, ...update };
    }
    return list;
  });
  await saveFilterLists(updatedLists);
}

export function isHostnameAllowlisted(hostname: string, settings: ExtensionSettings): boolean {
  if (!hostname || !settings.allowlist || settings.allowlist.length === 0) {
    return false;
  }
  const cleanHost = hostname.trim().toLowerCase().replace(/^www\./, '');
  return settings.allowlist.some((domain) => {
    const cleanDomain = domain.trim().toLowerCase().replace(/^www\./, '');
    return cleanHost === cleanDomain || cleanHost.endsWith(`.${cleanDomain}`);
  });
}

// For unit testing only: reset in-memory storage
export function _resetMemoryStorage(): void {
  memoryStorage = {};
}
