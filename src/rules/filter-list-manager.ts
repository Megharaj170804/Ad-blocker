import { FILTER_UPDATE_CONFIG, RULE_CONFIG } from '@/constants';
import { DeclarativeRule } from '@/types';

/**
 * Validates domain string for clean URL/rule condition handling.
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  const clean = domain.trim().toLowerCase();
  if (clean.length === 0 || clean.length > 253) return false;
  // Basic hostname regex: letters, numbers, hyphens, dots
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  // Also accept localhost or single-label development domains
  const localhostRegex = /^localhost(?::\d+)?$/i;
  return domainRegex.test(clean) || localhostRegex.test(clean);
}

/**
 * Sanitizes and normalizes user-entered domain or URL pattern
 */
export function sanitizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  // Strip protocol
  domain = domain.replace(/^https?:\/\//i, '');
  // Strip path and query
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  // Strip port
  domain = domain.split(':')[0];
  // Strip leading www.
  domain = domain.replace(/^www\./, '');
  return domain;
}

/**
 * Parses EasyList / AdBlock standard filter text into Chrome DeclarativeNetRequest rules.
 */
export function parseAdblockFilterList(
  rawContent: string,
  startId: number = RULE_CONFIG.DYNAMIC_DOWNLOAD_RULE_BASE_ID,
  maxRules: number = FILTER_UPDATE_CONFIG.DEFAULT_MAX_RULES_PARSED
): DeclarativeRule[] {
  const lines = rawContent.split(/\r?\n/);
  const rules: DeclarativeRule[] = [];
  let currentId = startId;

  for (const rawLine of lines) {
    if (rules.length >= maxRules) break;

    const line = rawLine.trim();

    // Ignore empty lines and comments
    if (!line || line.startsWith('!') || line.startsWith('[Adblock') || line.startsWith('(')) {
      continue;
    }

    // Ignore cosmetic / element hiding rules in network parser
    if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) {
      continue;
    }

    // Determine if it is an allow exception rule (starts with @@)
    const isAllow = line.startsWith('@@');
    const filterText = isAllow ? line.slice(2) : line;

    // Split options / modifiers (e.g., ||example.com^$script,third-party)
    const parts = filterText.split('$');
    const patternPart = parts[0]?.trim() || '';
    const optionsPart = parts[1]?.trim() || '';

    // Ignore complex or unsupported options for declarative safety
    if (!patternPart || patternPart.startsWith('/') && patternPart.endsWith('/')) {
      // Raw regex from filter lists can crash DNR engine if invalid, skip complex raw regex
      continue;
    }

    const resourceTypes: chrome.declarativeNetRequest.ResourceType[] = [];
    let isThirdParty: boolean | undefined = undefined;
    const domains: string[] = [];
    const excludedDomains: string[] = [];

    if (optionsPart) {
      const opts = optionsPart.split(',');
      for (const opt of opts) {
        const trimmed = opt.trim().toLowerCase();
        if (trimmed === 'script') resourceTypes.push('script' as chrome.declarativeNetRequest.ResourceType);
        else if (trimmed === 'image') resourceTypes.push('image' as chrome.declarativeNetRequest.ResourceType);
        else if (trimmed === 'xmlhttprequest' || trimmed === 'xhr') resourceTypes.push('xmlhttprequest' as chrome.declarativeNetRequest.ResourceType);
        else if (trimmed === 'subdocument') resourceTypes.push('sub_frame' as chrome.declarativeNetRequest.ResourceType);
        else if (trimmed === 'third-party') isThirdParty = true;
        else if (trimmed === '~third-party') isThirdParty = false;
        else if (trimmed.startsWith('domain=')) {
          const domList = trimmed.slice(7).split('|');
          for (const d of domList) {
            if (d.startsWith('~')) {
              excludedDomains.push(d.slice(1));
            } else {
              domains.push(d);
            }
          }
        }
      }
    }

    // Default to main resources if none specified
    const finalResourceTypes = resourceTypes.length > 0 ? resourceTypes : [
      'sub_frame' as chrome.declarativeNetRequest.ResourceType,
      'script' as chrome.declarativeNetRequest.ResourceType,
      'image' as chrome.declarativeNetRequest.ResourceType,
      'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
      'ping' as chrome.declarativeNetRequest.ResourceType,
      'media' as chrome.declarativeNetRequest.ResourceType,
      'other' as chrome.declarativeNetRequest.ResourceType,
    ];

    const rule: DeclarativeRule = {
      id: currentId++,
      priority: isAllow ? RULE_CONFIG.PRIORITY_ALLOWLIST_EXCEPTION : RULE_CONFIG.PRIORITY_NORMAL_BLOCK,
      action: {
        type: (isAllow ? 'allow' : 'block') as chrome.declarativeNetRequest.RuleActionType,
      },
      condition: {
        urlFilter: patternPart,
        resourceTypes: finalResourceTypes,
        ...(domains.length > 0 ? { domains } : {}),
        ...(excludedDomains.length > 0 ? { excludedDomains } : {}),
        ...(isThirdParty !== undefined
          ? { domainType: (isThirdParty ? 'thirdParty' : 'firstParty') as chrome.declarativeNetRequest.DomainType }
          : {}),
      },
    };

    rules.push(rule);
  }

  return rules;
}

/**
 * Downloads, validates, and parses a remote filter list with timeout and error resilience.
 */
export async function fetchAndValidateFilterList(
  url: string,
  startId: number = RULE_CONFIG.DYNAMIC_DOWNLOAD_RULE_BASE_ID,
  maxRules: number = FILTER_UPDATE_CONFIG.DEFAULT_MAX_RULES_PARSED
): Promise<{ success: boolean; rules: DeclarativeRule[]; ruleCount: number; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FILTER_UPDATE_CONFIG.FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/plain, text/x-adblock, application/octet-stream, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        rules: [],
        ruleCount: 0,
        error: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        rules: [],
        ruleCount: 0,
        error: 'Received empty response from filter list server',
      };
    }

    const parsedRules = parseAdblockFilterList(text, startId, maxRules);

    return {
      success: true,
      rules: parsedRules,
      ruleCount: parsedRules.length,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
    return {
      success: false,
      rules: [],
      ruleCount: 0,
      error: errorMsg,
    };
  }
}
