# Gala Music Player - Testing & Verification Guide

This document outlines the standard Quality Assurance (QA) and verification procedures for Gala Music Player.

---

## 1. Automated Verification Checks

Run static analysis and syntax validation across all process layers:

```bash
# Validate syntax of Main, Preload, and Injected scripts
node -c src/main/index.js
node -c src/main/mpris.js
node -c src/preload/preload.js
node -c src/preload/hook.js
```

---

## 2. Linux MPRIS Integration Testing

With the application running (`npm start`), verify D-Bus communication using `playerctl`:

### A. Inspect Registered Player
```bash
playerctl --list-all
# Output MUST include:
# gala
```

### B. Query Track Metadata
Play a track and inspect metadata returned over D-Bus:
```bash
playerctl --player=gala metadata
# Expected output:
# gala xesam:artist       [Artist Name]
# gala xesam:title        [Track Title]
# gala xesam:album        [Album Title]
# gala mpris:artUrl       https://...
# gala mpris:length       [Duration in microseconds]
```

### C. Test Playback Controls via D-Bus
```bash
# Toggle Play/Pause
playerctl --player=gala play-pause

# Skip to Next Track
playerctl --player=gala next

# Previous Track
playerctl --player=gala previous
```

---

## 3. DRM Playback Verification

1. Launch `npm start`.
2. Sign in with an active Apple Music subscription.
3. Select any standard catalog track or Lossless/Hi-Res track.
4. **Pass Criteria:**
   - Audio begins playback immediately without decryption error dialogs ("Something went wrong").
   - Progress bar updates continuously.
   - CPU usage remains low (<5% on idle playback).

---

## 4. Authentication & Security Teardown Testing

1. In the Apple Music interface, click the profile icon $\rightarrow$ **Sign Out**.
2. Confirm the terminal outputs:
   ```text
   [Security] Apple Music sign-out detected via ...
   [Security] Session storage and SSO cookies securely destroyed.
   ```
3. Close the application and relaunch:
   ```bash
   npm start
   ```
4. **Pass Criteria:**
   - The application starts on the public, unauthenticated landing page showing the **"Sign In"** button.
   - No cached user library or previous account session is restored automatically.

---

## 5. Linux Packaging & Distribution Testing

Build and test the native binary targets:
```bash
# Build AppImage and .deb packages
npm run dist
```
Verify the generated binaries in `dist/`:
- `Gala Music Player-1.0.0.AppImage` executes standalone without missing library errors.
- `.desktop` quick-actions function properly from application docks.
