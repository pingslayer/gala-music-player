# Gala Music Player

An ultra-robust, native Apple Music client for Linux powered by CastLabs Electron.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Linux](https://img.shields.io/badge/Platform-Linux-orange.svg)](#)
[![DRM: Widevine EVS](https://img.shields.io/badge/DRM-Widevine%20EVS-green.svg)](#)

---

## Highlights

- 🎧 **Untouched Lossless Audio:** Directly streams Apple Music through CastLabs Electron with production-signed Widevine CDM support. No audio stream interception, no custom Web Audio filters, and no playback errors.
- 🐧 **Native Linux Integration:** Full MPRIS v2 compliance (`org.mpris.MediaPlayer2.gala`). Seamlessly integrates with GNOME Shell, KDE Plasma, Hyprland, `playerctl`, and desktop lock screens.
- 🛡️ **Hardened & Secure:** Features automatic Single Sign-On (SSO) session destruction on sign-out, strict `contextIsolation`, and zero third-party telemetry.
- ⚡ **Single Authoritative Player:** Disables Chromium's generic media session to eliminate duplicate notifications in desktop trays.
- ⬇️ **Background Playback:** Runs smoothly in the background when closed to tray without audio interruptions or tab throttling.
- 🖱️ **Dock Quick Actions:** Right-click the application icon in your desktop dock to quickly trigger Play/Pause, Next Track, and Previous Track.

---

## Documentation (SDLC Standards)

For detailed technical and architectural specifications, consult our documentation:

- 📐 **[System Architecture](docs/ARCHITECTURE.md)**: Deep dive into process isolation, Widevine CDM initialization, shared memory management, and D-Bus specifications.
- 🔒 **[Security Policy](docs/SECURITY.md)**: Authentication lifecycle, SSO cookie destruction, IPC bridge security, and sandbox integrity.
- 🧪 **[Testing & Verification Guide](docs/TESTING.md)**: Step-by-step procedures for DRM validation, `playerctl` D-Bus tests, and automated checks.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm
- Linux Desktop Environment (GNOME, KDE Plasma, XFCE, Sway, Hyprland, etc.)

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/pingslayer/gala-music-player.git
cd gala-music-player

# Install dependencies
npm install

# Launch Gala in development mode
npm start
```

### Packaging for Linux
Generate standalone `.AppImage` and `.deb` distribution packages:
```bash
npm run dist
```
The packaged binaries will be output to the `dist/` directory.

---

## CLI Media Control (`playerctl`)

Because Gala implements the standard MPRIS v2 specification under the static bus name `gala`, you can easily script or bind it to custom hotkeys:

```bash
# Toggle Playback
playerctl --player=gala play-pause

# Skip Track
playerctl --player=gala next

# Previous Track
playerctl --player=gala previous

# View Current Track Metadata
playerctl --player=gala metadata
```

---

## License

This project is licensed under the [MIT License](LICENSE).
Apple Music is a trademark of Apple Inc. Gala is an independent open-source project and is not affiliated with or endorsed by Apple Inc.
