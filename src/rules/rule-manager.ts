import { RULE_CONFIG, RULESET_IDS } from '@/constants';
import { ExtensionSettings, DeclarativeRule } from '@/types';
import { sanitizeDomain } from '@/rules/filter-list-manager';

function isChromeDnrAvailable(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.declarativeNetRequest);
}

/**
 * Builds declarative rules for allowlisted domains.
 * Allowlist rules have highest priority so they supersede all block rules.
 */
export function buildAllowlistRules(allowlist: string[]): DeclarativeRule[] {
  return allowlist.map((domain, index) => {
    const cleanDomain = sanitizeDomain(domain);
    return {
      id: RULE_CONFIG.ALLOWLIST_RULE_BASE_ID + index,
      priority: RULE_CONFIG.PRIORITY_ALLOWLIST_EXCEPTION,
      action: {
        type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType,
      },
      condition: {
        initiatorDomains: [cleanDomain],
        resourceTypes: [
          'main_frame' as chrome.declarativeNetRequest.ResourceType,
          'sub_frame' as chrome.declarativeNetRequest.ResourceType,
        ],
      },
    };
  });
}

/**
 * Builds declarative rules from user-defined custom block/allow rules.
 */
export function buildCustomRules(customRules: ExtensionSettings['customRules']): DeclarativeRule[] {
  return customRules
    .filter((r) => r.enabled)
    .map((rule, index) => {
      const isAllow = rule.action === 'allow';
      const cleanPattern = rule.pattern.trim();

      // If user typed a plain domain like "ads.example.com", format it with domain anchors
      const formattedFilter = cleanPattern.includes('/') || cleanPattern.includes('*') || cleanPattern.includes('^')
        ? cleanPattern
        : `||${cleanPattern}^`;

      return {
        id: RULE_CONFIG.CUSTOM_BLOCK_RULE_BASE_ID + index,
        priority: isAllow ? RULE_CONFIG.PRIORITY_ALLOWLIST_EXCEPTION : RULE_CONFIG.PRIORITY_CUSTOM_BLOCK,
        action: {
          type: (isAllow ? 'allow' : 'block') as chrome.declarativeNetRequest.RuleActionType,
        },
        condition: {
          urlFilter: formattedFilter,
          resourceTypes: [
            'sub_frame' as chrome.declarativeNetRequest.ResourceType,
            'script' as chrome.declarativeNetRequest.ResourceType,
            'image' as chrome.declarativeNetRequest.ResourceType,
            'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
            'ping' as chrome.declarativeNetRequest.ResourceType,
            'media' as chrome.declarativeNetRequest.ResourceType,
            'other' as chrome.declarativeNetRequest.ResourceType,
          ],
        },
      };
    });
}

/**
 * Synchronizes static rulesets and dynamic rules based on active extension settings.
 */
export async function syncDnrRules(settings: ExtensionSettings): Promise<void> {
  if (!isChromeDnrAvailable()) {
    return;
  }

  try {
    const isProtectionActive = settings.enabled && settings.networkFilteringEnabled;

    // 1. Manage Static Rulesets
    const allRulesets = [
      RULESET_IDS.EASYLIST,
      RULESET_IDS.EASYPRIVACY,
      RULESET_IDS.ANNOYANCES,
    ];

    if (!isProtectionActive) {
      // Disable all static rulesets if master toggle or network toggle is OFF
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: allRulesets,
      });
    } else {
      const enableRulesets: string[] = [];
      const disableRulesets: string[] = [];

      for (const rulesetId of allRulesets) {
        // Tracker list check
        if (rulesetId === RULESET_IDS.EASYPRIVACY && !settings.trackerBlockingEnabled) {
          disableRulesets.push(rulesetId);
          continue;
        }

        if (settings.enabledLists.includes(rulesetId)) {
          enableRulesets.push(rulesetId);
        } else {
          disableRulesets.push(rulesetId);
        }
      }

      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: enableRulesets,
        disableRulesetIds: disableRulesets,
      });
    }

    // 2. Manage Dynamic Rules (Allowlist + Custom Rules)
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((r) => r.id);

    if (!isProtectionActive) {
      // Remove all dynamic rules if protection is turned off
      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds,
        });
      }
      return;
    }

    const allowlistRules = buildAllowlistRules(settings.allowlist);
    const customRules = buildCustomRules(settings.customRules);

    const newRules = [...allowlistRules, ...customRules].slice(0, RULE_CONFIG.MAX_DYNAMIC_RULES);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules as chrome.declarativeNetRequest.Rule[],
    });
  } catch (err) {
    // Graceful handling of DNR updates
    const errorMessage = err instanceof Error ? err.message : 'Unknown DNR error';
    throw new Error(`Failed to update declarative blocking rules: ${errorMessage}`);
  }
}

/**
 * Checks a test URL against active allowlist and custom rules for interactive testing.
 */
export function simulateRuleMatch(
  url: string,
  settings: ExtensionSettings
): { matched: boolean; ruleType?: 'allowlist' | 'custom_block' | 'custom_allow'; pattern?: string } {
  if (!settings.enabled || !settings.networkFilteringEnabled) {
    return { matched: false };
  }

  // 1. Check allowlist
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = sanitizeDomain(parsed.hostname);
    const isAllowed = settings.allowlist.some((domain) => {
      const clean = sanitizeDomain(domain);
      return host === clean || host.endsWith(`.${clean}`);
    });

    if (isAllowed) {
      return { matched: true, ruleType: 'allowlist', pattern: host };
    }
  } catch {
    // If not a full URL, fallback string check
  }

  // 2. Check custom rules
  for (const rule of settings.customRules) {
    if (!rule.enabled) continue;
    const pat = rule.pattern.toLowerCase();
    if (url.toLowerCase().includes(pat)) {
      return {
        matched: true,
        ruleType: rule.action === 'allow' ? 'custom_allow' : 'custom_block',
        pattern: rule.pattern,
      };
    }
  }

  return { matched: false };
}
