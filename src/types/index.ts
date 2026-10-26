import { MESSAGE_TYPES, THEMES } from '@/constants';

export type ThemeMode = typeof THEMES[keyof typeof THEMES];

export interface CustomRule {
  id: string;
  pattern: string; // e.g. "ads.example.com", "*tracking*"
  action: 'block' | 'allow';
  enabled: boolean;
  createdAt: number;
}

export interface FilterListMetadata {
  id: string;
  name: string;
  description: string;
  url: string;
  category: 'ads' | 'privacy' | 'annoyances';
  enabled: boolean;
  ruleCount: number;
  lastUpdated: number | null;
  lastUpdateStatus: 'idle' | 'updating' | 'success' | 'error';
  lastErrorMessage?: string;
}

export interface ExtensionSettings {
  enabled: boolean;
  networkFilteringEnabled: boolean;
  cosmeticFilteringEnabled: boolean;
  trackerBlockingEnabled: boolean;
  blockAdRedirects: boolean;
  blockPopups: boolean;
  blockClickRedirects: boolean;
  blockTrackingRedirects: boolean;
  strictNavigation: boolean;
  stealthMode: boolean;
  allowlist: string[];
  customRules: CustomRule[];
  enabledLists: string[];
  theme: ThemeMode;
}

export interface SiteStats {
  blockedRequests: number;
  elementsHidden: number;
  redirectsBlocked?: number;
  popupsBlocked?: number;
  antiAdblockDefused?: number;
}

export interface ExtensionStats {
  totalBlockedRequests: number;
  sessionBlockedRequests: number;
  trackersBlocked: number;
  cosmeticElementsHidden: number;
  redirectsBlocked: number;
  popupsBlocked: number;
  clicksProtected: number;
  antiAdblockDefused: number;
  siteStats: Record<string, SiteStats>;
}

export interface PageStatusPayload {
  hostname: string;
  isGloballyEnabled: boolean;
  isSiteAllowlisted: boolean;
  cosmeticEnabled: boolean;
  networkEnabled: boolean;
  trackerEnabled: boolean;
  blockAdRedirects: boolean;
  blockPopups: boolean;
  blockClickRedirects: boolean;
  blockTrackingRedirects: boolean;
  strictNavigation: boolean;
  stealthMode: boolean;
  siteStats: SiteStats;
}

export type ExtensionMessage =
  | { type: typeof MESSAGE_TYPES.GET_PAGE_STATUS; hostname: string }
  | { type: typeof MESSAGE_TYPES.PAGE_STATUS_RESPONSE; payload: PageStatusPayload }
  | { type: typeof MESSAGE_TYPES.TOGGLE_GLOBAL_PROTECTION; enabled?: boolean }
  | { type: typeof MESSAGE_TYPES.TOGGLE_SITE_ALLOWLIST; hostname: string; allow: boolean }
  | { type: typeof MESSAGE_TYPES.REPORT_COSMETIC_BLOCKED; hostname: string; count: number }
  | { type: typeof MESSAGE_TYPES.REPORT_REDIRECT_BLOCKED; hostname: string; destination?: string }
  | { type: typeof MESSAGE_TYPES.REPORT_POPUP_BLOCKED; hostname: string; destination?: string }
  | { type: typeof MESSAGE_TYPES.REPORT_CLICK_PROTECTED; hostname: string }
  | { type: typeof MESSAGE_TYPES.REPORT_STEALTH_DEFUSED; hostname: string; technique?: string }
  | { type: typeof MESSAGE_TYPES.RESET_STATISTICS }
  | { type: typeof MESSAGE_TYPES.UPDATE_FILTER_LIST; listId: string }
  | { type: typeof MESSAGE_TYPES.TEST_RULE_SIMULATION; testUrl: string };

export interface DeclarativeRule {
  id: number;
  priority: number;
  action: {
    type: chrome.declarativeNetRequest.RuleActionType;
  };
  condition: {
    urlFilter?: string;
    regexFilter?: string;
    resourceTypes?: chrome.declarativeNetRequest.ResourceType[];
    domains?: string[];
    excludedDomains?: string[];
    initiatorDomains?: string[];
    excludedInitiatorDomains?: string[];
    domainType?: chrome.declarativeNetRequest.DomainType;
    isUrlFilterCaseSensitive?: boolean;
  };
}
