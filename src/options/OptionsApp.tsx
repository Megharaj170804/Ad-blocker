import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Globe,
  Sliders,
  ListFilter,
  Plus,
  Trash2,
  RefreshCw,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  ExternalLink,
  MousePointerClick,
  Compass,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  getStats,
  resetStats,
  getFilterLists,
} from '@/storage/settings';
import { ExtensionSettings, ExtensionStats, FilterListMetadata, CustomRule, ThemeMode } from '@/types';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { Badge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { isValidDomain, sanitizeDomain } from '@/rules/filter-list-manager';
import { simulateRuleMatch } from '@/rules/rule-manager';
import { isKnownAdOrRedirectUrl } from '@/content/redirect-popup-blocker';
import { MESSAGE_TYPES, THEMES } from '@/constants';

type OptionsTab = 'general' | 'navigation' | 'filter-lists' | 'allowlist' | 'custom-rules' | 'stats' | 'privacy';

export const OptionsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OptionsTab>('general');
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [stats, setStats] = useState<ExtensionStats | null>(null);
  const [filterLists, setFilterLists] = useState<FilterListMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form states
  const [newAllowlistDomain, setNewAllowlistDomain] = useState<string>('');
  const [allowlistError, setAllowlistError] = useState<string>('');
  const [allowlistFilterQuery, setAllowlistFilterQuery] = useState<string>('');

  const [newCustomPattern, setNewCustomPattern] = useState<string>('');
  const [newCustomAction, setNewCustomAction] = useState<'block' | 'allow'>('block');
  const [customRuleError, setCustomRuleError] = useState<string>('');

  // Interactive Rule Simulator
  const [simulationUrl, setSimulationUrl] = useState<string>('');
  const [simulationResult, setSimulationResult] = useState<{
    tested: boolean;
    matched: boolean;
    ruleType?: string;
    pattern?: string;
    isRedirectTarget?: boolean;
  }>({ tested: false, matched: false });

  // Update status feedback
  const [updateFeedback, setUpdateFeedback] = useState<string>('');

  // Load configuration
  const loadData = useCallback(async () => {
    try {
      const [loadedSettings, loadedStats, loadedLists] = await Promise.all([
        getSettings(),
        getStats(),
        getFilterLists(),
      ]);
      setSettings(loadedSettings);
      setStats(loadedStats);
      setFilterLists(loadedLists);
    } catch {
      // Safe fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = () => {
        loadData();
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, [loadData]);

  // Apply theme
  useEffect(() => {
    if (!settings) return;
    if (settings.theme === THEMES.SYSTEM) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings?.theme]);

  // Save partial settings helper
  const updateSettings = async (partial: Partial<ExtensionSettings>) => {
    if (!settings) return;
    const updated = await saveSettings(partial);
    setSettings(updated);

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      if (typeof partial.enabled === 'boolean') {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.TOGGLE_GLOBAL_PROTECTION,
          enabled: partial.enabled,
        });
      }
    }
  };

  // Toggle filter list
  const handleToggleList = async (listId: string, enabled: boolean) => {
    if (!settings) return;
    const currentEnabled = new Set(settings.enabledLists);
    if (enabled) {
      currentEnabled.add(listId);
    } else {
      currentEnabled.delete(listId);
    }
    await updateSettings({ enabledLists: Array.from(currentEnabled) });
  };

  // Manual list update trigger
  const handleUpdateList = async (listId: string) => {
    setUpdateFeedback(`Updating list: ${listId}...`);
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.UPDATE_FILTER_LIST,
          listId,
        });
        if (response?.success) {
          setUpdateFeedback(`Successfully updated list! (${response.ruleCount} rules active)`);
        } else {
          setUpdateFeedback(`Update failed: ${response?.error || 'Network error'}`);
        }
      } catch (err) {
        setUpdateFeedback(`Update error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      setUpdateFeedback('Filter list update simulated in mock mode.');
    }
    await loadData();
    setTimeout(() => setUpdateFeedback(''), 5000);
  };

  // Allowlist handlers
  const handleAddAllowlistDomain = async () => {
    if (!settings) return;
    setAllowlistError('');
    const clean = sanitizeDomain(newAllowlistDomain);

    if (!clean) {
      setAllowlistError('Please enter a valid website domain');
      return;
    }

    if (!isValidDomain(clean)) {
      setAllowlistError('Invalid domain format (e.g. example.com or news.site.org)');
      return;
    }

    if (settings.allowlist.includes(clean)) {
      setAllowlistError('Domain is already in your allowlist');
      return;
    }

    const updated = [...settings.allowlist, clean];
    await updateSettings({ allowlist: updated });
    setNewAllowlistDomain('');
  };

  const handleRemoveAllowlistDomain = async (domainToRemove: string) => {
    if (!settings) return;
    const updated = settings.allowlist.filter((d) => d !== domainToRemove);
    await updateSettings({ allowlist: updated });
  };

  // Custom rule handlers
  const handleAddCustomRule = async () => {
    if (!settings) return;
    setCustomRuleError('');
    const pattern = newCustomPattern.trim();

    if (!pattern) {
      setCustomRuleError('Please specify a URL filter or domain pattern');
      return;
    }

    const newRule: CustomRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pattern,
      action: newCustomAction,
      enabled: true,
      createdAt: Date.now(),
    };

    const updated = [...settings.customRules, newRule];
    await updateSettings({ customRules: updated });
    setNewCustomPattern('');
  };

  const handleToggleCustomRule = async (ruleId: string, enabled: boolean) => {
    if (!settings) return;
    const updated = settings.customRules.map((r) =>
      r.id === ruleId ? { ...r, enabled } : r
    );
    await updateSettings({ customRules: updated });
  };

  const handleDeleteCustomRule = async (ruleId: string) => {
    if (!settings) return;
    const updated = settings.customRules.filter((r) => r.id !== ruleId);
    await updateSettings({ customRules: updated });
  };

  // Rule & Redirect Simulation
  const handleRunSimulation = () => {
    if (!settings || !simulationUrl.trim()) return;
    const url = simulationUrl.trim();
    const result = simulateRuleMatch(url, settings);
    const isRedirect = isKnownAdOrRedirectUrl(url);

    setSimulationResult({
      tested: true,
      matched: result.matched || isRedirect,
      ruleType: isRedirect ? 'Known Redirect/Ad Network' : result.ruleType,
      pattern: result.pattern || url,
      isRedirectTarget: isRedirect,
    });
  };

  // Stats reset
  const handleResetAllStats = async () => {
    if (confirm('Are you sure you want to reset all recorded blocking statistics?')) {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_STATISTICS });
      }
      await resetStats();
      await loadData();
    }
  };

  if (isLoading || !settings || !stats) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        Loading Settings...
      </div>
    );
  }

  const filteredAllowlist = settings.allowlist.filter((domain) =>
    domain.toLowerCase().includes(allowlistFilterQuery.toLowerCase())
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '940px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header */}
        <header
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-emerald-subtle)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Personal AdBlock Settings
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Ad blocking, redirect protection, pop-up suppression, and privacy controls
              </p>
            </div>
          </div>

          {/* Theme Selector */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { mode: THEMES.SYSTEM, label: 'System', icon: <Laptop size={14} /> },
              { mode: THEMES.LIGHT, label: 'Light', icon: <Sun size={14} /> },
              { mode: THEMES.DARK, label: 'Dark', icon: <Moon size={14} /> },
            ].map((t) => (
              <button
                key={t.mode}
                onClick={() => updateSettings({ theme: t.mode as ThemeMode })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: settings.theme === t.mode ? 'var(--bg-card)' : 'transparent',
                  color: settings.theme === t.mode ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: settings.theme === t.mode ? 'var(--shadow-sm)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '0 32px',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'general', label: 'General Protection', icon: <Sliders size={16} /> },
            { id: 'navigation', label: 'Redirects & Pop-ups', icon: <Compass size={16} /> },
            { id: 'filter-lists', label: 'Filter Lists', icon: <ListFilter size={16} /> },
            { id: 'allowlist', label: 'Website Exceptions', icon: <Globe size={16} /> },
            { id: 'custom-rules', label: 'Custom Rules', icon: <Sparkles size={16} /> },
            { id: 'stats', label: 'Statistics', icon: <Shield size={16} /> },
            { id: 'privacy', label: 'Privacy & Security', icon: <Lock size={16} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as OptionsTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${isActive ? 'var(--accent-emerald)' : 'transparent'}`,
                  transition: 'color var(--transition-fast)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Body */}
        <main style={{ padding: '32px', flex: 1, backgroundColor: 'var(--bg-primary)' }}>
          {updateFeedback && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-indigo-subtle)',
                color: 'var(--accent-indigo)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
              }}
            >
              <RefreshCw size={16} />
              <span>{updateFeedback}</span>
            </div>
          )}

          {/* TAB 1: GENERAL PROTECTION */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Core Protection Engines</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Master controls for ad blocking, network rules, and cosmetic layout filtering.
                </p>
              </div>

              {/* Master Global Protection */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Master Protection Switch</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Globally enable or pause all ad blocking, redirect defense, and cosmetic filtering.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.enabled}
                  onChange={(val) => updateSettings({ enabled: val })}
                  size="lg"
                />
              </div>

              {/* Network Filtering */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Network-Level Request Blocking</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Blocks advertising servers, tracking pixels, and video ad streams before requests hit the network.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.networkFilteringEnabled}
                  onChange={(val) => updateSettings({ networkFilteringEnabled: val })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Cosmetic Filtering */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cosmetic Filtering & Intrusive Overlay Removal</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Hides empty ad placeholders, dismisses newsletter popups, and restores scrollability.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.cosmeticFilteringEnabled}
                  onChange={(val) => updateSettings({ cosmeticFilteringEnabled: val })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Tracker Blocking */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Behavioral Tracker & Telemetry Protection</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Blocks analytics trackers, fingerprinting scripts, and heatmaps (EasyPrivacy ruleset).
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.trackerBlockingEnabled}
                  onChange={(val) => updateSettings({ trackerBlockingEnabled: val })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          )}

          {/* TAB 2: REDIRECTS & POP-UPS (CRITICAL FEATURE) */}
          {activeTab === 'navigation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Redirect & Pop-Up Defenses</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Prevent advertising scripts, deceptive video players, and scam pages from hijacking your navigation.
                </p>
              </div>

              {/* 1. Block Ad Redirects */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Block Advertising Redirects</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Prevents automatic redirection to third-party ad networks, fake warning pages, and deceptive download sites.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.blockAdRedirects}
                  onChange={(val) => updateSettings({ blockAdRedirects: val })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* 2. Block Pop-Ups and Pop-Under Tabs */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Block Pop-Ups and Pop-Under Tabs</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Intercepts unauthorized `window.open()` calls, timer-based tabs, and pop-under windows opened behind active tabs.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.blockPopups}
                  onChange={(val) => updateSettings({ blockPopups: val })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* 3. Block Click-Triggered Redirects */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Block Click-Triggered Redirects & Overlays</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Detects and disarms invisible full-screen overlays (clickjacking) common on video streaming and download websites.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.blockClickRedirects}
                  onChange={(val) => updateSettings({ blockClickRedirects: val })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* 4. Block Tracking Redirects */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Block Tracking Redirects & URL Intermediaries</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Stops redirect chains that bounce through analytics bounce gateways and intermediate tracker domains.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.blockTrackingRedirects}
                  onChange={(val) => updateSettings({ blockTrackingRedirects: val })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* 5. Strict Navigation Protection (Optional) */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Strict Navigation Protection</span>
                    <Badge variant="warning" size="sm">Optional</Badge>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Blocks any third-party cross-origin new tab or popup unless the site is allowlisted. Recommended for high-risk streaming sites.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.strictNavigation}
                  onChange={(val) => updateSettings({ strictNavigation: val })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* 6. Anti-Adblock Stealth Defuser */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Anti-Adblock Stealth Mode</span>
                    <Badge variant="info" size="sm">Stealth</Badge>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Runs in the page execution context at document start to spoof ad-checker variables (`canRunAds`, `adsbygoogle`, etc.), defuse honeypot inspection traps, and disguise adblocker presence.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.stealthMode}
                  onChange={(val) => updateSettings({ stealthMode: val })}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          )}

          {/* TAB 3: FILTER LISTS */}
          {activeTab === 'filter-lists' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Maintained Filter Lists</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Curated and compatible community rulesets compiled into Chrome DeclarativeNetRequest format.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filterLists.map((list) => {
                  const isEnabled = settings.enabledLists.includes(list.id);
                  return (
                    <div
                      key={list.id}
                      style={{
                        padding: '18px 20px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{list.name}</span>
                            <Badge variant={isEnabled ? 'success' : 'neutral'} size="sm">
                              {isEnabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {list.description}
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={isEnabled}
                          onChange={(val) => handleToggleList(list.id, val)}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <span>
                            Last updated:{' '}
                            {list.lastUpdated
                              ? new Date(list.lastUpdated).toLocaleDateString()
                              : 'Bundled with extension'}
                          </span>
                          {list.lastErrorMessage && (
                            <span style={{ color: 'var(--accent-danger)' }}>
                              Error: {list.lastErrorMessage}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          icon={<RefreshCw size={13} />}
                          onClick={() => handleUpdateList(list.id)}
                          disabled={list.lastUpdateStatus === 'updating'}
                        >
                          {list.lastUpdateStatus === 'updating' ? 'Updating...' : 'Check for Updates'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: WEBSITE EXCEPTIONS (ALLOWLIST) */}
          {activeTab === 'allowlist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Website Exceptions (Allowlist)</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Websites listed here will retain full original functionality without network or popup blocking.
                </p>
              </div>

              {/* Add form */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="e.g. example.com or trusted-partner.org"
                    value={newAllowlistDomain}
                    onChange={(e) => setNewAllowlistDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAllowlistDomain()}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                  {allowlistError && (
                    <div style={{ color: 'var(--accent-danger)', fontSize: '0.775rem', marginTop: '4px' }}>
                      {allowlistError}
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Plus size={16} />}
                  onClick={handleAddAllowlistDomain}
                >
                  Add Exception
                </Button>
              </div>

              {/* Filter search */}
              {settings.allowlist.length > 5 && (
                <input
                  type="text"
                  placeholder="Filter allowlisted websites..."
                  value={allowlistFilterQuery}
                  onChange={(e) => setAllowlistFilterQuery(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                  }}
                />
              )}

              {/* List */}
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {filteredAllowlist.length === 0 ? (
                  <div
                    style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {settings.allowlist.length === 0
                      ? 'No website exceptions added yet.'
                      : 'No domains match your search query.'}
                  </div>
                ) : (
                  filteredAllowlist.map((domain, index) => (
                    <div
                      key={domain}
                      style={{
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom:
                          index === filteredAllowlist.length - 1
                            ? 'none'
                            : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={16} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{domain}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAllowlistDomain(domain)}
                        style={{ color: 'var(--accent-danger)' }}
                        icon={<Trash2 size={15} />}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOM RULES & TEST SIMULATOR */}
          {activeTab === 'custom-rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Custom Rules & Filters</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Create custom URL pattern or domain rules with dedicated priority handling.
                </p>
              </div>

              {/* Add Custom Rule Form */}
              <div
                style={{
                  padding: '18px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Create New Rule</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={newCustomAction}
                    onChange={(e) => setNewCustomAction(e.target.value as 'block' | 'allow')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="block">Block</option>
                    <option value="allow">Allow</option>
                  </select>

                  <input
                    type="text"
                    placeholder="URL pattern or domain (e.g. ads.example.com, *sponsor*)"
                    value={newCustomPattern}
                    onChange={(e) => setNewCustomPattern(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomRule()}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />

                  <Button
                    variant="primary"
                    size="md"
                    icon={<Plus size={16} />}
                    onClick={handleAddCustomRule}
                  >
                    Add Rule
                  </Button>
                </div>

                {customRuleError && (
                  <div style={{ color: 'var(--accent-danger)', fontSize: '0.775rem' }}>
                    {customRuleError}
                  </div>
                )}
              </div>

              {/* Custom Rules List */}
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {settings.customRules.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No custom rules defined yet.
                  </div>
                ) : (
                  settings.customRules.map((rule, idx) => (
                    <div
                      key={rule.id}
                      style={{
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom:
                          idx === settings.customRules.length - 1
                            ? 'none'
                            : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Badge
                          variant={rule.action === 'block' ? 'danger' : 'success'}
                          size="sm"
                        >
                          {rule.action}
                        </Badge>
                        <code
                          style={{
                            fontSize: '0.85rem',
                            padding: '2px 6px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          {rule.pattern}
                        </code>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ToggleSwitch
                          checked={rule.enabled}
                          onChange={(val) => handleToggleCustomRule(rule.id, val)}
                          size="sm"
                        />
                        <button
                          onClick={() => handleDeleteCustomRule(rule.id)}
                          style={{
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Interactive Rule Simulator */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Interactive URL & Redirect Simulator</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Test whether a specific destination URL or ad script will be intercepted by your protection rules.
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Enter URL to test (e.g. https://popads.net/serve or ads.example.com)"
                    value={simulationUrl}
                    onChange={(e) => setSimulationUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunSimulation()}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Button variant="secondary" size="md" onClick={handleRunSimulation}>
                    Test Match
                  </Button>
                </div>

                {simulationResult.tested && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: simulationResult.matched
                        ? 'var(--accent-emerald-subtle)'
                        : 'var(--bg-tertiary)',
                      border: `1px solid ${
                        simulationResult.matched ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.85rem',
                    }}
                  >
                    {simulationResult.matched ? (
                      <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
                    ) : (
                      <AlertCircle size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span>
                      {simulationResult.matched
                        ? `Blocked by Defense: ${simulationResult.ruleType} (${simulationResult.pattern})`
                        : 'No custom rule or redirect signature matched this URL (Allowed).'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: STATISTICS */}
          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Blocking & Protection Statistics</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Metrics recorded locally on your device without sending any data to external servers.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw size={14} />}
                  onClick={handleResetAllStats}
                >
                  Reset All Stats
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <StatCard
                  title="Network Requests Blocked"
                  value={stats.totalBlockedRequests}
                  icon={<Shield size={18} />}
                  subtitle="DNR rules engine"
                />
                <StatCard
                  title="Pop-ups & Tabs Blocked"
                  value={stats.popupsBlocked}
                  icon={<ExternalLink size={18} />}
                  subtitle="Suppressed before open"
                />
                <StatCard
                  title="Forced Redirects Blocked"
                  value={stats.redirectsBlocked}
                  icon={<Compass size={18} />}
                  subtitle="Preserved original page"
                />
                <StatCard
                  title="Click Overlays Disarmed"
                  value={stats.clicksProtected}
                  icon={<MousePointerClick size={18} />}
                  subtitle="Transparent clickjacks"
                />
                <StatCard
                  title="Anti-Adblock Defused"
                  value={stats.antiAdblockDefused}
                  icon={<Sparkles size={18} />}
                  subtitle="Stealth honeypot bypasses"
                />
                <StatCard
                  title="Trackers Blocked"
                  value={stats.trackersBlocked}
                  icon={<ShieldCheck size={18} />}
                  subtitle="EasyPrivacy telemetry"
                />
              </div>

              {/* Per-site statistics breakdown table */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
                  Per-Website Activity Log ({Object.keys(stats.siteStats).length} recorded domains)
                </div>

                <div
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                  }}
                >
                  {Object.keys(stats.siteStats).length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No per-site statistics recorded yet. Browse the web to see activity.
                    </div>
                  ) : (
                    Object.entries(stats.siteStats).map(([site, siteData]) => (
                      <div
                        key={site}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{site}</span>
                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                          <span>Requests: {siteData.blockedRequests}</span>
                          <span>Hidden: {siteData.elementsHidden}</span>
                          <span>Pop-ups: {siteData.popupsBlocked ?? 0}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PRIVACY & ARCHITECTURE */}
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Privacy Policy & Security Guarantee</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Built for personal ownership and strict privacy compliance.
                </p>
              </div>

              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    1. Zero Telemetry & No Remote Data Transfer
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Personal AdBlock runs 100% locally on your browser. Visited URLs, web page content,
                    and personal browsing history are NEVER transmitted to external servers, cloud databases,
                    or analytics services.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    2. Multi-Layer Redirect & Pop-Up Defense
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Deceptive redirects and unwanted pop-ups are stopped at two levels: (1) native network
                    blocking via Chrome `declarativeNetRequest` and `webNavigation`, preventing connection
                    to known ad redirectors; and (2) content-script level interception, catching `window.open`
                    calls, disarming invisible click overlays, and preventing click hijacking before any navigation starts.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    3. Preservation of Legitimate Navigation
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Authentication flows, single sign-on (SSO), payment gateways, video control buttons,
                    and legitimate link clicks are strictly protected and never blocked.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    4. Technical Scope & Limitations
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Under Chrome Extension Manifest V3, extensions operate within browser-enforced sandbox
                    boundaries. While the extension applies the strongest reliable interception techniques,
                    some navigations controlled directly by browser chrome or privileged system settings
                    cannot be altered.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
