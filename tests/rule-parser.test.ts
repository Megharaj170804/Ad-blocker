import { describe, it, expect } from 'vitest';
import {
  parseAdblockFilterList,
  sanitizeDomain,
  isValidDomain,
} from '@/rules/filter-list-manager';
import { RULE_CONFIG } from '@/constants';

describe('AdBlock Filter List Parser & Domain Utilities', () => {
  it('correctly validates valid domain names and rejects invalid formats', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('sub.domain.co.uk')).toBe(true);
    expect(isValidDomain('localhost')).toBe(true);
    expect(isValidDomain('localhost:3000')).toBe(true);

    expect(isValidDomain('')).toBe(false);
    expect(isValidDomain('not a domain')).toBe(false);
    expect(isValidDomain('http://example.com')).toBe(false); // Raw protocol not sanitized yet
  });

  it('sanitizes domain inputs by stripping protocols, paths, and www prefixes', () => {
    expect(sanitizeDomain('https://www.google.com/search?q=test')).toBe('google.com');
    expect(sanitizeDomain('http://ads.doubleclick.net:8080/path')).toBe('ads.doubleclick.net');
    expect(sanitizeDomain('www.sub.example.org/')).toBe('sub.example.org');
    expect(sanitizeDomain('news.bbc.co.uk#header')).toBe('news.bbc.co.uk');
  });

  it('parses EasyList network rules into DeclarativeNetRequest rules', () => {
    const rawFilterData = `
      ! Title: EasyList Test Sample
      ! Homepage: https://easylist.to/
      [Adblock Plus 2.0]
      ||doubleclick.net^
      ||googlesyndication.com^$script,image
      @@||safe-sub.example.com^$document
      ##.banner-ad-cosmetic
      ||tracker.analytics.com^$third-party
    `;

    const rules = parseAdblockFilterList(rawFilterData, RULE_CONFIG.DYNAMIC_DOWNLOAD_RULE_BASE_ID, 100);

    // Comments, empty lines, and cosmetic rules (##) should be skipped
    expect(rules.length).toBe(4);

    // Rule 1: ||doubleclick.net^ (Block)
    expect(rules[0].action.type).toBe('block');
    expect(rules[0].condition.urlFilter).toBe('||doubleclick.net^');
    expect(rules[0].priority).toBe(RULE_CONFIG.PRIORITY_NORMAL_BLOCK);

    // Rule 2: ||googlesyndication.com^ with script,image modifiers
    expect(rules[1].action.type).toBe('block');
    expect(rules[1].condition.urlFilter).toBe('||googlesyndication.com^');
    expect(rules[1].condition.resourceTypes).toEqual(['script', 'image']);

    // Rule 3: @@ Exception rule
    expect(rules[2].action.type).toBe('allow');
    expect(rules[2].condition.urlFilter).toBe('||safe-sub.example.com^');
    expect(rules[2].priority).toBe(RULE_CONFIG.PRIORITY_ALLOWLIST_EXCEPTION);
  });

  it('respects maxRules limit parameter and stops parsing', () => {
    const manyRules = Array.from({ length: 50 }, (_, i) => `||adserver${i}.com^`).join('\n');
    const parsed = parseAdblockFilterList(manyRules, 1000, 15);
    expect(parsed.length).toBe(15);
  });
});
