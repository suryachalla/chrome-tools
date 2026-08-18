const MAX_BATCH_URLS = 50;

const DEVICES = {
  iphone_se: {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    scale: 2,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  iphone_14_pro_max: {
    name: 'iPhone 14 Pro Max',
    width: 430,
    height: 932,
    scale: 3,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  iphone_12_pro_max: {
    name: 'iPhone 12 Pro Max',
    width: 428,
    height: 926,
    scale: 3,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  iphone_15_pro: {
    name: 'iPhone 15/16 Pro',
    width: 393,
    height: 852,
    scale: 3,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  iphone_13_14_std: {
    name: 'iPhone 13/14/15',
    width: 390,
    height: 844,
    scale: 3,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  galaxy_s24: {
    name: 'Galaxy S24 Ultra',
    width: 412,
    height: 915,
    scale: 3,
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
  },
  pixel_8: {
    name: 'Pixel 8 / 7',
    width: 412,
    height: 892,
    scale: 2.6,
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
  },
  ipad_mini: {
    name: 'iPad Mini',
    width: 768,
    height: 1024,
    scale: 2,
    ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  custom: {
    name: 'Custom',
    width: 430,
    height: 932,
    scale: 2,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  }
};

// DOM Elements
const deviceSelect = document.getElementById('deviceSelect');
const btnPortrait = document.getElementById('btnPortrait');
const btnLandscape = document.getElementById('btnLandscape');
const customDimensionsRow = document.getElementById('customDimensionsRow');
const customWidthInput = document.getElementById('customWidth');
const customHeightInput = document.getElementById('customHeight');
const dimensionDisplay = document.getElementById('dimensionDisplay');
const spoofUACheckbox = document.getElementById('spoofUACheckbox');
const urlInput = document.getElementById('urlInput');
const urlCountBadge = document.getElementById('urlCountBadge');
const btnPaste = document.getElementById('btnPaste');
const btnSample = document.getElementById('btnSample');
const btnClear = document.getElementById('btnClear');
const btnToggleCurrentTab = document.getElementById('btnToggleCurrentTab');
const btnOpenAllTabs = document.getElementById('btnOpenAllTabs');
const btnLaunchRunner = document.getElementById('btnLaunchRunner');
const btnOpenAllWindows = document.getElementById('btnOpenAllWindows');

let currentOrientation = 'portrait'; // 'portrait' | 'landscape'

document.addEventListener('DOMContentLoaded', async () => {
  await restoreState();
  updateUI();
  setupEventListeners();
});

function setupEventListeners() {
  deviceSelect.addEventListener('change', () => {
    const selectedKey = deviceSelect.value;
    if (selectedKey !== 'custom' && DEVICES[selectedKey]) {
      const dev = DEVICES[selectedKey];
      const isLandscape = currentOrientation === 'landscape';
      customWidthInput.value = isLandscape ? Math.max(dev.width, dev.height) : Math.min(dev.width, dev.height);
      customHeightInput.value = isLandscape ? Math.min(dev.width, dev.height) : Math.max(dev.width, dev.height);
    }
    saveState();
    updateUI();
  });

  btnPortrait.addEventListener('click', () => {
    if (currentOrientation !== 'portrait') {
      currentOrientation = 'portrait';
      btnPortrait.classList.add('active');
      btnLandscape.classList.remove('active');
      const w = parseInt(customWidthInput.value, 10) || 430;
      const h = parseInt(customHeightInput.value, 10) || 932;
      customWidthInput.value = Math.min(w, h);
      customHeightInput.value = Math.max(w, h);
      saveState();
      updateUI();
    }
  });

  btnLandscape.addEventListener('click', () => {
    if (currentOrientation !== 'landscape') {
      currentOrientation = 'landscape';
      btnLandscape.classList.add('active');
      btnPortrait.classList.remove('active');
      const w = parseInt(customWidthInput.value, 10) || 430;
      const h = parseInt(customHeightInput.value, 10) || 932;
      customWidthInput.value = Math.max(w, h);
      customHeightInput.value = Math.min(w, h);
      saveState();
      updateUI();
    }
  });

  customWidthInput.addEventListener('input', () => {
    saveState();
    updateUI();
  });

  customHeightInput.addEventListener('input', () => {
    saveState();
    updateUI();
  });

  spoofUACheckbox.addEventListener('change', saveState);

  urlInput.addEventListener('input', () => {
    updateUrlCount();
    saveState();
  });

  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (urlInput.value.trim()) {
          urlInput.value += '\n' + text.trim();
        } else {
          urlInput.value = text.trim();
        }
        updateUrlCount();
        saveState();
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  });

  btnSample.addEventListener('click', () => {
    urlInput.value = [
      'https://apple.com/mac',
      'https://m.wikipedia.org',
      'https://news.ycombinator.com'
    ].join('\n');
    updateUrlCount();
    saveState();
  });

  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    updateUrlCount();
    saveState();
  });

  // Toggle mobile mode on active tab in current window
  btnToggleCurrentTab.addEventListener('click', async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id && activeTab.url && !activeTab.url.startsWith('chrome://')) {
      const config = getDeviceConfig();
      await chrome.runtime.sendMessage({
        action: 'TOGGLE_TAB_MOBILE_EMULATION',
        tabId: activeTab.id,
        config: config
      });
      window.close();
    } else {
      alert('Cannot attach mobile emulation to internal chrome:// pages. Please open a valid web page.');
    }
  });

  // Primary: Open URLs in separate tabs in current browser window (Max 50 limit)
  btnOpenAllTabs.addEventListener('click', async () => {
    const urls = getParsedUrls();
    if (urls.length === 0) {
      alert('Please enter at least one URL to test.');
      urlInput.focus();
      return;
    }

    if (urls.length > MAX_BATCH_URLS) {
      alert(`Limit exceeded: Maximum ${MAX_BATCH_URLS} URLs per batch. Only the first ${MAX_BATCH_URLS} will be opened.`);
    }

    const batch = urls.slice(0, MAX_BATCH_URLS);
    const config = getDeviceConfig();

    await chrome.runtime.sendMessage({
      action: 'OPEN_BATCH_MOBILE_TABS',
      urls: batch,
      config: config
    });

    window.close();
  });

  // Launch sequential runner in standalone mobile window (Max 50 limit)
  btnLaunchRunner.addEventListener('click', async () => {
    const urls = getParsedUrls();
    if (urls.length === 0) {
      alert('Please enter at least one URL to test.');
      urlInput.focus();
      return;
    }

    if (urls.length > MAX_BATCH_URLS) {
      alert(`Limit exceeded: Maximum ${MAX_BATCH_URLS} URLs per batch. Only the first ${MAX_BATCH_URLS} will be loaded.`);
    }

    const batch = urls.slice(0, MAX_BATCH_URLS);
    const config = getDeviceConfig();

    await chrome.runtime.sendMessage({
      action: 'START_RUNNER_SESSION',
      urls: batch,
      config: config
    });

    window.close();
  });

  // Open all URLs in separate standalone mobile windows (Max 50 limit)
  btnOpenAllWindows.addEventListener('click', async () => {
    const urls = getParsedUrls();
    if (urls.length === 0) {
      alert('Please enter at least one URL to test.');
      urlInput.focus();
      return;
    }

    const batch = urls.slice(0, MAX_BATCH_URLS);
    if (batch.length > 8) {
      const ok = confirm(`You are about to open ${batch.length} mobile windows simultaneously. Continue?`);
      if (!ok) return;
    }

    const config = getDeviceConfig();

    await chrome.runtime.sendMessage({
      action: 'OPEN_ALL_WINDOWS',
      urls: batch,
      config: config
    });

    window.close();
  });
}

function getDeviceConfig() {
  const selectedKey = deviceSelect.value;
  const dev = DEVICES[selectedKey] || DEVICES.iphone_14_pro_max;

  // Always use the user-customizable input values
  const inputW = parseInt(customWidthInput.value, 10) || dev.width;
  const inputH = parseInt(customHeightInput.value, 10) || dev.height;
  const scale = dev.scale || 3;

  const isLandscape = currentOrientation === 'landscape';
  const width = isLandscape ? Math.max(inputW, inputH) : Math.min(inputW, inputH);
  const height = isLandscape ? Math.min(inputW, inputH) : Math.max(inputW, inputH);
  const ua = spoofUACheckbox.checked ? (dev.ua || DEVICES.iphone_14_pro_max.ua) : null;
  const name = selectedKey === 'custom' ? 'Custom' : (dev.name || 'Mobile');

  return {
    deviceName: name,
    deviceKey: selectedKey,
    width: width,
    height: height,
    deviceScaleFactor: scale,
    orientation: currentOrientation,
    userAgent: ua
  };
}

function getParsedUrls() {
  const raw = urlInput.value.split('\n');
  const cleaned = [];

  for (let line of raw) {
    line = line.trim();
    if (!line) continue;
    if (!/^https?:\/\//i.test(line)) {
      line = 'https://' + line;
    }
    cleaned.push(line);
  }

  return cleaned;
}

function updateUrlCount() {
  const count = getParsedUrls().length;
  if (count > MAX_BATCH_URLS) {
    urlCountBadge.textContent = `${count} / ${MAX_BATCH_URLS} (Max limit)`;
    urlCountBadge.classList.add('badge-warning');
  } else {
    urlCountBadge.textContent = `${count} / ${MAX_BATCH_URLS} URLs`;
    urlCountBadge.classList.remove('badge-warning');
  }
}

function updateUI() {
  const config = getDeviceConfig();
  dimensionDisplay.textContent = `${config.width} × ${config.height} px`;
  updateUrlCount();
}

async function saveState() {
  const state = {
    selectedDevice: deviceSelect.value,
    orientation: currentOrientation,
    customWidth: customWidthInput.value,
    customHeight: customHeightInput.value,
    spoofUA: spoofUACheckbox.checked,
    savedUrls: urlInput.value
  };
  await chrome.storage.local.set({ appSettings: state });
}

async function restoreState() {
  const { appSettings } = await chrome.storage.local.get('appSettings');
  if (appSettings) {
    if (appSettings.selectedDevice && DEVICES[appSettings.selectedDevice]) {
      deviceSelect.value = appSettings.selectedDevice;
    }
    if (appSettings.orientation) {
      currentOrientation = appSettings.orientation;
      if (currentOrientation === 'landscape') {
        btnLandscape.classList.add('active');
        btnPortrait.classList.remove('active');
      } else {
        btnPortrait.classList.add('active');
        btnLandscape.classList.remove('active');
      }
    }
    if (appSettings.customWidth) customWidthInput.value = appSettings.customWidth;
    if (appSettings.customHeight) customHeightInput.value = appSettings.customHeight;
    if (typeof appSettings.spoofUA === 'boolean') spoofUACheckbox.checked = appSettings.spoofUA;
    if (typeof appSettings.savedUrls === 'string') urlInput.value = appSettings.savedUrls;
  }
}
