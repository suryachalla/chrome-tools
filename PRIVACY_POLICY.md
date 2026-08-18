# Privacy Policy for Mobile View Batch Tester

**Last Updated:** August 16, 2026

**Mobile View Batch Tester** ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy explains our practices regarding data collection, usage, and disclosure.

---

### 1. No Data Collection
**Mobile View Batch Tester does NOT collect, store, transmit, or share any personal information or sensitive user data.** 

* **No Personal Data**: We do not collect names, emails, addresses, IP addresses, or device identifiers.
* **No Browsing History**: We do not monitor, log, or transmit your browsing history or visited web pages.
* **No Analytics or Telemetry**: We do not use any third-party tracking scripts, analytics, advertising SDKs, or remote telemetry.
* **No Remote Code**: The extension runs 100% locally on your computer with all code bundled inside the extension package.

---

### 2. Local Storage Usage
The Extension utilizes Chrome's local storage API (`chrome.storage.local`) solely on your local device to save your UI preferences:
* Your selected device preset (e.g. iPhone 14 Pro Max, iPhone SE)
* Custom width and height pixel dimensions
* Screen orientation preference (Portrait / Landscape)
* User-Agent toggle preference
* Saved batch URLs entered in the popup text area

**This data never leaves your computer and is never transmitted over the internet.**

---

### 3. Permissions & Purpose
* `debugger`: Used strictly to apply responsive mobile viewport metrics, touch simulation, and mobile rendering to user-selected test tabs.
* `tabs`: Used to open test tabs in the current browser window and navigate through user-provided test URLs.
* `scripting`: Used to inject the floating runner HUD (navigation controls) inside standalone mobile test windows.
* `activeTab`: Used to access and apply mobile emulation on the active tab in response to explicit user interaction.
* `declarativeNetRequest`: Used to apply temporary, tab-scoped mobile User-Agent headers strictly to designated test tabs.

---

### 4. Third-Party Services
The Extension does not integrate with, sell data to, or communicate with any third-party services.

---

### 5. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any updates will be reflected with a revised "Last Updated" date at the top of this document.

---

### 6. Contact
If you have any questions or feedback regarding this Privacy Policy, please reach out via our official GitHub repository issue tracker.
