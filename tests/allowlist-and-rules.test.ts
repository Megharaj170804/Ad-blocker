import { describe, it, expect } from 'vitest';
import {
  buildAllowlistRules,
  buildCustomRules,
  simulateRuleMatch,
} from '@/rules/rule-manager';
import { isHostnameAllowlisted, DEFAULT_SETTINGS } from '@/storage/settings';
import { RULE_CONFIG } from '@/constants';
import { CustomRule, ExtensionSettings } from '@/types';

describe('Allowlist Precedence & Custom Rules', () => {
  it('identifies allowlisted domains including subdomains', () => {
    const settings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      allowlist: ['example.com', 'news.site.org'],
    };

    expect(isHostnameAllowlisted('example.com', settings)).toBe(true);
    expect(isHostnameAllowlisted('sub.example.com', settings)).toBe(true);
    expect(isHostnameAllowlisted('deep.sub.example.com', settings)).toBe(true);
    expect(isHostnameAllowlisted('news.site.org', settings)).toBe(true);

    expect(isHostnameAllowlisted('anotherexample.com', settings)).toBe(false);
    expect(isHostnameAllowlisted('site.org', settings)).toBe(false); // only news.site.org was allowlisted
  });

  it('builds allowlist rules with high priority and allowAllRequests action', () => {
    const allowlist = ['mybank.com', 'portal.work.org'];
    const rules = buildAllowlistRules(allowlist);

    expect(rules.length).toBe(2);
    expect(rules[0].priority).toBe(RULE_CONFIG.PRIORITY_ALLOWLIST_EXCEPTION);
    expect(rules[0].action.type).toBe('allowAllRequests');
    expect(rules[0].condition.initiatorDomains).toEqual(['mybank.com']);
  });

  it('builds custom block and allow rules from user settings', () => {
    const customRules: CustomRule[] = [
      { id: '1', pattern: 'ads.tracker.net', action: 'block', enabled: true, createdAt: 100 },
      { id: '2', pattern: '*promo-banner*', action: 'block', enabled: true, createdAt: 200 },
      { id: '3', pattern: 'disabled.com', action: 'block', enabled: false, createdAt: 300 },
      { id: '4', pattern: 'trusted-partner.com', action: 'allow', enabled: true, createdAt: 400 },
    ];

    const rules = buildCustomRules(customRules);

    // Disabled rule should be excluded
    expect(rules.length).toBe(3);

    // Block rule
    expect(rules[0].action.type).toBe('block');
    expect(rules[0].condition.urlFilter).toBe('||ads.tracker.net^');
    expect(rules[0].priority).toBe(RULE_CONFIG.PRIORITY_CUSTOM_BLOCK);

    // Glob pattern rule preserves wildcards
    expect(rules[1].condition.urlFilter).toBe('*promo-banner*');

    // Custom allow rule receives exception priority
    expect(rules[2].action.type).toBe('allow');
    expect(rules[2].priority).toBe(RULE_CONFIG.PRIORITY_ALLOWLIST_EXCEPTION);
  });

  it('simulates rule matches accurately against URLs', () => {
    const settings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      networkFilteringEnabled: true,
      allowlist: ['allowed-site.com'],
      customRules: [
        { id: '1', pattern: 'custom-tracker', action: 'block', enabled: true, createdAt: 1 },
      ],
    };

    // Test allowlisted site
    const allowMatch = simulateRuleMatch('https://sub.allowed-site.com/script.js', settings);
    expect(allowMatch.matched).toBe(true);
    expect(allowMatch.ruleType).toBe('allowlist');

    // Test custom block
    const blockMatch = simulateRuleMatch('https://random.com/assets/custom-tracker.js', settings);
    expect(blockMatch.matched).toBe(true);
    expect(blockMatch.ruleType).toBe('custom_block');

    // Test unmatched
    const noMatch = simulateRuleMatch('https://clean-site.org/app.js', settings);
    expect(noMatch.matched).toBe(false);
  });
});
