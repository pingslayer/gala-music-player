# Gala Music Player

Gala is a desktop Apple Music client built for Linux, designed to integrate cleanly with modern desktop environments like GNOME, KDE Plasma, and Hyprland.

It is powered by CastLabs Electron with verified Widevine DRM support, allowing Apple Music to stream smoothly without playback errors or broken sessions.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Linux](https://img.shields.io/badge/Platform-Linux-orange.svg)](#)
[![DRM: Widevine EVS](https://img.shields.io/badge/DRM-Widevine%20EVS-green.svg)](#)

---

## Features

- **Reliable Playback:** Uses signed Widevine DRM so Apple Music streams properly without playback errors, audio manipulation, or stream interruptions.
- **Desktop Media Integration:** Fully supports the standard Linux MPRIS v2 specification (`org.mpris.MediaPlayer2.gala`). Hardware media keys, lock screen widgets, top bar controls, and desktop notifications work out of the box.
- **Wayland and Hardware Acceleration:** Tuned for smooth graphics and stable audio buffering across Wayland and X11 compositors.
- **Dock Quick Actions:** Right-click the app icon in your desktop dock to play, pause, or skip tracks.
- **Smart Cache Management:** Automatically clears outdated web caches and service workers on launch to avoid stuck loading screens while keeping your login session intact.
- **Private and Lightweight:** Runs with strict context isolation, properly clears session cookies on sign-out, and includes zero tracking or telemetry.

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- Linux desktop environment (GNOME, KDE Plasma, XFCE, Sway, Hyprland, etc.)

### Run from Source

```bash
# Clone the repository
git clone https://github.com/pingslayer/gala-music-player.git
cd gala-music-player

# Install dependencies
npm install

# Start the application
npm start
```

### Build Packages (RPM, DEB, AppImage)

To generate standalone Linux packages:

```bash
npm run dist
```

Packaged binaries will be saved in the `dist/` folder.

---

## Command Line Control

Because Gala registers with MPRIS, you can inspect playback or control it using `playerctl`:

```bash
# Toggle playback
playerctl --player=gala play-pause

# Skip to next or previous track
playerctl --player=gala next
playerctl --player=gala previous

# Show current track information
playerctl --player=gala metadata
```

You can also bind these commands to custom shortcuts in your window manager (such as Hyprland, Sway, or i3).

---

## Documentation

For technical and architectural details:

- [System Architecture](docs/ARCHITECTURE.md): Process isolation, audio pipelines, and D-Bus integration.
- [Security Policy](docs/SECURITY.md): Session management, IPC communication, and cookie handling.
- [Testing Guide](docs/TESTING.md): Verification steps for DRM, MPRIS signals, and build validation.

---

## License

This project is licensed under the [MIT License](LICENSE).

Disclaimer: Gala is an independent open-source project and is not affiliated with, sponsored by, or endorsed by Apple Inc. Apple Music is a trademark of Apple Inc.
