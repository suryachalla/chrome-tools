(async function () {
  // Prevent duplicate HUD injection on the same page
  if (document.getElementById('mvt-runner-hud-root')) {
    return;
  }

  // Request current runner session from background service worker
  const response = await chrome.runtime.sendMessage({ action: 'RUNNER_GET_SESSION' });
  const session = response?.session;
  if (!session || !session.urls || session.urls.length === 0) {
    return;
  }

  const { urls, currentIndex, deviceName, width, height } = session;

  // Create host element and Shadow DOM
  const host = document.createElement('div');
  host.id = 'mvt-runner-hud-root';
  host.style.cssText = 'all: initial !important; position: fixed !important; top: 10px !important; left: 50% !important; transform: translateX(-50%) !important; z-index: 2147483647 !important; pointer-events: auto !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;';
  const shadow = host.attachShadow({ mode: 'open' });

  // Styles inside shadow DOM (Pure Black and White Monochrome)
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .hud-container {
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      padding: 5px 10px 5px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
      font-size: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.4);
      user-select: none;
      transition: opacity 0.2s, transform 0.2s;
    }

    .hud-drag-handle {
      cursor: grab;
      color: #737373;
      display: flex;
      align-items: center;
      padding: 2px;
    }
    .hud-drag-handle:active {
      cursor: grabbing;
    }

    .hud-badge {
      font-size: 10px;
      font-weight: 700;
      color: #ffffff;
      background: #171717;
      border: 1px solid #333333;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .hud-counter {
      font-weight: 800;
      font-size: 12px;
      color: #ffffff;
      padding: 0 3px;
      white-space: nowrap;
    }

    .hud-btn {
      background: #171717;
      border: 1px solid #333333;
      color: #ffffff;
      border-radius: 9999px;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      transition: all 0.15s;
    }
    .hud-btn:hover:not(:disabled) {
      background: #262626;
      border-color: #ffffff;
      transform: scale(1.08);
      color: #ffffff;
    }
    .hud-btn:active:not(:disabled) {
      transform: scale(0.95);
    }
    .hud-btn:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }

    .hud-btn-primary {
      background: #ffffff;
      border: 1px solid #ffffff;
      color: #000000;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }
    .hud-btn-primary:hover:not(:disabled) {
      background: #e4e4e7;
      box-shadow: 0 0 14px rgba(255, 255, 255, 0.5);
    }

    .hud-select {
      background: #0a0a0a;
      border: 1px solid #333333;
      border-radius: 6px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 6px;
      outline: none;
      max-width: 120px;
      cursor: pointer;
    }
    .hud-select option {
      background: #121212;
      color: #ffffff;
    }

    .hud-close {
      color: #737373;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hud-close:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.15);
    }

    .hud-toast {
      position: absolute;
      top: 44px;
      left: 50%;
      transform: translateX(-50%);
      background: #171717;
      color: #ffffff;
      border: 1px solid #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.8);
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
    }
    .hud-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(2px);
    }
  `;

  shadow.appendChild(style);

  // HUD HTML Markup
  const container = document.createElement('div');
  container.className = 'hud-container';

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === urls.length - 1;

  container.innerHTML = `
    <div class="hud-drag-handle" title="Drag to reposition">
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        <circle cx="2" cy="2" r="1.5"/>
        <circle cx="8" cy="2" r="1.5"/>
        <circle cx="2" cy="7" r="1.5"/>
        <circle cx="8" cy="7" r="1.5"/>
        <circle cx="2" cy="12" r="1.5"/>
        <circle cx="8" cy="12" r="1.5"/>
      </svg>
    </div>

    <span class="hud-badge" title="${deviceName || 'Mobile'} (${width}×${height})">${deviceName || 'Mobile'}</span>

    <button id="btnPrev" class="hud-btn" ${isFirst ? 'disabled' : ''} title="Previous URL (Key: [)">
      ◀
    </button>

    <span class="hud-counter">${currentIndex + 1} / ${urls.length}</span>

    <button id="btnNext" class="hud-btn hud-btn-primary" ${isLast ? 'disabled' : ''} title="Next URL (Key: ])">
      ▶
    </button>

    <select id="jumpSelect" class="hud-select" title="Jump to URL">
      ${urls.map((u, i) => `<option value="${i}" ${i === currentIndex ? 'selected' : ''}>${i + 1}. ${formatUrlLabel(u)}</option>`).join('')}
    </select>

    <button id="btnCopyUrl" class="hud-btn" title="Copy Current URL">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>

    <button id="btnReload" class="hud-btn" title="Reload Page">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
      </svg>
    </button>

    <button id="btnCloseHud" class="hud-close" title="Close Runner Bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <div id="hudToast" class="hud-toast">Copied to clipboard!</div>
  `;

  shadow.appendChild(container);
  document.documentElement.appendChild(host);

  // Event handlers
  const btnPrev = shadow.getElementById('btnPrev');
  const btnNext = shadow.getElementById('btnNext');
  const jumpSelect = shadow.getElementById('jumpSelect');
  const btnCopyUrl = shadow.getElementById('btnCopyUrl');
  const btnReload = shadow.getElementById('btnReload');
  const btnCloseHud = shadow.getElementById('btnCloseHud');
  const toast = shadow.getElementById('hudToast');

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 1800);
  }

  btnPrev.addEventListener('click', () => {
    if (currentIndex > 0) {
      chrome.runtime.sendMessage({ action: 'RUNNER_NAVIGATE_TO', targetIndex: currentIndex - 1 });
    }
  });

  btnNext.addEventListener('click', () => {
    if (currentIndex < urls.length - 1) {
      chrome.runtime.sendMessage({ action: 'RUNNER_NAVIGATE_TO', targetIndex: currentIndex + 1 });
    }
  });

  jumpSelect.addEventListener('change', (e) => {
    const targetIdx = parseInt(e.target.value, 10);
    if (!isNaN(targetIdx) && targetIdx !== currentIndex) {
      chrome.runtime.sendMessage({ action: 'RUNNER_NAVIGATE_TO', targetIndex: targetIdx });
    }
  });

  btnCopyUrl.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urls[currentIndex] || window.location.href);
      showToast('URL Copied!');
    } catch (e) {
      showToast('Failed to copy');
    }
  });

  btnReload.addEventListener('click', () => {
    window.location.reload();
  });

  btnCloseHud.addEventListener('click', () => {
    host.remove();
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    if (e.key === ']') {
      if (currentIndex < urls.length - 1) {
        chrome.runtime.sendMessage({ action: 'RUNNER_NAVIGATE_TO', targetIndex: currentIndex + 1 });
      }
    } else if (e.key === '[') {
      if (currentIndex > 0) {
        chrome.runtime.sendMessage({ action: 'RUNNER_NAVIGATE_TO', targetIndex: currentIndex - 1 });
      }
    }
  });

  // Draggable HUD functionality
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  const dragHandle = shadow.querySelector('.hud-drag-handle');
  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = host.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    host.style.transform = 'none';
    host.style.left = initialLeft + 'px';
    host.style.top = initialTop + 'px';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    host.style.left = Math.max(10, Math.min(window.innerWidth - 200, initialLeft + dx)) + 'px';
    host.style.top = Math.max(10, Math.min(window.innerHeight - 50, initialTop + dy)) + 'px';
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function formatUrlLabel(fullUrl) {
    try {
      const u = new URL(fullUrl);
      return u.hostname + (u.pathname.length > 1 ? u.pathname.substring(0, 15) : '');
    } catch {
      return fullUrl.substring(0, 20);
    }
  }
})();
