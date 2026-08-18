# Chrome Web Store Listing — Mobile View Batch Tester

> Last Updated: 2026-08-18

## Store Listing

**Extension Name**
Mobile View Batch Tester

**Short Description**
Batch test responsive mobile views, device viewports (iPhone, Pixel), and user-agents in tabs or standalone popup windows.

**Detailed Description**
Mobile View Batch Tester is a responsive design testing tool engineered for frontend developers, QA engineers, and designers.

KEY FEATURES:
- Batch URL Testing: Paste up to 50 URLs to test entire user flows, sitemaps, or responsive breakpoints simultaneously.
- Native CDP Device Emulation: Accurate viewport metrics, DPR (device pixel ratio), touch emulation, and mobile rendering engines.
- Curated Presets: iPhone 15/16 Pro, iPhone 14 Pro Max, iPhone SE, Pixel 8/7, Galaxy S24 Ultra, iPad Mini, and Custom dimensions.
- Tab-Scoped User-Agent Spoofing: Emulate mobile Safari and Chrome User-Agents without affecting your global browser session.
- Floating Navigation HUD: Step through batches sequentially in a standalone device window using keyboard shortcuts ([ and ]).
- Minimalist Interface: High-contrast monochrome UI designed for fast workflow execution.

HOW TO USE:
1. Click the Mobile View Batch Tester extension icon in your Chrome toolbar.
2. Select your target device or enter custom dimensions (and choose portrait or landscape orientation).
3. Enter or paste your URLs into the batch text area (or click "Test Current Tab" to toggle emulation on your active page).
4. Click "Open in Tabs" or "Launch Runner Window" to begin testing.

PRIVACY & PERMISSIONS:
Mobile View Batch Tester runs 100% locally on your machine. It does not collect, track, or transmit any personal data, browsing history, or analytics.

**Category**
Developer Tools

**Single Purpose**
Batch test and emulate responsive mobile device viewports and user-agents across multiple web pages.

**Primary Language**
English

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Required to toggle mobile viewport emulation and responsive metrics on the currently active tab when the user explicitly clicks the "Test Current Tab" button. |
| `debugger` | permissions | Required to send Chrome DevTools Protocol (CDP) commands (`Emulation.setDeviceMetricsOverride` and `Emulation.setTouchEmulationEnabled`) to render precise mobile device screen dimensions and touch interactions. |
| `tabs` | permissions | Required to programmatically open batch URLs in new browser tabs and inspect tab IDs for targeted mobile emulation. |
| `scripting` | permissions | Required to inject the lightweight navigation HUD controls inside standalone mobile test runner windows. |
| `storage` | permissions | Required to save user UI preferences locally (e.g. selected device preset, orientation, and custom dimensions). |
| `declarativeNetRequest` | permissions | Required to apply temporary, session-scoped mobile User-Agent request headers strictly to designated test tabs without modifying global browser requests. |

---

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.5.0 | 2026-08-18 | Removed broad host permissions (`<all_urls>`) and adopted `activeTab` to eliminate in-depth review delays. | Ready to Submit |
| 2.4.0 | 2026-08-16 | Initial Manifest V3 package with CDP emulation and sequential runner. | Reviewed |
