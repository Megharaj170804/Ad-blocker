import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Settings,
  RotateCcw,
  Sun,
  Moon,
  Zap,
  ExternalLink,
  MousePointerClick,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  getStats,
  resetStats,
  isHostnameAllowlisted,
} from '@/storage/settings';
import { ExtensionSettings, ExtensionStats, SiteStats } from '@/types';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { Badge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { MESSAGE_TYPES, THEMES } from '@/constants';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [stats, setStats] = useState<ExtensionStats | null>(null);
  const [currentHostname, setCurrentHostname] = useState<string>('');
  const [isSupportedPage, setIsSupportedPage] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAdvancedToggles, setShowAdvancedToggles] = useState<boolean>(false);

  // Load state and detect current tab hostname
  const refreshData = useCallback(async () => {
    try {
      const [loadedSettings, loadedStats] = await Promise.all([
        getSettings(),
        getStats(),
      ]);
      setSettings(loadedSettings);
      setStats(loadedStats);

      // Detect active tab
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (activeTab?.url) {
          if (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://')) {
            const url = new URL(activeTab.url);
            setCurrentHostname(url.hostname);
            setIsSupportedPage(true);
          } else {
            setCurrentHostname('Internal Browser Page');
            setIsSupportedPage(false);
          }
        }
      } else {
        setCurrentHostname('example.com');
        setIsSupportedPage(true);
      }
    } catch {
      // Safe state fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = () => {
        refreshData();
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, [refreshData]);

  // Apply theme class to document element
  useEffect(() => {
    if (!settings) return;
    const theme = settings.theme;
    if (theme === THEMES.SYSTEM) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [settings?.theme]);

  // Handle master toggle
  const handleToggleGlobalProtection = async (enabled: boolean) => {
    if (!settings) return;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TOGGLE_GLOBAL_PROTECTION,
        enabled,
      });
    }
    const updated = await saveSettings({ enabled });
    setSettings(updated);
  };

  // Handle allowlist toggle for current website
  const handleToggleSiteAllowlist = async () => {
    if (!settings || !currentHostname || !isSupportedPage) return;
    const isAllowlisted = isHostnameAllowlisted(currentHostname, settings);
    const newAllowState = !isAllowlisted;

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TOGGLE_SITE_ALLOWLIST,
        hostname: currentHostname,
        allow: newAllowState,
      });
    }

    let updatedAllowlist: string[];
    if (newAllowState) {
      updatedAllowlist = Array.from(new Set([...settings.allowlist, currentHostname]));
    } else {
      updatedAllowlist = settings.allowlist.filter((d) => d.toLowerCase() !== currentHostname.toLowerCase());
    }

    const updated = await saveSettings({ allowlist: updatedAllowlist });
    setSettings(updated);
  };

  // Handle individual toggle switches
  const handleToggleFeature = async (key: keyof ExtensionSettings, value: boolean) => {
    if (!settings) return;
    const updated = await saveSettings({ [key]: value });
    setSettings(updated);
  };

  // Handle reset statistics
  const handleResetStats = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_STATISTICS });
    }
    await resetStats();
    await refreshData();
  };

  // Open full options/settings page
  const handleOpenSettings = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  // Cycle theme between light and dark
  const handleToggleTheme = async () => {
    if (!settings) return;
    const nextTheme = settings.theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    const updated = await saveSettings({ theme: nextTheme });
    setSettings(updated);
  };

  if (isLoading || !settings || !stats) {
    return (
      <div
        style={{
          width: '360px',
          height: '460px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        Initializing Personal AdBlock...
      </div>
    );
  }

  const isGloballyActive = settings.enabled;
  const isSitePaused = isHostnameAllowlisted(currentHostname, settings);
  const siteStat: SiteStats = (currentHostname && stats.siteStats[currentHostname]) || {
    blockedRequests: 0,
    elementsHidden: 0,
    redirectsBlocked: 0,
    popupsBlocked: 0,
  };

  return (
    <div
      style={{
        width: '370px',
        minHeight: '520px',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header */}
      <header
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isGloballyActive ? 'var(--accent-emerald-subtle)' : 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isGloballyActive ? 'var(--accent-emerald)' : 'var(--text-muted)',
            }}
          >
            {isGloballyActive ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              Personal AdBlock
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Badge variant={isGloballyActive ? 'success' : 'danger'} size="sm">
                {isGloballyActive ? 'Protected' : 'Disabled'}
              </Badge>
              {settings.stealthMode && (
                <Badge variant="info" size="sm">
                  Stealth
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleToggleTheme}
            title="Toggle Theme"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {settings.theme === THEMES.DARK ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <ToggleSwitch
            checked={isGloballyActive}
            onChange={handleToggleGlobalProtection}
            size="md"
          />
        </div>
      </header>

      {/* 2. Current Website Section */}
      <section
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: isSitePaused ? 'var(--accent-warning-subtle)' : 'var(--bg-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <Globe size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span
              title={currentHostname}
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '210px',
              }}
            >
              {currentHostname}
            </span>
          </div>

          {isSupportedPage ? (
            <Badge variant={isSitePaused ? 'warning' : isGloballyActive ? 'success' : 'neutral'} size="sm">
              {isSitePaused ? 'Paused' : isGloballyActive ? 'Filtering' : 'Inactive'}
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              System
            </Badge>
          )}
        </div>

        {isSupportedPage && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <Button
              variant={isSitePaused ? 'primary' : 'outline'}
              size="sm"
              fullWidth
              onClick={handleToggleSiteAllowlist}
              icon={isSitePaused ? <Zap size={14} /> : <Shield size={14} />}
            >
              {isSitePaused ? 'Resume on this site' : 'Pause on this site'}
            </Button>
          </div>
        )}
      </section>

      {/* 3. Blocking Statistics */}
      <section style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            PROTECTION METRICS
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Realtime recorded</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <StatCard
            title="Ads & Requests"
            value={siteStat.blockedRequests}
            icon={<Shield size={15} />}
            highlight={siteStat.blockedRequests > 0}
            subtitle="This site"
          />
          <StatCard
            title="Pop-ups & Tabs"
            value={stats.popupsBlocked}
            icon={<ExternalLink size={15} />}
            highlight={stats.popupsBlocked > 0}
            subtitle="Suppressed"
          />
          <StatCard
            title="Redirects Blocked"
            value={stats.redirectsBlocked}
            icon={<Zap size={15} />}
            highlight={stats.redirectsBlocked > 0}
            subtitle="Forced navigation"
          />
          <StatCard
            title="Clicks Protected"
            value={stats.clicksProtected}
            icon={<MousePointerClick size={15} />}
            highlight={stats.clicksProtected > 0}
            subtitle="Overlays disarmed"
          />
        </div>

        {/* Expandable Protection Quick Controls */}
        <div
          style={{
            marginTop: '4px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setShowAdvancedToggles(!showAdvancedToggles)}
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <span>Navigation & Redirect Controls</span>
            {showAdvancedToggles ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showAdvancedToggles && (
            <div
              style={{
                padding: '8px 12px 12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>Block Ad Redirects</span>
                <ToggleSwitch
                  checked={settings.blockAdRedirects}
                  onChange={(v) => handleToggleFeature('blockAdRedirects', v)}
                  size="sm"
                  disabled={!isGloballyActive}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>Block Pop-Ups & New Tabs</span>
                <ToggleSwitch
                  checked={settings.blockPopups}
                  onChange={(v) => handleToggleFeature('blockPopups', v)}
                  size="sm"
                  disabled={!isGloballyActive}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>Block Click-Triggered Redirects</span>
                <ToggleSwitch
                  checked={settings.blockClickRedirects}
                  onChange={(v) => handleToggleFeature('blockClickRedirects', v)}
                  size="sm"
                  disabled={!isGloballyActive}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>Block Tracking Redirects</span>
                <ToggleSwitch
                  checked={settings.blockTrackingRedirects}
                  onChange={(v) => handleToggleFeature('blockTrackingRedirects', v)}
                  size="sm"
                  disabled={!isGloballyActive}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>Strict Navigation Mode</span>
                <ToggleSwitch
                  checked={settings.strictNavigation}
                  onChange={(v) => handleToggleFeature('strictNavigation', v)}
                  size="sm"
                  disabled={!isGloballyActive}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>Anti-Adblock Stealth Defuser</span>
                <ToggleSwitch
                  checked={settings.stealthMode}
                  onChange={(v) => handleToggleFeature('stealthMode', v)}
                  size="sm"
                  disabled={!isGloballyActive}
                />
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Lifetime Total Blocked:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {(
              stats.totalBlockedRequests +
              stats.cosmeticElementsHidden +
              stats.redirectsBlocked +
              stats.popupsBlocked +
              stats.clicksProtected
            ).toLocaleString()}
          </span>
        </div>
      </section>

      {/* 4. Quick Actions / Footer */}
      <footer
        style={{
          marginTop: 'auto',
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={handleOpenSettings}
          icon={<Settings size={15} />}
        >
          All Settings
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetStats}
          title="Reset Statistics"
          icon={<RotateCcw size={14} />}
        >
          Reset
        </Button>
      </footer>
    </div>
  );
};
