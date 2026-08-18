const UA_RULE_ID = 1001;
const MAX_BATCH_URLS = 50;

// Map of tabId -> deviceConfig for active emulated tabs in same window
const emulatedTabs = new Map();

// Clear any stale global DNR rules immediately on worker start
cleanupAllUserAgentRules();

// Message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'OPEN_BATCH_MOBILE_TABS') {
        await openBatchMobileTabs(message.urls, message.config);
        sendResponse({ success: true });
      } else if (message.action === 'TOGGLE_TAB_MOBILE_EMULATION') {
        const isEmulated = await toggleTabMobileEmulation(message.tabId, message.config);
        sendResponse({ success: true, isEmulated });
      } else if (message.action === 'START_RUNNER_SESSION') {
        await startRunnerSession(message);
        sendResponse({ success: true });
      } else if (message.action === 'OPEN_SINGLE_MOBILE_WINDOW') {
        await openSingleWindow(message);
        sendResponse({ success: true });
      } else if (message.action === 'OPEN_ALL_WINDOWS') {
        await openAllWindows(message);
        sendResponse({ success: true });
      } else if (message.action === 'RUNNER_NAVIGATE_TO') {
        await navigateRunner(message.targetIndex);
        sendResponse({ success: true });
      } else if (message.action === 'RUNNER_GET_SESSION') {
        const { runnerSession } = await chrome.storage.local.get('runnerSession');
        sendResponse({ session: runnerSession });
      } else if (message.action === 'RUNNER_CLOSE_SESSION') {
        await cleanupSession();
        sendResponse({ success: true });
      }
    } catch (err) {
      console.error('Service worker message error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});

// ==========================================
// CDP MOBILE EMULATION (SAME WINDOW TABS)
// ==========================================

async function openBatchMobileTabs(rawUrls, config) {
  const urls = (rawUrls || []).slice(0, MAX_BATCH_URLS);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const tab = await chrome.tabs.create({
      url: url,
      active: i === 0
    });

    if (tab?.id) {
      emulatedTabs.set(tab.id, config);
      applyEmulationToTab(tab.id, config).catch(e => console.warn('Emulation error:', e));
    }
  }
}

async function toggleTabMobileEmulation(tabId, config) {
  if (emulatedTabs.has(tabId)) {
    try {
      await chrome.debugger.detach({ tabId });
    } catch (e) {
      console.warn('Debugger detach error:', e);
    }
    emulatedTabs.delete(tabId);
    return false;
  } else {
    emulatedTabs.set(tabId, config);
    await applyEmulationToTab(tabId, config);
    return true;
  }
}

async function applyEmulationToTab(tabId, config) {
  if (!tabId || !config) return;
  const target = { tabId };

  try {
    try {
      await chrome.debugger.attach(target, '1.3');
    } catch (e) {
      if (!e.message?.includes('Already attached')) {
        await new Promise(r => setTimeout(r, 200));
        await chrome.debugger.attach(target, '1.3');
      }
    }

    await chrome.debugger.sendCommand(target, 'Page.enable').catch(() => {});

    const isLandscape = config.orientation === 'landscape';
    const rawW = Number(config.width) || (isLandscape ? 667 : 375);
    const rawH = Number(config.height) || (isLandscape ? 375 : 667);
    const finalW = isLandscape ? Math.max(rawW, rawH) : Math.min(rawW, rawH);
    const finalH = isLandscape ? Math.min(rawW, rawH) : Math.max(rawW, rawH);

    try {
      await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', {
        width: Math.round(finalW),
        height: Math.round(finalH),
        deviceScaleFactor: Number(config.deviceScaleFactor) || 2,
        mobile: true,
        fitWindow: false,
        screenOrientation: {
          type: isLandscape ? 'landscapePrimary' : 'portraitPrimary',
          angle: isLandscape ? 90 : 0
        }
      });
    } catch (metricErr) {
      await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', {
        width: Math.round(finalW),
        height: Math.round(finalH),
        deviceScaleFactor: Number(config.deviceScaleFactor) || 2,
        mobile: true,
        fitWindow: false
      }).catch(() => {});
    }

    await chrome.debugger.sendCommand(target, 'Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 5
    }).catch(() => {});

    if (config.userAgent) {
      await chrome.debugger.sendCommand(target, 'Emulation.setUserAgentOverride', {
        userAgent: config.userAgent,
        acceptLanguage: 'en-US,en;q=0.9',
        platform: config.userAgent.includes('iPhone') || config.userAgent.includes('iPad') ? 'iPhone' : 'Linux armv8l'
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Error sending emulation commands to tab ' + tabId, err);
  }
}

// ==========================================
// STANDALONE POPUP WINDOWS
// ==========================================

async function startRunnerSession({ urls: rawUrls, config }) {
  await cleanupSession();

  const urls = (rawUrls || []).slice(0, MAX_BATCH_URLS);
  if (urls.length === 0) return;

  const cfg = config || { width: 375, height: 667, orientation: 'portrait' };
  const isLandscape = cfg.orientation === 'landscape';
  const rawW = Number(cfg.width) || (isLandscape ? 667 : 375);
  const rawH = Number(cfg.height) || (isLandscape ? 375 : 667);
  const targetW = isLandscape ? Math.max(rawW, rawH) : Math.min(rawW, rawH);
  const targetH = isLandscape ? Math.min(rawW, rawH) : Math.max(rawW, rawH);

  // Outer window size adjusted for window decorations
  const winW = Math.max(Math.round(targetW), 360);
  const winH = Math.max(Math.round(targetH + 38), 380);

  const initialUrl = urls[0];
  const win = await chrome.windows.create({
    url: initialUrl,
    type: 'popup',
    width: winW,
    height: winH,
    focused: true
  });

  const tab = win.tabs && win.tabs[0];
  const tabId = tab ? tab.id : null;

  if (tabId) {
    emulatedTabs.set(tabId, cfg);
    if (cfg.userAgent) {
      await applyTabScopedUserAgentRule(tabId, cfg.userAgent);
    }
    await applyEmulationToTab(tabId, cfg);
  }

  const session = {
    windowId: win.id,
    tabId: tabId,
    urls: urls,
    currentIndex: 0,
    config: cfg,
    width: targetW,
    height: targetH,
    deviceName: cfg.deviceName,
    orientation: cfg.orientation,
    userAgent: cfg.userAgent
  };

  await chrome.storage.local.set({ runnerSession: session });
}

async function navigateRunner(newIndex) {
  const { runnerSession } = await chrome.storage.local.get('runnerSession');
  if (!runnerSession || !runnerSession.urls || newIndex < 0 || newIndex >= runnerSession.urls.length) {
    return;
  }

  runnerSession.currentIndex = newIndex;
  await chrome.storage.local.set({ runnerSession });

  const targetUrl = runnerSession.urls[newIndex];
  if (runnerSession.tabId) {
    if (runnerSession.config) {
      emulatedTabs.set(runnerSession.tabId, runnerSession.config);
    }
    await chrome.tabs.update(runnerSession.tabId, { url: targetUrl });
  }
}

async function openSingleWindow({ url, config }) {
  const cfg = config || { width: 375, height: 667 };
  const isLandscape = cfg.orientation === 'landscape';
  const rawW = Number(cfg.width) || (isLandscape ? 667 : 375);
  const rawH = Number(cfg.height) || (isLandscape ? 375 : 667);
  const targetW = isLandscape ? Math.max(rawW, rawH) : Math.min(rawW, rawH);
  const targetH = isLandscape ? Math.min(rawW, rawH) : Math.max(rawW, rawH);

  const win = await chrome.windows.create({
    url: url,
    type: 'popup',
    width: Math.max(Math.round(targetW), 360),
    height: Math.max(Math.round(targetH + 38), 380),
    focused: true
  });

  const tab = win.tabs && win.tabs[0];
  if (tab?.id) {
    emulatedTabs.set(tab.id, cfg);
    if (cfg.userAgent) {
      await applyTabScopedUserAgentRule(tab.id, cfg.userAgent);
    }
    await applyEmulationToTab(tab.id, cfg);
  }
}

async function openAllWindows({ urls: rawUrls, config }) {
  const urls = (rawUrls || []).slice(0, MAX_BATCH_URLS);
  const cfg = config || { width: 375, height: 667 };
  const isLandscape = cfg.orientation === 'landscape';
  const rawW = Number(cfg.width) || (isLandscape ? 667 : 375);
  const rawH = Number(cfg.height) || (isLandscape ? 375 : 667);
  const targetW = isLandscape ? Math.max(rawW, rawH) : Math.min(rawW, rawH);
  const targetH = isLandscape ? Math.min(rawW, rawH) : Math.max(rawW, rawH);

  let offset = 0;
  for (const u of urls) {
    const win = await chrome.windows.create({
      url: u,
      type: 'popup',
      width: Math.max(Math.round(targetW), 360),
      height: Math.max(Math.round(targetH + 38), 380),
      left: Math.min(100 + offset, 800),
      top: Math.min(100 + offset, 500),
      focused: offset === 0
    });
    const tab = win.tabs && win.tabs[0];
    if (tab?.id) {
      emulatedTabs.set(tab.id, cfg);
      if (cfg.userAgent) {
        applyTabScopedUserAgentRule(tab.id, cfg.userAgent).catch(() => {});
      }
      applyEmulationToTab(tab.id, cfg).catch(() => {});
    }
    offset += 30;
  }
}

// Injects HUD or re-applies emulation on page load
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  // Re-apply emulation as page loads so layout renders in mobile dimensions immediately
  if (emulatedTabs.has(tabId)) {
    const config = emulatedTabs.get(tabId);
    await applyEmulationToTab(tabId, config);
  }

  // If this is the standalone runner window, inject HUD when complete
  if (changeInfo.status === 'complete') {
    const { runnerSession } = await chrome.storage.local.get('runnerSession');
    if (runnerSession && runnerSession.windowId === tab.windowId) {
      runnerSession.tabId = tabId;
      await chrome.storage.local.set({ runnerSession });
      await injectRunnerHud(tabId);
    }
  }
});

async function injectRunnerHud(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['scripts/runner-hud.js']
    });
  } catch (scriptErr) {
    // Fallback using debugger permission (works without broad host permissions)
    try {
      const target = { tabId };
      try {
        await chrome.debugger.attach(target, '1.3');
      } catch (e) {
        if (!e.message?.includes('Already attached')) return;
      }
      const hudUrl = chrome.runtime.getURL('scripts/runner-hud.js');
      const res = await fetch(hudUrl);
      const code = await res.text();
      await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
        expression: code,
        userGesture: true,
        awaitPromise: true
      });
    } catch (dbgErr) {
      console.warn('Could not inject runner HUD into tab:', tabId, dbgErr);
    }
  }
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (emulatedTabs.has(tabId)) {
    emulatedTabs.delete(tabId);
  }
  removeTabScopedUserAgentRule(tabId).catch(() => {});
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const { runnerSession } = await chrome.storage.local.get('runnerSession');
  if (runnerSession && runnerSession.windowId === windowId) {
    await cleanupSession();
  }
});

chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId && emulatedTabs.has(source.tabId)) {
    emulatedTabs.delete(source.tabId);
  }
});

// Strictly scopes User-Agent rule to only the specified tabId
async function applyTabScopedUserAgentRule(tabId, userAgent) {
  try {
    const ruleId = 2000 + (tabId % 10000);
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              {
                header: 'User-Agent',
                operation: 'set',
                value: userAgent
              }
            ]
          },
          condition: {
            tabIds: [tabId],
            resourceTypes: [
              'main_frame',
              'sub_frame',
              'stylesheet',
              'script',
              'image',
              'font',
              'xmlhttprequest',
              'ping',
              'other'
            ]
          }
        }
      ]
    });
  } catch (e) {
    console.warn('Could not set tab-scoped User-Agent rule:', e);
  }
}

async function removeTabScopedUserAgentRule(tabId) {
  try {
    const ruleId = 2000 + (tabId % 10000);
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId]
    });
  } catch (e) {}
}

async function cleanupAllUserAgentRules() {
  try {
    // Clear dynamic rules that could have leaked globally
    const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
    const dynamicIds = dynamicRules.map(r => r.id);
    if (dynamicIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: dynamicIds
      });
    }

    // Clear session rules
    const sessionRules = await chrome.declarativeNetRequest.getSessionRules();
    const sessionIds = sessionRules.map(r => r.id);
    if (sessionIds.length > 0) {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: sessionIds
      });
    }
  } catch (e) {
    console.warn('Cleanup rules error:', e);
  }
}

async function cleanupSession() {
  await cleanupAllUserAgentRules();
  await chrome.storage.local.remove('runnerSession');
}
