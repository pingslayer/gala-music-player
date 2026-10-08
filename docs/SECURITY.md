# Gala Music Player - Security Policy & Architecture

## 1. Authentication Lifecycle & Single Sign-On (SSO) Isolation

Gala relies exclusively on official Apple ID authentication handled by Apple's OAuth and SSO domains (`appleid.apple.com`, `idmsa.apple.com`).

### Complete Session Teardown
Unlike standard web views that leave SSO session cookies persisted indefinitely:
1. **Outgoing Logout Interception:** Electron's `session.webRequest.onCompleted` listens for signout endpoints matching `*://*.apple.com/*logout*` and `*://*.apple.com/*signout*`.
2. **Atomic Cache & Cookie Destruction:** Upon request completion, Gala invokes:
   ```javascript
   session.defaultSession.clearStorageData({
     storages: [
       'appcache', 'cookies', 'filesystem', 'indexdb',
       'localstorage', 'shadercache', 'websql',
       'serviceworkers', 'cachestorage'
     ]
   });
   ```
3. **Emergency Manual Wipe:** A dedicated "Sign Out & Clear Session" option is exposed directly in the System Tray menu.

---

## 2. Process Isolation & Sandbox

To maintain the highest level of security:
- **`nodeIntegration: false`**: The web application running inside the window has zero access to Node.js APIs (`fs`, `child_process`, `net`, etc.).
- **`contextIsolation: true`**: Scripts running in the website context cannot access or tamper with Electron's internal JavaScript context or prototype chains.
- **`sandbox: true`**: The renderer process executes inside Chromium's restricted operating system sandbox.
- **Narrow Context Bridge**: The only interface exposed to the page is `window.__galaBridge`, strictly offering parameter-validated IPC calls for media metadata and playback status.

---

## 3. DRM & Third-Party Code

- **No Stream Interception:** Gala does not tap, rip, modify, or route audio streams through third-party Web Audio API filters, ensuring full compliance with Apple Music terms of service.
- **No Third-Party Analytics:** Gala transmits zero telemetry, tracking, or listening data to external analytics servers or third-party platforms.
