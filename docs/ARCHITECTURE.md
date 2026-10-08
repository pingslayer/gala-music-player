# Gala Music Player - System Architecture

## 1. High-Level Architecture Overview

Gala is engineered as an ultra-lean, native Linux wrapper around Apple Music's official web application (`music.apple.com`), powered by CastLabs Electron for Verified Media Path (VMP) Widevine DRM decryption.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Linux Desktop Environment                       │
│    (GNOME / KDE / Hyprland / playerctl / Media Keys / Lock Screen)     │
└─────────────────────────────────▲──────────────────────────────────────┘
                                  │
                                  │ D-Bus: org.mpris.MediaPlayer2.gala
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Electron Main Process (Node.js)                    │
│                                                                        │
│  - Widevine CDM Initialization (components.whenReady())                │
│  - Linux Shared-Memory Management (--disable-dev-shm-usage)            │
│  - MPRIS Service Manager (mpris-service)                               │
│  - Single Authoritative Player (--disable-features=MediaSessionService)│
│  - Secure Sign-Out Interception (webRequest.onCompleted)               │
│  - System Tray & Background Lifecycle Management                       │
└─────────────────────────────────▲──────────────────────────────────────┘
                                  │
                                  │ Secure IPC Bridge (preload.js)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Renderer Process (Isolated Web)                    │
│                                                                        │
│  - contextIsolation: true, sandbox: true, nodeIntegration: false       │
│  - Injected Hook (hook.js) -> navigator.mediaSession                   │
│  - Native Apple Music Web Player (music.apple.com)                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Process Separation & Security Boundaries

### A. Main Process (`src/main/`)
- **`index.js`**: Application entry point. Configures Chromium command-line switches, coordinates window lifecycle, manages the system tray, and intercepts signout requests to purge session tokens.
- **`mpris.js`**: Implements the MPRIS v2 Player specification (`org.mpris.MediaPlayer2.Player`) over D-Bus using `mpris-service`. Directly maps playback commands (`Play`, `Pause`, `Next`, `Previous`, `Seek`) to IPC signals.

### B. Renderer & Preload Layer (`src/preload/`)
- **`preload.js`**: Operates with strict `contextIsolation: true`. Exposes an immutable `__galaBridge` namespace to the page context via `contextBridge.exposeInMainWorld`.
- **`hook.js`**: Injected upon page completion. Interfaces with standard W3C `navigator.mediaSession` APIs to observe track updates (title, artist, album, artwork, duration) and playback state (`Playing`, `Paused`), avoiding fragile DOM or CSS scraping.

---

## 3. DRM Decryption Pipeline

Standard upstream Electron binaries on Linux cannot negotiate Widevine Verified Media Path (VMP) production licenses. Gala uses `@castlabs/electron-releases` (EVS-signed):

1. **CDM Verification:** Before rendering or loading web content, `components.whenReady()` verifies that the Widevine CDM component is registered and active.
2. **Hardware & Shared Memory:** Flags `disable-dev-shm-usage` and `autoplay-policy=no-user-gesture-required` ensure shared memory regions allocate cleanly in `/tmp` on distributions with restricted `/dev/shm` namespaces.
3. **Hardware Acceleration:** Native Chromium GPU video decoding pipelines handle high-bitrate AAC and lossless audio streams without software resampling.

---

## 4. D-Bus MPRIS v2 Specification

Gala registers directly under the well-known bus name:
```
org.mpris.MediaPlayer2.gala
```

### Supported Properties:
- `PlaybackStatus`: `"Playing"`, `"Paused"`, or `"Stopped"`
- `Metadata`:
  - `xesam:title` (string)
  - `xesam:artist` (array of strings)
  - `xesam:album` (string)
  - `mpris:artUrl` (string)
  - `mpris:length` (int64, microseconds)
- `Position`: Microseconds tracking active song progression.

### Suppressing Redundant Chromium Player:
Chromium’s internal media key handler (`HardwareMediaKeyHandling` and `MediaSessionService`) is disabled via launch switches. This prevents duplicate D-Bus announcements and guarantees `org.mpris.MediaPlayer2.gala` is the single authoritative player in desktop sound applets.
