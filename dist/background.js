const R = {
  SETTINGS: "padb_settings",
  STATS: "padb_statistics",
  RULE_STATUS: "padb_rule_status"
}, u = {
  EASYLIST: "ruleset_easylist",
  EASYPRIVACY: "ruleset_easyprivacy",
  ANNOYANCES: "ruleset_annoyances"
}, p = {
  MAX_DYNAMIC_RULES: 5e3,
  ALLOWLIST_RULE_BASE_ID: 1e4,
  CUSTOM_BLOCK_RULE_BASE_ID: 2e4,
  DYNAMIC_DOWNLOAD_RULE_BASE_ID: 3e4,
  PRIORITY_NORMAL_BLOCK: 1,
  PRIORITY_CUSTOM_BLOCK: 2,
  PRIORITY_ALLOWLIST_EXCEPTION: 3
}, P = {
  FETCH_TIMEOUT_MS: 12e3,
  DEFAULT_MAX_RULES_PARSED: 2500
}, M = [
  "adsterra.com",
  "popads.net",
  "popcash.net",
  "propellerads.com",
  "exoclick.com",
  "clickadu.com",
  "adcash.com",
  "hilltopads.com",
  "yllix.com",
  "trafficjunky.com",
  "juicyads.com",
  "admaven.com",
  "revenuehits.com",
  "clicksor.com",
  "linkvertise.com",
  "adf.ly",
  "shorte.st",
  "ouo.io",
  "bc.vc",
  "ad-delivery.net",
  "syndication.exoclick.com",
  "serve.popads.net",
  "xml.popcash.net",
  "engine.phn.doublepimp.com",
  "delivery.trafficjunky.com",
  "zeroredirect1.com",
  "onclickalgo.com",
  "onclickperformance.com",
  "deloton.com",
  "realsrv.com",
  "ptgnwm.com",
  "ad-score.com",
  "onclkds.com",
  "highcpmgate.com",
  "effectivecpmgate.com",
  "directrev.com",
  "monetag.com",
  "evadav.com",
  "richads.com",
  "bidvertiser.com",
  "infolinks.com",
  "vidoomy.com",
  "adbit.co",
  "a-ads.com",
  "adoperator.com",
  "clickaine.com",
  "traffichaus.com",
  "cpmstar.com",
  "cissoiddownset.com",
  "vr.cissoiddownset.com"
], tt = [
  /[?&]utm_medium=(display|cpc|banner)/i,
  /[?&]utm_source=([^&]+)&utm_medium=display/i,
  /[?&](aff_id|clickid)=/i
], H = [
  "chatgpt.com",
  "openai.com",
  "oaistatic.com",
  "oaiusercontent.com",
  "anthropic.com",
  "claude.ai",
  "github.com",
  "accounts.google.com",
  "docs.google.com",
  "drive.google.com",
  "mail.google.com",
  "meet.google.com",
  "calendar.google.com",
  "microsoft.com",
  "apple.com"
];
function K(t) {
  if (!t) return !1;
  const e = t.trim().toLowerCase().replace(/^www\./, "");
  return H.some(
    (s) => e === s || e.endsWith(`.${s}`)
  );
}
const d = {
  GET_PAGE_STATUS: "GET_PAGE_STATUS",
  PAGE_STATUS_RESPONSE: "PAGE_STATUS_RESPONSE",
  TOGGLE_GLOBAL_PROTECTION: "TOGGLE_GLOBAL_PROTECTION",
  TOGGLE_SITE_ALLOWLIST: "TOGGLE_SITE_ALLOWLIST",
  REPORT_COSMETIC_BLOCKED: "REPORT_COSMETIC_BLOCKED",
  REPORT_REDIRECT_BLOCKED: "REPORT_REDIRECT_BLOCKED",
  REPORT_POPUP_BLOCKED: "REPORT_POPUP_BLOCKED",
  REPORT_CLICK_PROTECTED: "REPORT_CLICK_PROTECTED",
  REPORT_STEALTH_DEFUSED: "REPORT_STEALTH_DEFUSED",
  RESET_STATISTICS: "RESET_STATISTICS",
  UPDATE_FILTER_LIST: "UPDATE_FILTER_LIST",
  TEST_RULE_SIMULATION: "TEST_RULE_SIMULATION"
}, et = [
  {
    id: u.EASYLIST,
    name: "EasyList Primary Ads",
    description: "Blocks common web advertising, video banners, pop-unders, and sponsored links.",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt",
    category: "ads",
    enabled: !0
  },
  {
    id: u.EASYPRIVACY,
    name: "EasyPrivacy Trackers",
    description: "Blocks behavioral tracking, telemetry beacons, and fingerprinting scripts.",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easyprivacy/easyprivacy_general.txt",
    category: "privacy",
    enabled: !0
  },
  {
    id: u.ANNOYANCES,
    name: "Annoyances & Overlays",
    description: "Blocks newsletter prompts, anti-adblock dialogs, and intrusive full-page overlays.",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/fanboy-addon/fanboy-annoyance.txt",
    category: "annoyances",
    enabled: !0
  }
], st = {
  SYSTEM: "system"
}, F = {
  enabled: !0,
  networkFilteringEnabled: !0,
  cosmeticFilteringEnabled: !0,
  trackerBlockingEnabled: !0,
  blockAdRedirects: !0,
  blockPopups: !0,
  blockClickRedirects: !0,
  blockTrackingRedirects: !0,
  strictNavigation: !1,
  stealthMode: !0,
  allowlist: [],
  customRules: [],
  enabledLists: [
    u.EASYLIST,
    u.EASYPRIVACY,
    u.ANNOYANCES
  ],
  theme: st.SYSTEM
}, D = {
  totalBlockedRequests: 0,
  sessionBlockedRequests: 0,
  trackersBlocked: 0,
  cosmeticElementsHidden: 0,
  redirectsBlocked: 0,
  popupsBlocked: 0,
  clicksProtected: 0,
  antiAdblockDefused: 0,
  siteStats: {}
}, at = et.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  url: t.url,
  category: t.category,
  enabled: t.enabled,
  ruleCount: 0,
  lastUpdated: null,
  lastUpdateStatus: "idle"
}));
let B = {};
function X() {
  var t;
  return typeof chrome < "u" && !!((t = chrome.storage) != null && t.local);
}
async function U(t, e) {
  if (X())
    try {
      return (await chrome.storage.local.get(t))[t] ?? e;
    } catch {
      return e;
    }
  return B[t] ?? e;
}
async function L(t, e) {
  if (X()) {
    try {
      await chrome.storage.local.set({ [t]: e });
    } catch {
      B[t] = e;
    }
    return;
  }
  B[t] = e;
}
async function m() {
  const t = await U(R.SETTINGS, F);
  return { ...F, ...t };
}
async function Y(t) {
  const s = { ...await m(), ...t };
  return await L(R.SETTINGS, s), s;
}
async function I() {
  const t = await U(R.STATS, D);
  return { ...D, ...t, siteStats: t.siteStats ?? {} };
}
async function ot() {
  await L(R.STATS, D);
}
async function T(t, e, s = 1) {
  const o = await I(), a = e == null ? void 0 : e.trim().toLowerCase(), c = { ...o.siteStats };
  if (a) {
    const i = c[a] ?? {
      blockedRequests: 0,
      elementsHidden: 0,
      redirectsBlocked: 0,
      popupsBlocked: 0,
      antiAdblockDefused: 0
    };
    c[a] = {
      blockedRequests: t === "cosmetic" ? i.blockedRequests : i.blockedRequests + s,
      elementsHidden: t === "cosmetic" ? i.elementsHidden + s : i.elementsHidden,
      redirectsBlocked: t === "redirect" ? (i.redirectsBlocked ?? 0) + s : i.redirectsBlocked ?? 0,
      popupsBlocked: t === "popup" ? (i.popupsBlocked ?? 0) + s : i.popupsBlocked ?? 0,
      antiAdblockDefused: t === "stealth" ? (i.antiAdblockDefused ?? 0) + s : i.antiAdblockDefused ?? 0
    };
  }
  const r = t === "network" || t === "tracker" || t === "redirect", n = {
    totalBlockedRequests: r ? o.totalBlockedRequests + s : o.totalBlockedRequests,
    sessionBlockedRequests: r ? o.sessionBlockedRequests + s : o.sessionBlockedRequests,
    trackersBlocked: t === "tracker" ? o.trackersBlocked + s : o.trackersBlocked,
    cosmeticElementsHidden: t === "cosmetic" ? o.cosmeticElementsHidden + s : o.cosmeticElementsHidden,
    redirectsBlocked: t === "redirect" ? o.redirectsBlocked + s : o.redirectsBlocked,
    popupsBlocked: t === "popup" ? o.popupsBlocked + s : o.popupsBlocked,
    clicksProtected: t === "click" ? o.clicksProtected + s : o.clicksProtected,
    antiAdblockDefused: t === "stealth" ? o.antiAdblockDefused + s : o.antiAdblockDefused,
    siteStats: c
  };
  await L(R.STATS, n);
}
async function $() {
  return await U(R.RULE_STATUS, at);
}
async function ct(t) {
  await L(R.RULE_STATUS, t);
}
async function C(t, e) {
  const o = (await $()).map((a) => a.id === t ? { ...a, ...e } : a);
  await ct(o);
}
function A(t, e) {
  if (!t || !e.allowlist || e.allowlist.length === 0)
    return !1;
  const s = t.trim().toLowerCase().replace(/^www\./, "");
  return e.allowlist.some((o) => {
    const a = o.trim().toLowerCase().replace(/^www\./, "");
    return s === a || s.endsWith(`.${a}`);
  });
}
function rt(t) {
  let e = t.trim().toLowerCase();
  return e = e.replace(/^https?:\/\//i, ""), e = e.split("/")[0], e = e.split("?")[0], e = e.split("#")[0], e = e.split(":")[0], e = e.replace(/^www\./, ""), e;
}
function it(t, e = p.DYNAMIC_DOWNLOAD_RULE_BASE_ID, s = P.DEFAULT_MAX_RULES_PARSED) {
  var r, n;
  const o = t.split(/\r?\n/), a = [];
  let c = e;
  for (const i of o) {
    if (a.length >= s) break;
    const l = i.trim();
    if (!l || l.startsWith("!") || l.startsWith("[Adblock") || l.startsWith("(") || l.includes("##") || l.includes("#@#") || l.includes("#?#"))
      continue;
    const S = l.startsWith("@@"), N = (S ? l.slice(2) : l).split("$"), f = ((r = N[0]) == null ? void 0 : r.trim()) || "", v = ((n = N[1]) == null ? void 0 : n.trim()) || "";
    if (!f || f.startsWith("/") && f.endsWith("/"))
      continue;
    const w = [];
    let h;
    const O = [], g = [];
    if (v) {
      const J = v.split(",");
      for (const Q of J) {
        const E = Q.trim().toLowerCase();
        if (E === "script") w.push("script");
        else if (E === "image") w.push("image");
        else if (E === "xmlhttprequest" || E === "xhr") w.push("xmlhttprequest");
        else if (E === "subdocument") w.push("sub_frame");
        else if (E === "third-party") h = !0;
        else if (E === "~third-party") h = !1;
        else if (E.startsWith("domain=")) {
          const Z = E.slice(7).split("|");
          for (const y of Z)
            y.startsWith("~") ? g.push(y.slice(1)) : O.push(y);
        }
      }
    }
    const V = w.length > 0 ? w : [
      "sub_frame",
      "script",
      "image",
      "xmlhttprequest",
      "ping",
      "media",
      "other"
    ], z = {
      id: c++,
      priority: S ? p.PRIORITY_ALLOWLIST_EXCEPTION : p.PRIORITY_NORMAL_BLOCK,
      action: {
        type: S ? "allow" : "block"
      },
      condition: {
        urlFilter: f,
        resourceTypes: V,
        ...O.length > 0 ? { domains: O } : {},
        ...g.length > 0 ? { excludedDomains: g } : {},
        ...h !== void 0 ? { domainType: h ? "thirdParty" : "firstParty" } : {}
      }
    };
    a.push(z);
  }
  return a;
}
async function nt(t, e = p.DYNAMIC_DOWNLOAD_RULE_BASE_ID, s = P.DEFAULT_MAX_RULES_PARSED) {
  const o = new AbortController(), a = setTimeout(() => o.abort(), P.FETCH_TIMEOUT_MS);
  try {
    const c = await fetch(t, {
      signal: o.signal,
      headers: {
        Accept: "text/plain, text/x-adblock, application/octet-stream, */*"
      }
    });
    if (clearTimeout(a), !c.ok)
      return {
        success: !1,
        rules: [],
        ruleCount: 0,
        error: `HTTP Error: ${c.status} ${c.statusText}`
      };
    const r = await c.text();
    if (!r || r.trim().length === 0)
      return {
        success: !1,
        rules: [],
        ruleCount: 0,
        error: "Received empty response from filter list server"
      };
    const n = it(r, e, s);
    return {
      success: !0,
      rules: n,
      ruleCount: n.length
    };
  } catch (c) {
    clearTimeout(a);
    const r = c instanceof Error ? c.message : "Unknown network failure";
    return {
      success: !1,
      rules: [],
      ruleCount: 0,
      error: r
    };
  }
}
function lt() {
  return typeof chrome < "u" && !!chrome.declarativeNetRequest;
}
function dt(t) {
  return t.map((e, s) => {
    const o = rt(e);
    return {
      id: p.ALLOWLIST_RULE_BASE_ID + s,
      priority: p.PRIORITY_ALLOWLIST_EXCEPTION,
      action: {
        type: "allowAllRequests"
      },
      condition: {
        initiatorDomains: [o],
        resourceTypes: [
          "main_frame",
          "sub_frame"
        ]
      }
    };
  });
}
function ut(t) {
  return t.filter((e) => e.enabled).map((e, s) => {
    const o = e.action === "allow", a = e.pattern.trim(), c = a.includes("/") || a.includes("*") || a.includes("^") ? a : `||${a}^`;
    return {
      id: p.CUSTOM_BLOCK_RULE_BASE_ID + s,
      priority: o ? p.PRIORITY_ALLOWLIST_EXCEPTION : p.PRIORITY_CUSTOM_BLOCK,
      action: {
        type: o ? "allow" : "block"
      },
      condition: {
        urlFilter: c,
        resourceTypes: [
          "sub_frame",
          "script",
          "image",
          "xmlhttprequest",
          "ping",
          "media",
          "other"
        ]
      }
    };
  });
}
async function k(t) {
  if (lt())
    try {
      const e = t.enabled && t.networkFilteringEnabled, s = [
        u.EASYLIST,
        u.EASYPRIVACY,
        u.ANNOYANCES
      ];
      if (!e)
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: s
        });
      else {
        const l = [], S = [];
        for (const _ of s) {
          if (_ === u.EASYPRIVACY && !t.trackerBlockingEnabled) {
            S.push(_);
            continue;
          }
          t.enabledLists.includes(_) ? l.push(_) : S.push(_);
        }
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: l,
          disableRulesetIds: S
        });
      }
      const a = (await chrome.declarativeNetRequest.getDynamicRules()).map((l) => l.id);
      if (!e) {
        a.length > 0 && await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: a
        });
        return;
      }
      const c = Array.from(/* @__PURE__ */ new Set([...t.allowlist, ...H])), r = dt(c), n = ut(t.customRules), i = [...r, ...n].slice(0, p.MAX_DYNAMIC_RULES);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: a,
        addRules: i
      });
    } catch (e) {
      const s = e instanceof Error ? e.message : "Unknown DNR error";
      throw new Error(`Failed to update declarative blocking rules: ${s}`);
    }
}
function j(t) {
  if (!t || typeof t != "string") return !1;
  const e = t.trim().toLowerCase();
  if (e.startsWith("#") || e.startsWith("javascript:void") || e === "about:blank")
    return !1;
  if (tt.some((s) => s.test(e)))
    return !0;
  try {
    const o = new URL(e.startsWith("http") ? e : `https://${e}`).hostname.replace(/^www\./, "");
    return M.some((a) => o === a || o.endsWith(`.${a}`));
  } catch {
    return M.some((s) => e.includes(s));
  }
}
async function b(t, e) {
  try {
    const s = await m();
    if (!s.enabled) {
      await chrome.action.setBadgeText({ text: "OFF", tabId: t }), await chrome.action.setBadgeBackgroundColor({ color: "#6b7280", tabId: t });
      return;
    }
    if (e && A(e, s)) {
      await chrome.action.setBadgeText({ text: "PAUSE", tabId: t }), await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId: t });
      return;
    }
    const o = await I(), a = e && o.siteStats[e] ? o.siteStats[e].blockedRequests + o.siteStats[e].elementsHidden + (o.siteStats[e].redirectsBlocked ?? 0) + (o.siteStats[e].popupsBlocked ?? 0) : 0, c = a > 0 ? a > 999 ? "999+" : String(a) : "ON";
    await chrome.action.setBadgeText({ text: c, tabId: t }), await chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: t });
  } catch {
  }
}
async function G() {
  const t = await m(), e = await I(), s = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const o of s)
    if (!(!o.id || !o.url))
      try {
        const c = new URL(o.url).hostname, r = A(c, t), n = e.siteStats[c] ?? {
          blockedRequests: 0,
          elementsHidden: 0,
          redirectsBlocked: 0,
          popupsBlocked: 0,
          antiAdblockDefused: 0
        }, i = {
          hostname: c,
          isGloballyEnabled: t.enabled,
          isSiteAllowlisted: r,
          cosmeticEnabled: t.cosmeticFilteringEnabled,
          networkEnabled: t.networkFilteringEnabled,
          trackerEnabled: t.trackerBlockingEnabled,
          blockAdRedirects: t.blockAdRedirects,
          blockPopups: t.blockPopups,
          blockClickRedirects: t.blockClickRedirects,
          blockTrackingRedirects: t.blockTrackingRedirects,
          strictNavigation: t.strictNavigation,
          stealthMode: t.stealthMode,
          siteStats: n
        };
        await chrome.tabs.sendMessage(o.id, {
          type: d.PAGE_STATUS_RESPONSE,
          payload: i
        }), await b(o.id, c);
      } catch {
      }
}
chrome.runtime.onInstalled.addListener(async () => {
  const t = await m();
  await k(t), await b();
});
chrome.runtime.onStartup.addListener(async () => {
  const t = await m();
  await k(t), await b();
});
chrome.tabs.onActivated.addListener(async (t) => {
  try {
    const e = await chrome.tabs.get(t.tabId);
    if (e.url && e.url.startsWith("http")) {
      const s = new URL(e.url).hostname;
      await b(t.tabId, s);
    }
  } catch {
  }
});
chrome.tabs.onUpdated.addListener(async (t, e, s) => {
  if (e.status === "complete" && s.url && s.url.startsWith("http")) {
    const o = new URL(s.url).hostname;
    await b(t, o);
  }
});
var q;
(q = chrome.declarativeNetRequest) != null && q.onRuleMatchedDebug && chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (t) => {
  try {
    const e = t.request.initiator;
    let s = "";
    if (e)
      try {
        s = new URL(e).hostname;
      } catch {
      }
    const o = t.rule.rulesetId === u.EASYPRIVACY;
    await T(o ? "tracker" : "network", s, 1), t.request.tabId && t.request.tabId > 0 && s && await b(t.request.tabId, s);
  } catch {
  }
});
var x;
(x = chrome.webNavigation) != null && x.onCreatedNavigationTarget && chrome.webNavigation.onCreatedNavigationTarget.addListener(async (t) => {
  try {
    const e = await m();
    if (!e.enabled || !e.blockPopups) return;
    const s = t.url;
    if (j(s)) {
      const o = new URL(s).hostname;
      !A(o, e) && !K(o) && (await chrome.tabs.remove(t.tabId), await T("popup", o, 1));
    }
  } catch {
  }
});
var W;
(W = chrome.webNavigation) != null && W.onBeforeNavigate && chrome.webNavigation.onBeforeNavigate.addListener(async (t) => {
  if (t.frameId === 0)
    try {
      const e = await m();
      if (!e.enabled || !e.blockAdRedirects) return;
      const s = t.url;
      if (j(s)) {
        const a = new URL(s).hostname;
        if (!A(a, e) && !K(a)) {
          await T("redirect", a, 1);
          try {
            (await chrome.tabs.get(t.tabId)).openerTabId && await chrome.tabs.remove(t.tabId);
          } catch {
          }
        }
      }
    } catch {
    }
});
chrome.runtime.onMessage.addListener((t, e, s) => !t || !t.type ? !1 : ((async () => {
  var o;
  switch (t.type) {
    case d.GET_PAGE_STATUS: {
      const a = await m(), c = await I(), r = t.hostname || "", n = A(r, a), i = c.siteStats[r] ?? {
        blockedRequests: 0,
        elementsHidden: 0,
        redirectsBlocked: 0,
        popupsBlocked: 0,
        antiAdblockDefused: 0
      }, l = {
        hostname: r,
        isGloballyEnabled: a.enabled,
        isSiteAllowlisted: n,
        cosmeticEnabled: a.cosmeticFilteringEnabled,
        networkEnabled: a.networkFilteringEnabled,
        trackerEnabled: a.trackerBlockingEnabled,
        blockAdRedirects: a.blockAdRedirects,
        blockPopups: a.blockPopups,
        blockClickRedirects: a.blockClickRedirects,
        blockTrackingRedirects: a.blockTrackingRedirects,
        strictNavigation: a.strictNavigation,
        stealthMode: a.stealthMode,
        siteStats: i
      };
      s({ payload: l });
      break;
    }
    case d.TOGGLE_GLOBAL_PROTECTION: {
      const a = await m(), c = typeof t.enabled == "boolean" ? t.enabled : !a.enabled, r = await Y({ enabled: c });
      await k(r), await G(), s({ success: !0, enabled: c });
      break;
    }
    case d.TOGGLE_SITE_ALLOWLIST: {
      const a = await m(), c = (o = t.hostname) == null ? void 0 : o.trim().toLowerCase();
      if (!c) {
        s({ success: !1, error: "Invalid hostname" });
        return;
      }
      let r;
      t.allow ? r = Array.from(/* @__PURE__ */ new Set([...a.allowlist, c])) : r = a.allowlist.filter((i) => i.toLowerCase() !== c);
      const n = await Y({ allowlist: r });
      await k(n), await G(), s({ success: !0, allowlist: r });
      break;
    }
    case d.REPORT_COSMETIC_BLOCKED: {
      const a = typeof t.count == "number" ? t.count : 1;
      await T("cosmetic", t.hostname, a), s({ success: !0 });
      break;
    }
    case d.REPORT_REDIRECT_BLOCKED: {
      await T("redirect", t.hostname, 1), s({ success: !0 });
      break;
    }
    case d.REPORT_POPUP_BLOCKED: {
      await T("popup", t.hostname, 1), s({ success: !0 });
      break;
    }
    case d.REPORT_CLICK_PROTECTED: {
      await T("click", t.hostname, 1), s({ success: !0 });
      break;
    }
    case d.REPORT_STEALTH_DEFUSED: {
      await T("stealth", t.hostname, 1), s({ success: !0 });
      break;
    }
    case d.RESET_STATISTICS: {
      await ot(), await b(), s({ success: !0 });
      break;
    }
    case d.UPDATE_FILTER_LIST: {
      const a = t.listId, r = (await $()).find((i) => i.id === a);
      if (!r) {
        s({ success: !1, error: "Filter list not found" });
        return;
      }
      await C(a, { lastUpdateStatus: "updating" });
      const n = await nt(r.url);
      if (n.success) {
        await C(a, {
          lastUpdateStatus: "success",
          lastUpdated: Date.now(),
          ruleCount: n.ruleCount,
          lastErrorMessage: void 0
        });
        const i = await m();
        await k(i), s({ success: !0, ruleCount: n.ruleCount });
      } else
        await C(a, {
          lastUpdateStatus: "error",
          lastErrorMessage: n.error
        }), s({ success: !1, error: n.error });
      break;
    }
    default:
      s({ success: !1, error: "Unsupported message type" });
  }
})(), !0));
