# Personal AdBlock Chrome Extension

A lightweight, privacy-focused personal ad blocker and navigation defender built with **React, TypeScript, Vite, and Chrome Extension Manifest V3**.

Personal AdBlock blocks intrusive advertisements, tracking telemetry, annoying page overlays, clickjacking transparent layers, forced ad redirects, and deceptive pop-up/pop-under new tabs without sending your browsing activity to remote servers.

---

## Features

### 1. Network-Level Ad & Tracker Blocking
- Utilizes the native Chrome **`declarativeNetRequest`** engine to block ad and tracking requests inside Chrome's network stack before TCP connections are established.
- Pre-bundled with curated community rulesets:
  - **EasyList Primary Ads**: Blocks banners, video ads, pop-unders, and sponsored links.
  - **EasyPrivacy Trackers**: Blocks behavioral tracking beacons, fingerprinting scripts, and analytics.
  - **Annoyances & Redirects**: Blocks forced redirect gateways, anti-adblock traps, and pop-up networks.
- Supports remote filter list validation, error handling, and manual checking for updates.

### 2. Forced Redirect & Pop-Up Interception
- **Block Ad Redirects**: Intercepts automatic page navigation heading to known advertising and scam networks.
- **Block Pop-Ups & Pop-Under Tabs**: Intercepts unauthorized `window.open()` calls, timer-based tabs, and pop-unders spawned behind active tabs.
- **Clickjacking Protection**: Detects and neutralizes full-screen transparent overlays that hijack user clicks on video streaming, movie, and file download websites.
- **Meta-Refresh Defuser**: Automatically inspects and disarms `<meta http-equiv="refresh">` tags routing to ad networks.
- **Strict Navigation Mode**: An optional setting to prevent any third-party cross-origin new tab from opening unless explicitly allowed.

### 3. Cosmetic Filtering & Anti-Scroll Restoration
- Hides placeholder ad containers, sponsored post cards, and sticky video banners using passive CSS stylesheet injection.
- Dynamically identifies and dismisses promotional modal overlays (newsletter prompts, donation nag screens, fake download warnings).
- Restores page scrollability by neutralizing `overflow: hidden` restrictions left behind by dismissed modals.
- **Strict Safeguards**: Form elements with password inputs, credit card fields, shopping carts, checkout buttons, navigation bars, and video controls are strictly protected and never hidden.

### 4. Privacy & Zero-Telemetry Guarantee
- **100% Local Processing**: All rule matching, statistics, and domain allowlists run exclusively on your device.
- **Zero Telemetry**: No browsing history, URLs, or personal data are collected or sent to any remote server.
- Uses `chrome.storage.local` exclusively for settings persistence.

---

## Project Structure

```text
personal-adblocker/
├── public/
│   ├── manifest.json            # Manifest V3 extension configuration
│   ├── icons/                   # 16x16, 32x32, 48x48, 128x128 icons
│   ├── rules/                   # DeclarativeNetRequest static rulesets
│   │   ├── easylist.json        # Ad rules
│   │   ├── easyprivacy.json     # Tracker rules
│   │   └── annoyances.json      # Pop-up & redirect rules
│   └── test-page.html           # Verification page for test simulations
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Background DNR and webNavigation listener
│   ├── content/
│   │   ├── content-script.ts    # Content script entry point
│   │   ├── cosmetic-filter.ts   # Safe DOM banner and modal removal
│   │   └── redirect-popup-blocker.ts # Clickjacking and popup interception
│   ├── popup/
│   │   ├── App.tsx              # Quick-action popup UI
│   │   └── main.tsx
│   ├── options/
│   │   ├── OptionsApp.tsx       # Dedicated settings page
│   │   └── main.tsx
│   ├── rules/
│   │   ├── rule-manager.ts      # Dynamic DNR rule synchronization
│   │   └── filter-list-manager.ts # Rule parser and remote updater
│   ├── storage/
│   │   └── settings.ts          # Storage and stats management
│   ├── constants/
│   │   └── index.ts             # Central constants and configurations
│   ├── types/
│   │   └── index.ts             # TypeScript definitions
│   └── styles/
│       └── theme.css            # Dark/light theme styling tokens
├── tests/                       # Vitest unit test suites
├── dist/                        # Ready-to-load unpacked extension bundle
├── vite.config.ts               # Popup and Options Vite build config
├── vite.background.config.ts    # Background service worker build config
├── vite.content.config.ts       # Standalone IIFE content script build config
└── package.json
```

---

## Prerequisites & Installation

Ensure you have **Node.js** (v18 or higher) and **npm** installed.

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Type Checking

```bash
npm run typecheck
```

### 3. Run Unit Tests

Runs 26 unit tests covering rule parsing, allowlist precedence, cosmetic safeguards, statistics aggregation, and redirect/pop-up defenses:

```bash
npm run test
```

### 4. Build the Extension Bundle

Compiles the extension into the `dist/` directory:

```bash
npm run build
```

---

## Loading into Google Chrome

1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. In the top-right corner, switch the **Developer mode** toggle to **ON**.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `dist/` directory inside this project:
   ```text
   /path/to/tools/add-blocker extension/dist
   ```
5. Personal AdBlock is now loaded! You will see the shield icon appear in your Chrome toolbar.
6. (Optional) Pin the extension icon to your toolbar for easy access to the popup dashboard.

---

## Usage Guide

### Extension Popup
- Click the extension icon in the toolbar.
- **Global Toggle**: Turn protection ON or OFF with a single click.
- **Current Site Control**: Click **Pause on this site** or **Resume on this site** to instantly manage exceptions.
- **Live Metrics**: Displays actual recorded counts for network requests, hidden cosmetic elements, blocked redirects, and suppressed pop-ups.
- **Navigation Controls**: Expand the drawer to toggle redirect and click protection.

### Settings Page
- Click **All Settings** in the popup or right-click the extension icon and select **Options**.
- **General Protection**: Toggle network blocking, cosmetic filtering, and tracker telemetry defense.
- **Redirects & Pop-ups**: Configure ad redirect blocking, pop-up suppression, clickjacking overlay disarming, and optional Strict Navigation mode.
- **Filter Lists**: View bundled rulesets, enable/disable individual lists, or click **Check for Updates**.
- **Website Exceptions**: Add, search, or remove allowlisted websites.
- **Custom Rules**: Create custom domain or URL wildcard rules (e.g., `ads.custom.com` or `*tracker*`), complete with an interactive URL matching simulator.
- **Statistics**: Review lifetime blocking counts, breakdown metrics, and per-site logs.

---

## Troubleshooting

- **Extension updates or code modifications**:
  Run `npm run build` and click the **Reload (↺)** icon on the extension card at `chrome://extensions`.
- **A website requires ads or breaks layout**:
  Open the popup on that site and click **Pause on this site** to allowlist the domain.
- **Pop-up blocked unexpectedly on a banking or payment site**:
  Legitimate login and payment pages are protected by default. If a custom portal opens a new window, add the domain to your Website Exceptions list.

---

## Technical Constraints & Limitations

- **Manifest V3 Sandboxing**: Chrome extensions run within Chrome's security model. Certain navigations initiated directly by the browser chrome (e.g. bookmarks, address bar entries) or internal system URLs (`chrome://`) cannot be intercepted.
- **Website Layout Variations**: Web layouts continually change. While the cosmetic engine uses resilient selector heuristics and safe safeguards, rare custom implementations may require allowlisting.
- **Real Metrics**: Blocking statistics only reflect actual requests intercepted by the rules engine or cosmetic elements hidden by the content script; no metrics are fabricated.
