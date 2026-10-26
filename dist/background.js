const S = {
  SETTINGS: "padb_settings",
  STATS: "padb_statistics",
  RULE_STATUS: "padb_rule_status"
}, m = {
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
}, g = {
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
], J = [
  /[?&]utm_medium=(display|cpc|banner|affiliate)/i,
  /[?&]utm_source=([^&]+)&utm_medium=display/i,
  /[?&](aff_id|affid|clickid|ad_id|adid|gclid|fbclid)=/i
], u = {
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
}, Q = [
  {
    id: m.EASYLIST,
    name: "EasyList Primary Ads",
    description: "Blocks common web advertising, video banners, pop-unders, and sponsored links.",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt",
    category: "ads",
    enabled: !0
  },
  {
    id: m.EASYPRIVACY,
    name: "EasyPrivacy Trackers",
    description: "Blocks behavioral tracking, telemetry beacons, and fingerprinting scripts.",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/easyprivacy/easyprivacy_general.txt",
    category: "privacy",
    enabled: !0
  },
  {
    id: m.ANNOYANCES,
    name: "Annoyances & Overlays",
    description: "Blocks newsletter prompts, anti-adblock dialogs, and intrusive full-page overlays.",
    url: "https://raw.githubusercontent.com/easylist/easylist/master/fanboy-addon/fanboy-annoyance.txt",
    category: "annoyances",
    enabled: !0
  }
], Z = {
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
    m.EASYLIST,
    m.EASYPRIVACY,
    m.ANNOYANCES
  ],
  theme: Z.SYSTEM
}, P = {
  totalBlockedRequests: 0,
  sessionBlockedRequests: 0,
  trackersBlocked: 0,
  cosmeticElementsHidden: 0,
  redirectsBlocked: 0,
  popupsBlocked: 0,
  clicksProtected: 0,
  antiAdblockDefused: 0,
  siteStats: {}
}, tt = Q.map((t) => ({
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
function H() {
  var t;
  return typeof chrome < "u" && !!((t = chrome.storage) != null && t.local);
}
async function D(t, e) {
  if (H())
    try {
      return (await chrome.storage.local.get(t))[t] ?? e;
    } catch {
      return e;
    }
  return B[t] ?? e;
}
async function h(t, e) {
  if (H()) {
    try {
      await chrome.storage.local.set({ [t]: e });
    } catch {
      B[t] = e;
    }
    return;
  }
  B[t] = e;
}
async function d() {
  const t = await D(S.SETTINGS, F);
  return { ...F, ...t };
}
async function Y(t) {
  const s = { ...await d(), ...t };
  return await h(S.SETTINGS, s), s;
}
async function L() {
  const t = await D(S.STATS, P);
  return { ...P, ...t, siteStats: t.siteStats ?? {} };
}
async function et() {
  await h(S.STATS, P);
}
async function b(t, e, s = 1) {
  const r = await L(), a = e == null ? void 0 : e.trim().toLowerCase(), i = { ...r.siteStats };
  if (a) {
    const o = i[a] ?? {
      blockedRequests: 0,
      elementsHidden: 0,
      redirectsBlocked: 0,
      popupsBlocked: 0,
      antiAdblockDefused: 0
    };
    i[a] = {
      blockedRequests: t === "cosmetic" ? o.blockedRequests : o.blockedRequests + s,
      elementsHidden: t === "cosmetic" ? o.elementsHidden + s : o.elementsHidden,
      redirectsBlocked: t === "redirect" ? (o.redirectsBlocked ?? 0) + s : o.redirectsBlocked ?? 0,
      popupsBlocked: t === "popup" ? (o.popupsBlocked ?? 0) + s : o.popupsBlocked ?? 0,
      antiAdblockDefused: t === "stealth" ? (o.antiAdblockDefused ?? 0) + s : o.antiAdblockDefused ?? 0
    };
  }
  const c = t === "network" || t === "tracker" || t === "redirect", n = {
    totalBlockedRequests: c ? r.totalBlockedRequests + s : r.totalBlockedRequests,
    sessionBlockedRequests: c ? r.sessionBlockedRequests + s : r.sessionBlockedRequests,
    trackersBlocked: t === "tracker" ? r.trackersBlocked + s : r.trackersBlocked,
    cosmeticElementsHidden: t === "cosmetic" ? r.cosmeticElementsHidden + s : r.cosmeticElementsHidden,
    redirectsBlocked: t === "redirect" ? r.redirectsBlocked + s : r.redirectsBlocked,
    popupsBlocked: t === "popup" ? r.popupsBlocked + s : r.popupsBlocked,
    clicksProtected: t === "click" ? r.clicksProtected + s : r.clicksProtected,
    antiAdblockDefused: t === "stealth" ? r.antiAdblockDefused + s : r.antiAdblockDefused,
    siteStats: i
  };
  await h(S.STATS, n);
}
async function K() {
  return await D(S.RULE_STATUS, tt);
}
async function st(t) {
  await h(S.RULE_STATUS, t);
}
async function C(t, e) {
  const r = (await K()).map((a) => a.id === t ? { ...a, ...e } : a);
  await st(r);
}
function k(t, e) {
  if (!t || !e.allowlist || e.allowlist.length === 0)
    return !1;
  const s = t.trim().toLowerCase().replace(/^www\./, "");
  return e.allowlist.some((r) => {
    const a = r.trim().toLowerCase().replace(/^www\./, "");
    return s === a || s.endsWith(`.${a}`);
  });
}
function at(t) {
  let e = t.trim().toLowerCase();
  return e = e.replace(/^https?:\/\//i, ""), e = e.split("/")[0], e = e.split("?")[0], e = e.split("#")[0], e = e.split(":")[0], e = e.replace(/^www\./, ""), e;
}
function rt(t, e = p.DYNAMIC_DOWNLOAD_RULE_BASE_ID, s = g.DEFAULT_MAX_RULES_PARSED) {
  var c, n;
  const r = t.split(/\r?\n/), a = [];
  let i = e;
  for (const o of r) {
    if (a.length >= s) break;
    const l = o.trim();
    if (!l || l.startsWith("!") || l.startsWith("[Adblock") || l.startsWith("(") || l.includes("##") || l.includes("#@#") || l.includes("#?#"))
      continue;
    const E = l.startsWith("@@"), N = (E ? l.slice(2) : l).split("$"), f = ((c = N[0]) == null ? void 0 : c.trim()) || "", v = ((n = N[1]) == null ? void 0 : n.trim()) || "";
    if (!f || f.startsWith("/") && f.endsWith("/"))
      continue;
    const _ = [];
    let A;
    const I = [], O = [];
    if (v) {
      const $ = v.split(",");
      for (const V of $) {
        const T = V.trim().toLowerCase();
        if (T === "script") _.push("script");
        else if (T === "image") _.push("image");
        else if (T === "xmlhttprequest" || T === "xhr") _.push("xmlhttprequest");
        else if (T === "subdocument") _.push("sub_frame");
        else if (T === "third-party") A = !0;
        else if (T === "~third-party") A = !1;
        else if (T.startsWith("domain=")) {
          const z = T.slice(7).split("|");
          for (const y of z)
            y.startsWith("~") ? O.push(y.slice(1)) : I.push(y);
        }
      }
    }
    const j = _.length > 0 ? _ : [
      "sub_frame",
      "script",
      "image",
      "xmlhttprequest",
      "ping",
      "media",
      "other"
    ], X = {
      id: i++,
      priority: E ? p.PRIORITY_ALLOWLIST_EXCEPTION : p.PRIORITY_NORMAL_BLOCK,
      action: {
        type: E ? "allow" : "block"
      },
      condition: {
        urlFilter: f,
        resourceTypes: j,
        ...I.length > 0 ? { domains: I } : {},
        ...O.length > 0 ? { excludedDomains: O } : {},
        ...A !== void 0 ? { domainType: A ? "thirdParty" : "firstParty" } : {}
      }
    };
    a.push(X);
  }
  return a;
}
async function it(t, e = p.DYNAMIC_DOWNLOAD_RULE_BASE_ID, s = g.DEFAULT_MAX_RULES_PARSED) {
  const r = new AbortController(), a = setTimeout(() => r.abort(), g.FETCH_TIMEOUT_MS);
  try {
    const i = await fetch(t, {
      signal: r.signal,
      headers: {
        Accept: "text/plain, text/x-adblock, application/octet-stream, */*"
      }
    });
    if (clearTimeout(a), !i.ok)
      return {
        success: !1,
        rules: [],
        ruleCount: 0,
        error: `HTTP Error: ${i.status} ${i.statusText}`
      };
    const c = await i.text();
    if (!c || c.trim().length === 0)
      return {
        success: !1,
        rules: [],
        ruleCount: 0,
        error: "Received empty response from filter list server"
      };
    const n = rt(c, e, s);
    return {
      success: !0,
      rules: n,
      ruleCount: n.length
    };
  } catch (i) {
    clearTimeout(a);
    const c = i instanceof Error ? i.message : "Unknown network failure";
    return {
      success: !1,
      rules: [],
      ruleCount: 0,
      error: c
    };
  }
}
function ct() {
  return typeof chrome < "u" && !!chrome.declarativeNetRequest;
}
function ot(t) {
  return t.map((e, s) => {
    const r = at(e);
    return {
      id: p.ALLOWLIST_RULE_BASE_ID + s,
      priority: p.PRIORITY_ALLOWLIST_EXCEPTION,
      action: {
        type: "allowAllRequests"
      },
      condition: {
        initiatorDomains: [r],
        resourceTypes: [
          "main_frame",
          "sub_frame"
        ]
      }
    };
  });
}
function nt(t) {
  return t.filter((e) => e.enabled).map((e, s) => {
    const r = e.action === "allow", a = e.pattern.trim(), i = a.includes("/") || a.includes("*") || a.includes("^") ? a : `||${a}^`;
    return {
      id: p.CUSTOM_BLOCK_RULE_BASE_ID + s,
      priority: r ? p.PRIORITY_ALLOWLIST_EXCEPTION : p.PRIORITY_CUSTOM_BLOCK,
      action: {
        type: r ? "allow" : "block"
      },
      condition: {
        urlFilter: i,
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
async function w(t) {
  if (ct())
    try {
      const e = t.enabled && t.networkFilteringEnabled, s = [
        m.EASYLIST,
        m.EASYPRIVACY,
        m.ANNOYANCES
      ];
      if (!e)
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: s
        });
      else {
        const o = [], l = [];
        for (const E of s) {
          if (E === m.EASYPRIVACY && !t.trackerBlockingEnabled) {
            l.push(E);
            continue;
          }
          t.enabledLists.includes(E) ? o.push(E) : l.push(E);
        }
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: o,
          disableRulesetIds: l
        });
      }
      const a = (await chrome.declarativeNetRequest.getDynamicRules()).map((o) => o.id);
      if (!e) {
        a.length > 0 && await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: a
        });
        return;
      }
      const i = ot(t.allowlist), c = nt(t.customRules), n = [...i, ...c].slice(0, p.MAX_DYNAMIC_RULES);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: a,
        addRules: n
      });
    } catch (e) {
      const s = e instanceof Error ? e.message : "Unknown DNR error";
      throw new Error(`Failed to update declarative blocking rules: ${s}`);
    }
}
function U(t) {
  if (!t || typeof t != "string") return !1;
  const e = t.trim().toLowerCase();
  if (e.startsWith("#") || e.startsWith("javascript:void") || e === "about:blank")
    return !1;
  if (J.some((s) => s.test(e)))
    return !0;
  try {
    const r = new URL(e.startsWith("http") ? e : `https://${e}`).hostname.replace(/^www\./, "");
    return M.some((a) => r === a || r.endsWith(`.${a}`));
  } catch {
    return M.some((s) => e.includes(s));
  }
}
async function R(t, e) {
  try {
    const s = await d();
    if (!s.enabled) {
      await chrome.action.setBadgeText({ text: "OFF", tabId: t }), await chrome.action.setBadgeBackgroundColor({ color: "#6b7280", tabId: t });
      return;
    }
    if (e && k(e, s)) {
      await chrome.action.setBadgeText({ text: "PAUSE", tabId: t }), await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId: t });
      return;
    }
    const r = await L(), a = e && r.siteStats[e] ? r.siteStats[e].blockedRequests + r.siteStats[e].elementsHidden + (r.siteStats[e].redirectsBlocked ?? 0) + (r.siteStats[e].popupsBlocked ?? 0) : 0, i = a > 0 ? a > 999 ? "999+" : String(a) : "ON";
    await chrome.action.setBadgeText({ text: i, tabId: t }), await chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: t });
  } catch {
  }
}
async function G() {
  const t = await d(), e = await L(), s = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const r of s)
    if (!(!r.id || !r.url))
      try {
        const i = new URL(r.url).hostname, c = k(i, t), n = e.siteStats[i] ?? {
          blockedRequests: 0,
          elementsHidden: 0,
          redirectsBlocked: 0,
          popupsBlocked: 0,
          antiAdblockDefused: 0
        }, o = {
          hostname: i,
          isGloballyEnabled: t.enabled,
          isSiteAllowlisted: c,
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
        await chrome.tabs.sendMessage(r.id, {
          type: u.PAGE_STATUS_RESPONSE,
          payload: o
        }), await R(r.id, i);
      } catch {
      }
}
chrome.runtime.onInstalled.addListener(async () => {
  const t = await d();
  await w(t), await R();
});
chrome.runtime.onStartup.addListener(async () => {
  const t = await d();
  await w(t), await R();
});
chrome.tabs.onActivated.addListener(async (t) => {
  try {
    const e = await chrome.tabs.get(t.tabId);
    if (e.url && e.url.startsWith("http")) {
      const s = new URL(e.url).hostname;
      await R(t.tabId, s);
    }
  } catch {
  }
});
chrome.tabs.onUpdated.addListener(async (t, e, s) => {
  const r = e.url || s.url;
  if (r && r.startsWith("http"))
    try {
      const a = await d();
      if (a.enabled && (a.blockPopups || a.blockAdRedirects) && U(r)) {
        const c = new URL(r).hostname;
        if (!k(c, a) && (await b("popup", c, 1), s.openerTabId)) {
          await chrome.tabs.remove(t);
          return;
        }
      }
    } catch {
    }
  if (e.status === "complete" && s.url && s.url.startsWith("http")) {
    const a = new URL(s.url).hostname;
    await R(t, a);
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
    const r = t.rule.rulesetId === m.EASYPRIVACY;
    await b(r ? "tracker" : "network", s, 1), t.request.tabId && t.request.tabId > 0 && s && await R(t.request.tabId, s);
  } catch {
  }
});
var x;
(x = chrome.webNavigation) != null && x.onCreatedNavigationTarget && chrome.webNavigation.onCreatedNavigationTarget.addListener(async (t) => {
  try {
    const e = await d();
    if (!e.enabled || !e.blockPopups) return;
    const s = t.url;
    U(s) && (await chrome.tabs.remove(t.tabId), await b("popup"));
  } catch {
  }
});
var W;
(W = chrome.webNavigation) != null && W.onBeforeNavigate && chrome.webNavigation.onBeforeNavigate.addListener(async (t) => {
  if (t.frameId === 0)
    try {
      const e = await d();
      if (!e.enabled || !e.blockAdRedirects) return;
      const s = t.url;
      if (U(s)) {
        const a = new URL(s).hostname;
        if (!k(a, e)) {
          await b("redirect", a, 1);
          try {
            (await chrome.tabs.get(t.tabId)).openerTabId ? await chrome.tabs.remove(t.tabId) : await chrome.tabs.update(t.tabId, { url: "about:blank" });
          } catch {
            await chrome.tabs.update(t.tabId, { url: "about:blank" });
          }
        }
      }
    } catch {
    }
});
chrome.runtime.onMessage.addListener((t, e, s) => !t || !t.type ? !1 : ((async () => {
  var r;
  switch (t.type) {
    case u.GET_PAGE_STATUS: {
      const a = await d(), i = await L(), c = t.hostname || "", n = k(c, a), o = i.siteStats[c] ?? {
        blockedRequests: 0,
        elementsHidden: 0,
        redirectsBlocked: 0,
        popupsBlocked: 0,
        antiAdblockDefused: 0
      }, l = {
        hostname: c,
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
        siteStats: o
      };
      s({ payload: l });
      break;
    }
    case u.TOGGLE_GLOBAL_PROTECTION: {
      const a = await d(), i = typeof t.enabled == "boolean" ? t.enabled : !a.enabled, c = await Y({ enabled: i });
      await w(c), await G(), s({ success: !0, enabled: i });
      break;
    }
    case u.TOGGLE_SITE_ALLOWLIST: {
      const a = await d(), i = (r = t.hostname) == null ? void 0 : r.trim().toLowerCase();
      if (!i) {
        s({ success: !1, error: "Invalid hostname" });
        return;
      }
      let c;
      t.allow ? c = Array.from(/* @__PURE__ */ new Set([...a.allowlist, i])) : c = a.allowlist.filter((o) => o.toLowerCase() !== i);
      const n = await Y({ allowlist: c });
      await w(n), await G(), s({ success: !0, allowlist: c });
      break;
    }
    case u.REPORT_COSMETIC_BLOCKED: {
      const a = typeof t.count == "number" ? t.count : 1;
      await b("cosmetic", t.hostname, a), s({ success: !0 });
      break;
    }
    case u.REPORT_REDIRECT_BLOCKED: {
      await b("redirect", t.hostname, 1), s({ success: !0 });
      break;
    }
    case u.REPORT_POPUP_BLOCKED: {
      await b("popup", t.hostname, 1), s({ success: !0 });
      break;
    }
    case u.REPORT_CLICK_PROTECTED: {
      await b("click", t.hostname, 1), s({ success: !0 });
      break;
    }
    case u.REPORT_STEALTH_DEFUSED: {
      await b("stealth", t.hostname, 1), s({ success: !0 });
      break;
    }
    case u.RESET_STATISTICS: {
      await et(), await R(), s({ success: !0 });
      break;
    }
    case u.UPDATE_FILTER_LIST: {
      const a = t.listId, c = (await K()).find((o) => o.id === a);
      if (!c) {
        s({ success: !1, error: "Filter list not found" });
        return;
      }
      await C(a, { lastUpdateStatus: "updating" });
      const n = await it(c.url);
      if (n.success) {
        await C(a, {
          lastUpdateStatus: "success",
          lastUpdated: Date.now(),
          ruleCount: n.ruleCount,
          lastErrorMessage: void 0
        });
        const o = await d();
        await w(o), s({ success: !0, ruleCount: n.ruleCount });
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
