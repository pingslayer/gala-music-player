const { app, BrowserWindow, ipcMain, globalShortcut, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const MprisManager = require('./mpris');

// 1. Configure Widevine DRM & Media acceleration switches for CastLabs Electron
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('enable-features', 'Widevine');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let mprisManager = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Gala Music Player',
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      plugins: true, // Required for Widevine CDM
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Remove default menu bar for clean app appearance
  mainWindow.setMenuBarVisibility(false);

  // Initialize Linux MPRIS service
  mprisManager = new MprisManager(mainWindow);

  // Load official Apple Music web player
  mainWindow.loadURL('https://music.apple.com');

  // Inject the Gala hook script when navigation succeeds
  mainWindow.webContents.on('did-finish-load', () => {
    const hookPath = path.join(__dirname, '../preload/hook.js');
    if (fs.existsSync(hookPath)) {
      const hookCode = fs.readFileSync(hookPath, 'utf8');
      mainWindow.webContents.executeJavaScript(hookCode).catch((err) => {
        console.error('[Hook] Failed to inject hook script:', err);
      });
    }
  });

  // Handle Close-to-Tray (hide window instead of quitting to keep playback uninterrupted)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a fallback or create a minimal tray icon if icon asset exists
  // For now, allow simple toggle if system tray is supported
  try {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Gala',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        },
        {
          label: 'Quit',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]);
      tray.setToolTip('Gala Music Player');
      tray.setContextMenu(contextMenu);
      tray.on('click', () => {
        if (mainWindow) {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
      });
    }
  } catch (err) {
    console.warn('[Tray] Tray icon could not be created:', err.message);
  }
}

// IPC Handlers: forward web player updates to MPRIS
ipcMain.on('gala:track-update', (_event, metadata) => {
  if (mprisManager) {
    mprisManager.updateTrack(metadata);
  }
});

ipcMain.on('gala:playback-state', (_event, state) => {
  if (mprisManager) {
    mprisManager.updatePlaybackState(state);
  }
});

ipcMain.on('gala:position-update', (_event, position) => {
  if (mprisManager) {
    mprisManager.updatePosition(position);
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register physical keyboard media shortcuts as fallback
  globalShortcut.register('MediaPlayPause', () => {
    if (mprisManager) mprisManager.sendCommand('play-pause');
  });
  globalShortcut.register('MediaNextTrack', () => {
    if (mprisManager) mprisManager.sendCommand('next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    if (mprisManager) mprisManager.sendCommand('previous');
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (mprisManager) {
    mprisManager.destroy();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
