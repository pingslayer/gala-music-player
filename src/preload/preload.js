const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a minimal, secure API to the page context.
 * Strict contextIsolation is maintained.
 */
contextBridge.exposeInMainWorld('__galaBridge', {
  // Send track updates and playback status to Electron Main
  sendTrackUpdate: (metadata) => {
    ipcRenderer.send('gala:track-update', metadata);
  },
  sendPlaybackState: (state) => {
    ipcRenderer.send('gala:playback-state', state);
  },
  sendPositionUpdate: (position) => {
    ipcRenderer.send('gala:position-update', position);
  },

  // Receive media control commands from Linux MPRIS via Electron Main
  onMediaCommand: (callback) => {
    const handler = (_event, command, payload) => callback(command, payload);
    ipcRenderer.on('gala:media-command', handler);
    return () => {
      ipcRenderer.removeListener('gala:media-command', handler);
    };
  }
});
