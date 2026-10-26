import { MESSAGE_TYPES, RULESET_IDS } from '@/constants';
import {
  getSettings,
  saveSettings,
  getStats,
  incrementStats,
  resetStats,
  isHostnameAllowlisted,
  updateFilterListStatus,
  getFilterLists,
} from '@/storage/settings';
import { syncDnrRules } from '@/rules/rule-manager';
import { fetchAndValidateFilterList } from '@/rules/filter-list-manager';
import { isKnownAdOrRedirectUrl } from '@/content/redirect-popup-blocker';
import { PageStatusPayload } from '@/types';

/**
 * Updates extension action badge for current status and blocked metrics.
 */
async function updateActionBadge(tabId?: number, hostname?: string): Promise<void> {
  try {
    const settings = await getSettings();

    if (!settings.enabled) {
      await chrome.action.setBadgeText({ text: 'OFF', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId });
      return;
    }

    if (hostname && isHostnameAllowlisted(hostname, settings)) {
      await chrome.action.setBadgeText({ text: 'PAUSE', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
      return;
    }

    const stats = await getStats();
    const siteCount = hostname && stats.siteStats[hostname]
      ? stats.siteStats[hostname].blockedRequests +
        stats.siteStats[hostname].elementsHidden +
        (stats.siteStats[hostname].redirectsBlocked ?? 0) +
        (stats.siteStats[hostname].popupsBlocked ?? 0)
      : 0;

    const badgeText = siteCount > 0 ? (siteCount > 999 ? '999+' : String(siteCount)) : 'ON';
    await chrome.action.setBadgeText({ text: badgeText, tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
  } catch {
    // Safe badge fallback
  }
}

/**
 * Broadcasts status updates to all open web tabs
 */
async function broadcastStatusUpdate(): Promise<void> {
  const settings = await getSettings();
  const stats = await getStats();

  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;

    try {
      const urlObj = new URL(tab.url);
      const hostname = urlObj.hostname;
      const isAllowlisted = isHostnameAllowlisted(hostname, settings);
      const siteStat = stats.siteStats[hostname] ?? {
        blockedRequests: 0,
        elementsHidden: 0,
        redirectsBlocked: 0,
        popupsBlocked: 0,
        antiAdblockDefused: 0,
      };

      const payload: PageStatusPayload = {
        hostname,
        isGloballyEnabled: settings.enabled,
        isSiteAllowlisted: isAllowlisted,
        cosmeticEnabled: settings.cosmeticFilteringEnabled,
        networkEnabled: settings.networkFilteringEnabled,
        trackerEnabled: settings.trackerBlockingEnabled,
        blockAdRedirects: settings.blockAdRedirects,
        blockPopups: settings.blockPopups,
        blockClickRedirects: settings.blockClickRedirects,
        blockTrackingRedirects: settings.blockTrackingRedirects,
        strictNavigation: settings.strictNavigation,
        stealthMode: settings.stealthMode,
        siteStats: siteStat,
      };

      await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.PAGE_STATUS_RESPONSE,
        payload,
      });

      await updateActionBadge(tab.id, hostname);
    } catch {
      // Tab may not have content script ready yet
    }
  }
}

// Lifecycle: Install & Update
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await syncDnrRules(settings);
  await updateActionBadge();
});

// Lifecycle: Browser Startup
chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await syncDnrRules(settings);
  await updateActionBadge();
});

// Tab navigation & activation updates
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.startsWith('http')) {
      const hostname = new URL(tab.url).hostname;
      await updateActionBadge(activeInfo.tabId, hostname);
    }
  } catch {
    // Ignored for restricted tabs (chrome://)
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (currentUrl && currentUrl.startsWith('http')) {
    try {
      const settings = await getSettings();
      if (settings.enabled && (settings.blockPopups || settings.blockAdRedirects)) {
        if (isKnownAdOrRedirectUrl(currentUrl)) {
          const urlObj = new URL(currentUrl);
          const host = urlObj.hostname;
          if (!isHostnameAllowlisted(host, settings)) {
            await incrementStats('popup', host, 1);
            if (tab.openerTabId) {
              await chrome.tabs.remove(tabId);
              return;
            }
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    const hostname = new URL(tab.url).hostname;
    await updateActionBadge(tabId, hostname);
  }
});

// Real-time blocked request listener (available with declarativeNetRequestFeedback)
if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
    try {
      const initiator = info.request.initiator;
      let hostname = '';
      if (initiator) {
        try {
          hostname = new URL(initiator).hostname;
        } catch {
          // Ignored
        }
      }

      const isTrackerList = info.rule.rulesetId === RULESET_IDS.EASYPRIVACY;
      await incrementStats(isTrackerList ? 'tracker' : 'network', hostname, 1);

      if (info.request.tabId && info.request.tabId > 0 && hostname) {
        await updateActionBadge(info.request.tabId, hostname);
      }
    } catch {
      // Ignore background counting errors
    }
  });
}

// Navigation & Tab Pop-Up Interceptor
if (chrome.webNavigation?.onCreatedNavigationTarget) {
  chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
    try {
      const settings = await getSettings();
      if (!settings.enabled || !settings.blockPopups) return;

      const targetUrl = details.url;
      if (isKnownAdOrRedirectUrl(targetUrl)) {
        await chrome.tabs.remove(details.tabId);
        await incrementStats('popup');
      }
    } catch {
      // Tab may already be closed or restricted
    }
  });
}

if (chrome.webNavigation?.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only inspect main frame navigations
    if (details.frameId !== 0) return;

    try {
      const settings = await getSettings();
      if (!settings.enabled || !settings.blockAdRedirects) return;

      const targetUrl = details.url;
      if (isKnownAdOrRedirectUrl(targetUrl)) {
        const urlObj = new URL(targetUrl);
        const host = urlObj.hostname;
        if (!isHostnameAllowlisted(host, settings)) {
          await incrementStats('redirect', host, 1);

          // Neutralize or close the tab navigating to the ad network
          try {
            const tab = await chrome.tabs.get(details.tabId);
            // If tab was spawned without navigation history or as a popup, close it
            if (!tab.openerTabId) {
              await chrome.tabs.update(details.tabId, { url: 'about:blank' });
            } else {
              await chrome.tabs.remove(details.tabId);
            }
          } catch {
            await chrome.tabs.update(details.tabId, { url: 'about:blank' });
          }
        }
      }
    } catch {
      // Ignored
    }
  });
}

// Runtime Messaging Dispatcher
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return false;

  (async () => {
    switch (message.type) {
      case MESSAGE_TYPES.GET_PAGE_STATUS: {
        const settings = await getSettings();
        const stats = await getStats();
        const hostname = message.hostname || '';
        const isAllowlisted = isHostnameAllowlisted(hostname, settings);
        const siteStat = stats.siteStats[hostname] ?? {
          blockedRequests: 0,
          elementsHidden: 0,
          redirectsBlocked: 0,
          popupsBlocked: 0,
          antiAdblockDefused: 0,
        };

        const payload: PageStatusPayload = {
          hostname,
          isGloballyEnabled: settings.enabled,
          isSiteAllowlisted: isAllowlisted,
          cosmeticEnabled: settings.cosmeticFilteringEnabled,
          networkEnabled: settings.networkFilteringEnabled,
          trackerEnabled: settings.trackerBlockingEnabled,
          blockAdRedirects: settings.blockAdRedirects,
          blockPopups: settings.blockPopups,
          blockClickRedirects: settings.blockClickRedirects,
          blockTrackingRedirects: settings.blockTrackingRedirects,
          strictNavigation: settings.strictNavigation,
          stealthMode: settings.stealthMode,
          siteStats: siteStat,
        };

        sendResponse({ payload });
        break;
      }

      case MESSAGE_TYPES.TOGGLE_GLOBAL_PROTECTION: {
        const settings = await getSettings();
        const newEnabled = typeof message.enabled === 'boolean' ? message.enabled : !settings.enabled;
        const updated = await saveSettings({ enabled: newEnabled });
        await syncDnrRules(updated);
        await broadcastStatusUpdate();
        sendResponse({ success: true, enabled: newEnabled });
        break;
      }

      case MESSAGE_TYPES.TOGGLE_SITE_ALLOWLIST: {
        const settings = await getSettings();
        const hostname = message.hostname?.trim().toLowerCase();
        if (!hostname) {
          sendResponse({ success: false, error: 'Invalid hostname' });
          return;
        }

        let updatedList: string[];
        if (message.allow) {
          updatedList = Array.from(new Set([...settings.allowlist, hostname]));
        } else {
          updatedList = settings.allowlist.filter((d) => d.toLowerCase() !== hostname);
        }

        const updated = await saveSettings({ allowlist: updatedList });
        await syncDnrRules(updated);
        await broadcastStatusUpdate();
        sendResponse({ success: true, allowlist: updatedList });
        break;
      }

      case MESSAGE_TYPES.REPORT_COSMETIC_BLOCKED: {
        const count = typeof message.count === 'number' ? message.count : 1;
        await incrementStats('cosmetic', message.hostname, count);
        sendResponse({ success: true });
        break;
      }

      case MESSAGE_TYPES.REPORT_REDIRECT_BLOCKED: {
        await incrementStats('redirect', message.hostname, 1);
        sendResponse({ success: true });
        break;
      }

      case MESSAGE_TYPES.REPORT_POPUP_BLOCKED: {
        await incrementStats('popup', message.hostname, 1);
        sendResponse({ success: true });
        break;
      }

      case MESSAGE_TYPES.REPORT_CLICK_PROTECTED: {
        await incrementStats('click', message.hostname, 1);
        sendResponse({ success: true });
        break;
      }

      case MESSAGE_TYPES.REPORT_STEALTH_DEFUSED: {
        await incrementStats('stealth', message.hostname, 1);
        sendResponse({ success: true });
        break;
      }

      case MESSAGE_TYPES.RESET_STATISTICS: {
        await resetStats();
        await updateActionBadge();
        sendResponse({ success: true });
        break;
      }

      case MESSAGE_TYPES.UPDATE_FILTER_LIST: {
        const listId = message.listId;
        const lists = await getFilterLists();
        const targetList = lists.find((l) => l.id === listId);

        if (!targetList) {
          sendResponse({ success: false, error: 'Filter list not found' });
          return;
        }

        await updateFilterListStatus(listId, { lastUpdateStatus: 'updating' });

        const downloadResult = await fetchAndValidateFilterList(targetList.url);

        if (downloadResult.success) {
          await updateFilterListStatus(listId, {
            lastUpdateStatus: 'success',
            lastUpdated: Date.now(),
            ruleCount: downloadResult.ruleCount,
            lastErrorMessage: undefined,
          });
          const settings = await getSettings();
          await syncDnrRules(settings);
          sendResponse({ success: true, ruleCount: downloadResult.ruleCount });
        } else {
          await updateFilterListStatus(listId, {
            lastUpdateStatus: 'error',
            lastErrorMessage: downloadResult.error,
          });
          sendResponse({ success: false, error: downloadResult.error });
        }
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unsupported message type' });
    }
  })();

  return true;
});
