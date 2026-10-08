# Gala Music Player

Gala Music Player is a native, lightweight, and ultra-robust Apple Music client designed specifically for Linux. It securely wraps the official Apple Music web player, bringing deep desktop integration without compromising audio quality, performance, or security.

## Features

- 🎧 **Untouched Audio:** Directly utilizes Apple's web player through CastLabs Electron, ensuring fully functioning Widevine DRM on Linux. No artificial equalizers, Web Audio API tampering, or resampling.
- 🐧 **Native Linux Integration:** Full MPRIS support via D-Bus. Control your music from your lock screen, hardware media keys, or sound applets.
- 🛡️ **Unbreakable Design:** Gala extracts data directly from official internal APIs rather than scraping fragile HTML/CSS, meaning the app will not break when Apple updates their user interface.
- ⬇️ **Background Playback:** A minimal system tray ensures your music never stops when you clear your workspace.

## Why Gala?

Most third-party Apple Music clients suffer from bloat, fragile CSS theme injections that break constantly, or custom audio engines that degrade stream quality and crash on Linux due to DRM issues. 

Gala takes a fundamentally different, hardened approach: **Wrap `music.apple.com` directly, stay out of the way, and let the native media subsystem do the heavy lifting.** There are no custom themes or "gamer" integrations—just pure, stable, performant music playback.

## Development & Packaging

```bash
# Clone the repository
git clone https://github.com/yourusername/gala-music-player.git
cd gala-music-player

# Install dependencies
npm install

# Start the application in development mode
npm start

# Build Linux packages (.AppImage, .deb)
npm run dist
```

## Linux Desktop Features

- **MPRIS Integration:** Full support for `org.mpris.MediaPlayer2.gala`.
- **Dock Quick Actions:** Right-click the app icon in GNOME / KDE dash to trigger Play/Pause, Next, and Previous directly.
- **Hardware Media Keys:** Bindings for physical Play/Pause, Next, and Previous keys.
- **Persistent Sessions:** Apple ID credentials and login state persist across system reboots.

## Architecture Overview

*   **Engine:** CastLabs Electron (`@castlabs/electron-releases`) for Verified Media Path (VMP) DRM.
*   **Integration:** `mpris-service` for D-Bus communication.
*   **Frontend:** A minimal, highly secure JavaScript injection (`hook.js`) bridging the gap between Apple's official APIs and Node.js.

## License

MIT License
