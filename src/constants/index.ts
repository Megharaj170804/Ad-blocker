/**
 * Application Constants
 * Adhering to strict coding standards: zero magic numbers or string literals in business logic.
 */

// Storage Keys
export const STORAGE_KEYS = {
  SETTINGS: 'padb_settings',
  STATS: 'padb_statistics',
  RULE_STATUS: 'padb_rule_status',
  CUSTOM_RULES: 'padb_custom_rules',
} as const;

// Ruleset Identifiers (matching manifest.json static rulesets)
export const RULESET_IDS = {
  EASYLIST: 'ruleset_easylist',
  EASYPRIVACY: 'ruleset_easyprivacy',
  ANNOYANCES: 'ruleset_annoyances',
} as const;

// DeclarativeNetRequest Rule Limits & ID Ranges
export const RULE_CONFIG = {
  MAX_DYNAMIC_RULES: 5000,
  ALLOWLIST_RULE_BASE_ID: 10000,
  CUSTOM_BLOCK_RULE_BASE_ID: 20000,
  DYNAMIC_DOWNLOAD_RULE_BASE_ID: 30000,
  PRIORITY_NORMAL_BLOCK: 1,
  PRIORITY_CUSTOM_BLOCK: 2,
  PRIORITY_ALLOWLIST_EXCEPTION: 3,
} as const;

// Content Script & Cosmetic & Navigation Filter Thresholds
export const COSMETIC_CONFIG = {
  OBSERVER_DEBOUNCE_DELAY_MS: 150,
  MAX_ELEMENTS_PROCESSED_PER_PASS: 300,
  MODAL_MIN_Z_INDEX: 999,
  OVERLAY_MIN_VIEWPORT_COVERAGE_RATIO: 0.5,
  CLICKJACK_OVERLAY_MIN_COVERAGE_RATIO: 0.6,
  CLICKJACK_MAX_OPACITY: 0.08,
  CLICKJACK_HIGH_Z_INDEX: 9999,
  MAX_ALLOWED_POPUPS_PER_GESTURE: 1,
  POPUP_GESTURE_EXPIRY_MS: 1000,
  BATCH_STATS_REPORT_INTERVAL_MS: 1000,
} as const;

// Filter List Network & Sync Constants
export const FILTER_UPDATE_CONFIG = {
  FETCH_TIMEOUT_MS: 12000,
  DEFAULT_MAX_RULES_PARSED: 2500,
} as const;

// Known Ad Redirect, Pop-up, Pop-under, and Streaming Hijack Domains
export const KNOWN_REDIRECT_AND_POPUP_DOMAINS: readonly string[] = [
  'adsterra.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'exoclick.com',
  'clickadu.com',
  'adcash.com',
  'hilltopads.com',
  'yllix.com',
  'trafficjunky.com',
  'juicyads.com',
  'admaven.com',
  'revenuehits.com',
  'clicksor.com',
  'linkvertise.com',
  'adf.ly',
  'shorte.st',
  'ouo.io',
  'bc.vc',
  'ad-delivery.net',
  'syndication.exoclick.com',
  'serve.popads.net',
  'xml.popcash.net',
  'engine.phn.doublepimp.com',
  'delivery.trafficjunky.com',
  'zeroredirect1.com',
  'onclickalgo.com',
  'onclickperformance.com',
  'deloton.com',
  'realsrv.com',
  'ptgnwm.com',
  'ad-score.com',
  'onclkds.com',
  'highcpmgate.com',
  'effectivecpmgate.com',
  'directrev.com',
  'monetag.com',
  'evadav.com',
  'richads.com',
  'bidvertiser.com',
  'infolinks.com',
  'vidoomy.com',
  'adbit.co',
  'a-ads.com',
  'adoperator.com',
  'clickaine.com',
  'traffichaus.com',
  'cpmstar.com',
  'cissoiddownset.com',
  'vr.cissoiddownset.com',
];

// Display Ad Campaign & Click Tracker URL Patterns (Targeting paid ad networks, not user search)
export const AD_CAMPAIGN_PARAM_PATTERNS: readonly RegExp[] = [
  /[?&]utm_medium=(display|cpc|banner)/i,
  /[?&]utm_source=([^&]+)&utm_medium=display/i,
  /[?&](aff_id|clickid)=/i,
];

// Essential productivity, AI, and developer domains that must NEVER have main navigation or critical scripts blocked
export const ESSENTIAL_PRODUCTIVITY_DOMAINS: readonly string[] = [
  'chatgpt.com',
  'openai.com',
  'oaistatic.com',
  'oaiusercontent.com',
  'anthropic.com',
  'claude.ai',
  'github.com',
  'accounts.google.com',
  'docs.google.com',
  'drive.google.com',
  'mail.google.com',
  'meet.google.com',
  'calendar.google.com',
  'microsoft.com',
  'apple.com',
];

export function isProtectedDomain(hostname: string): boolean {
  if (!hostname) return false;
  const clean = hostname.trim().toLowerCase().replace(/^www\./, '');
  return ESSENTIAL_PRODUCTIVITY_DOMAINS.some(
    (domain) => clean === domain || clean.endsWith(`.${domain}`)
  );
}

// Selectors for Anti-Adblock banners, warning modals, and full-screen click-stealing overlays
export const ANTI_ADBLOCK_SELECTORS: readonly string[] = [
  '.warn-box',
  '[class*="warn-box"]',
  '#adblock-warning',
  '.adblock-notice',
  '.adblock-msg',
  '[id*="adblock-message"]',
  '.adblock-overlay',
  '#adblock-banner',
  '[class*="bb-overlay"]',
  '[id*="bb-overlay"]',
  '.bookmark-banner-x7m4q2',
  'tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model)',
  'ytd-enforcement-message-view-model',
];

// YouTube-specific ad banner and overlay selectors
export const YOUTUBE_AD_SELECTORS: readonly string[] = [
  'ytd-ad-slot-renderer',
  '#masthead-ad',
  'ytd-banner-promo-renderer',
  'ytd-in-feed-ad-layout-renderer',
  '.ytd-promoted-video-renderer',
  '.ytd-promoted-sparkles-web-renderer',
  '.ytd-display-ad-renderer',
  'ytd-statement-banner-renderer',
  '.ytp-ad-overlay-container',
  '.ytp-ad-message-container',
  '#player-ads',
];

// YouTube Video Ad Acceleration & Instant Skip Constants
export const YOUTUBE_CONFIG = {
  FAST_FORWARD_RATE: 16.0,
  NORMAL_PLAYBACK_RATE: 1.0,
  POLL_INTERVAL_MS: 50,
  DURATION_END_OFFSET_SECONDS: 0.1,
  SKIP_BUTTON_SELECTORS: [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-text',
    'button.ytp-ad-skip-button',
    'button[aria-label*="Skip ad" i]',
    'button[aria-label*="Skip" i]',
    '.ytp-ad-overlay-close-button',
  ],
} as const;

// Selectors for legitimate content/download containers that anti-adblock scripts hide
export const FORCE_UNHIDE_SELECTORS: readonly string[] = [
  '.download-links-div',
  '.downloads-btns-div',
  '.warn-box ~ .download-links-div',
  '[class*="download-links"]',
  '[id*="download-links"]',
];

// Anti-Adblock Stealth Defuser Configuration
export const STEALTH_CONFIG = {
  SPOOFED_CLIENT_ID: 'ca-pub-0000000000000000',
  DUMMY_NATIVE_TO_STRING: 'function () { [native code] }',
  DUMMY_WINDOW_OPEN_TO_STRING: 'function open() { [native code] }',
  MOCK_AD_SCRIPT_RESPONSE: 'var ads_loaded = true; window.__padb_ads_loaded = true;',
} as const;

// Message Types for Chrome Messaging
export const MESSAGE_TYPES = {
  GET_PAGE_STATUS: 'GET_PAGE_STATUS',
  PAGE_STATUS_RESPONSE: 'PAGE_STATUS_RESPONSE',
  TOGGLE_GLOBAL_PROTECTION: 'TOGGLE_GLOBAL_PROTECTION',
  TOGGLE_SITE_ALLOWLIST: 'TOGGLE_SITE_ALLOWLIST',
  REPORT_COSMETIC_BLOCKED: 'REPORT_COSMETIC_BLOCKED',
  REPORT_REDIRECT_BLOCKED: 'REPORT_REDIRECT_BLOCKED',
  REPORT_POPUP_BLOCKED: 'REPORT_POPUP_BLOCKED',
  REPORT_CLICK_PROTECTED: 'REPORT_CLICK_PROTECTED',
  REPORT_STEALTH_DEFUSED: 'REPORT_STEALTH_DEFUSED',
  RESET_STATISTICS: 'RESET_STATISTICS',
  UPDATE_FILTER_LIST: 'UPDATE_FILTER_LIST',
  TEST_RULE_SIMULATION: 'TEST_RULE_SIMULATION',
} as const;

// Default Filter List Metadata & Source URLs
export const DEFAULT_FILTER_LISTS = [
  {
    id: RULESET_IDS.EASYLIST,
    name: 'EasyList Primary Ads',
    description: 'Blocks common web advertising, video banners, pop-unders, and sponsored links.',
    url: 'https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt',
    category: 'ads',
    enabled: true,
  },
  {
    id: RULESET_IDS.EASYPRIVACY,
    name: 'EasyPrivacy Trackers',
    description: 'Blocks behavioral tracking, telemetry beacons, and fingerprinting scripts.',
    url: 'https://raw.githubusercontent.com/easylist/easylist/master/easyprivacy/easyprivacy_general.txt',
    category: 'privacy',
    enabled: true,
  },
  {
    id: RULESET_IDS.ANNOYANCES,
    name: 'Annoyances & Overlays',
    description: 'Blocks newsletter prompts, anti-adblock dialogs, and intrusive full-page overlays.',
    url: 'https://raw.githubusercontent.com/easylist/easylist/master/fanboy-addon/fanboy-annoyance.txt',
    category: 'annoyances',
    enabled: true,
  },
] as const;

// Themes
export const THEMES = {
  SYSTEM: 'system',
  DARK: 'dark',
  LIGHT: 'light',
} as const;
