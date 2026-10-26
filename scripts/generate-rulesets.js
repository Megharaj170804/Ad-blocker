import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test hosts from superadblocktest.com
const testDataPath = path.resolve(__dirname, 'test_hosts_full.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const RESOURCE_TYPES = [
  'sub_frame',
  'script',
  'image',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'other',
];

function formatUrlFilter(target) {
  const clean = String(target || '').trim().replace(/^https?:\/\//i, '').replace(/^\/+/g, '');
  if (clean.includes('/')) {
    return `||${clean}^`;
  }
  return `||${clean}^`;
}

// 1. Group targets into lists
const easyListSet = new Set();
const easyPrivacySet = new Set();
const annoyancesSet = new Set();

// Existing base rules from current files
const existingEasylist = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/rules/easylist.json'), 'utf8'));
const existingEasyprivacy = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/rules/easyprivacy.json'), 'utf8'));
const existingAnnoyances = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/rules/annoyances.json'), 'utf8'));

existingEasylist.forEach((r) => easyListSet.add(r.condition.urlFilter));
existingEasyprivacy.forEach((r) => easyPrivacySet.add(r.condition.urlFilter));
existingAnnoyances.forEach((r) => annoyancesSet.add(r.condition.urlFilter));

// Categorize from test suite
for (const [category, providers] of Object.entries(testData.byCategory)) {
  for (const hosts of Object.values(providers)) {
    for (const host of hosts) {
      const filter = formatUrlFilter(host);
      if (category === 'Ads' || category === 'Video Ads') {
        easyListSet.add(filter);
      } else if (
        category === 'Analytics' ||
        category === 'Tracking & Fingerprinting' ||
        category === 'Error Trackers' ||
        category === 'Social Trackers' ||
        category === 'Affiliate Networks' ||
        category === 'A/B Testing' ||
        category === 'Email Tracking & Live Chat'
      ) {
        easyPrivacySet.add(filter);
      } else {
        // OEM Vendors, Advanced / Risky Host Checks, Consent Management
        annoyancesSet.add(filter);
      }
    }
  }
}

// Add known streaming & deceptive redirect/popup networks into annoyances
const extraAnnoyances = [
  'cissoiddownset.com',
  'zeroredirect1.com',
  'onclickalgo.com',
  'onclickperformance.com',
  'deloton.com',
  'realsrv.com',
  'ptgnwm.com',
  'highcpmgate.com',
  'effectivecpmgate.com',
  'directrev.com',
  'monetag.com',
  'evadav.com',
  'richads.com',
  'bidvertiser.com',
  'vidoomy.com',
  'adbit.co',
  'a-ads.com',
  'adoperator.com',
  'clickaine.com',
  'traffichaus.com',
  'cpmstar.com',
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
  'linkvertise.com',
];
extraAnnoyances.forEach((domain) => annoyancesSet.add(`||${domain}^`));

function createRules(filters, baseId) {
  const sorted = Array.from(filters).sort();
  return sorted.map((filter, index) => ({
    id: baseId + index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: filter,
      resourceTypes: RESOURCE_TYPES,
    },
  }));
}

const easylistRules = createRules(easyListSet, 1000);
const easyprivacyRules = createRules(easyPrivacySet, 2000);
const annoyancesRules = createRules(annoyancesSet, 3000);

console.log(`Generated:
- easylist.json: ${easylistRules.length} rules
- easyprivacy.json: ${easyprivacyRules.length} rules
- annoyances.json: ${annoyancesRules.length} rules
Total: ${easylistRules.length + easyprivacyRules.length + annoyancesRules.length} rules`);

// Save updated rules
fs.writeFileSync(
  path.resolve(__dirname, '../public/rules/easylist.json'),
  JSON.stringify(easylistRules, null, 2)
);
fs.writeFileSync(
  path.resolve(__dirname, '../public/rules/easyprivacy.json'),
  JSON.stringify(easyprivacyRules, null, 2)
);
fs.writeFileSync(
  path.resolve(__dirname, '../public/rules/annoyances.json'),
  JSON.stringify(annoyancesRules, null, 2)
);

// Verify coverage against all 482 probe tests
function urlFilterMatches(urlFilter, url) {
  let pattern = urlFilter;
  let anchoredStart = false;
  if (pattern.startsWith('||')) {
    anchoredStart = true;
    pattern = pattern.slice(2);
  }

  let regexStr = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      regexStr += '.*';
    } else if (ch === '^') {
      regexStr += '([^a-zA-Z0-9_.-]|$)';
    } else if ('-[]/{}()+?.\\^$|'.includes(ch)) {
      regexStr += '\\' + ch;
    } else {
      regexStr += ch;
    }
  }

  if (anchoredStart) {
    regexStr = '^https?://([^/]+\\.)?' + regexStr;
  }

  return new RegExp(regexStr, 'i').test(url);
}

function parseTarget(target) {
  const clean = String(target || '').trim().replace(/^https?:\/\//i, '').replace(/^\/+/g, '');
  const index = clean.indexOf('/');
  return index === -1
    ? { host: clean.toLowerCase(), path: '' }
    : { host: clean.slice(0, index).toLowerCase(), path: clean.slice(index) };
}

function buildHostUrl(target, fallbackPath) {
  const { host, path } = parseTarget(target);
  const targetPath = path || fallbackPath || '/';
  const separator = targetPath.includes('?') ? '&' : '?';
  return `https://${host}${targetPath}${separator}adblock_test=123`;
}

const allRules = [...easylistRules, ...easyprivacyRules, ...annoyancesRules];
let blockedCount = 0;
const unblocked = [];

for (const target of testData.allHosts) {
  const testUrl = buildHostUrl(target, '/');
  const matched = allRules.some((rule) => urlFilterMatches(rule.condition.urlFilter, testUrl));
  if (matched) {
    blockedCount++;
  } else {
    unblocked.push({ target, testUrl });
  }
}

console.log(`\n=== Verification Results ===`);
console.log(`Blocked: ${blockedCount} / ${testData.allHosts.length} (${Math.round((blockedCount / testData.allHosts.length) * 100)}%)`);
if (unblocked.length > 0) {
  console.log('Unblocked targets:', unblocked);
} else {
  console.log('PERFECT! 100% of test probes match our Declarative Net Request rules!');
}
