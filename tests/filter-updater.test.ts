import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAndValidateFilterList } from '@/rules/filter-list-manager';

describe('Filter List Remote Updater & Resilience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles network failure gracefully without throwing exceptions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network connection timeout')));

    const result = await fetchAndValidateFilterList('https://example.com/bad-list.txt');
    expect(result.success).toBe(false);
    expect(result.rules).toEqual([]);
    expect(result.error).toContain('Network connection timeout');
  });

  it('handles HTTP error statuses gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    );

    const result = await fetchAndValidateFilterList('https://example.com/404-list.txt');
    expect(result.success).toBe(false);
    expect(result.rules).toEqual([]);
    expect(result.error).toContain('404');
  });

  it('handles empty response bodies gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '   ',
      })
    );

    const result = await fetchAndValidateFilterList('https://example.com/empty-list.txt');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Received empty response');
  });

  it('parses valid remote response into DNR rules', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          ! Title: Remote Rules
          ||ad-provider.com^
          ||tracker.org^$image
        `,
      })
    );

    const result = await fetchAndValidateFilterList('https://example.com/valid-list.txt');
    expect(result.success).toBe(true);
    expect(result.ruleCount).toBe(2);
    expect(result.rules[0].condition.urlFilter).toBe('||ad-provider.com^');
  });
});
