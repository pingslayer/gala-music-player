const { app, BrowserWindow, components, ipcMain, globalShortcut, Menu, Tray, session } = require('electron');
const path = require('path');
const fs = require('fs');
const MprisManager = require('./mpris');

// Configure clean Chrome User-Agent to prevent Apple Music from serving degraded or incompatible web bundles
const chromeVersion = `${process.versions.chrome.split('.')[0]}.0.0.0`;
const cleanUA = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
app.userAgentFallback = cleanUA;

// 1. Configure Linux shared memory, GPU acceleration, and audio pipeline flags
// Critical on Fedora/Linux to prevent /dev/shm shared memory crashes
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Provide sufficient audio buffer depth to prevent underruns during CPU spikes
app.commandLine.appendSwitch('audio-buffer-size', '2048');

// Linux platform features:
// - AudioServiceOutOfProcess off: Keeps audio processing in-process, preventing audio dropouts/stutters when UI animations spike CPU
// - WaylandWpColorManagerV1 off: Prevents surface synchronization stalls and frame drops under GNOME Wayland
// - MediaSessionService & HardwareMediaKeyHandling off: Prevents duplicate MPRIS registrations
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService,WaylandWpColorManagerV1,AudioServiceOutOfProcess');

let mainWindow = null;
let mprisManager = null;
let tray = null;
let isQuitting = false;

// Enforce Single Instance Lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('[App] Another instance is already running. Quitting this instance.');
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Gala Music Player',
    icon: path.join(__dirname, '../../assets/icon.png'),
    backgroundColor: '#121212',
    show: false, // Show when ready to prevent white/blank flicker
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
      plugins: true, // Required for Widevine CDM
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Initialize Linux MPRIS service
  mprisManager = new MprisManager(mainWindow);

  // Show window once content is ready to prevent blank screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Diagnostics and error handlers
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Navigation Error] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Process Error] Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  // Inject hook script
  mainWindow.webContents.on('did-finish-load', () => {
    const hookPath = path.join(__dirname, '../preload/hook.js');
    if (fs.existsSync(hookPath)) {
      const hookCode = fs.readFileSync(hookPath, 'utf8');
      mainWindow.webContents.executeJavaScript(hookCode).catch((err) => {
        console.error('[Hook] Failed to inject hook script:', err);
      });
    }
  });

  // Secure Sign-Out Interceptor:
  // When the user clicks "Sign Out" in the Apple Music web UI, the frontend sends a logout API request.
  // We intercept that request to securely nuke the entire Electron session (cookies, local storage, etc.)
  // and reload the page, ensuring no SSO cookies are left behind.
  session.defaultSession.webRequest.onCompleted(
    { urls: ['*://*.apple.com/*logout*', '*://*.apple.com/*signout*'] },
    async (details) => {
      console.log(`[Security] Apple Music sign-out detected via ${details.url}`);
      await session.defaultSession.clearStorageData({
        storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
      });
      console.log('[Security] Session storage and SSO cookies securely destroyed.');
      if (mainWindow) {
        mainWindow.loadURL('https://music.apple.com');
      }
    }
  );

  // Bypass Apple Music's silent 'beforeunload' event that blocks window closing
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    console.log('[App] Bypassing Apple Music beforeunload dialog.');
    event.preventDefault(); 
  });

  // Load official Apple Music web player
  mainWindow.loadURL('https://music.apple.com');

  // Window close button ('X'): allow natural window teardown
  mainWindow.on('close', () => {
    isQuitting = true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}




function createTray() {
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
          label: 'Sign Out & Clear Session',
          click: async () => {
            if (mainWindow) {
              const { session } = require('electron');
              await session.defaultSession.clearStorageData({
                storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
              });
              mainWindow.loadURL('https://music.apple.com');
              mainWindow.show();
            }
          }
        },
        { type: 'separator' },
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
app.whenReady().then(async () => {
  // Ensure CastLabs Widevine CDM component is ready and flush stale service worker/cache
  // (Preserves cookies and login credentials while preventing stale bundle deadlocks)
  const initTasks = [];

  if (components && typeof components.whenReady === 'function') {
    initTasks.push(
      components.whenReady().then(() => {
        console.log('[DRM] CastLabs Widevine CDM initialized.');
      }).catch((cdmErr) => {
        console.warn('[DRM] Widevine CDM initialization warning:', cdmErr.message);
      })
    );
  }

  initTasks.push(
    session.defaultSession.clearData({
      dataTypes: ['serviceWorkers', 'cache'],
      origins: ['https://music.apple.com']
    }).then(() => {
      console.log('[Cache] Stale service workers and cache purged on startup.');
    }).catch((cacheErr) => {
      console.warn('[Cache] Could not purge startup cache:', cacheErr.message);
    })
  );

  await Promise.all(initTasks);

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});



