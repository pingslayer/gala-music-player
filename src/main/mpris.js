const Player = require('mpris-service');

class MprisManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.player = null;
    this.initPlayer();
  }

  initPlayer() {
    try {
      this.player = Player({
        name: 'gala',
        identity: 'Gala Music Player',
        supportedUriSchemes: ['https'],
        supportedMimeTypes: ['audio/mpeg', 'audio/aac'],
        supportedInterfaces: ['player']
      });

      this.setupHandlers();
    } catch (err) {
      console.warn('[MPRIS] Unable to initialize MPRIS service (non-Linux or D-Bus unavailable):', err.message);
    }
  }

  setupHandlers() {
    if (!this.player) return;

    this.player.on('play', () => {
      this.sendCommand('play');
    });

    this.player.on('pause', () => {
      this.sendCommand('pause');
    });

    this.player.on('playpause', () => {
      this.sendCommand('play-pause');
    });

    this.player.on('next', () => {
      this.sendCommand('next');
    });

    this.player.on('previous', () => {
      this.sendCommand('previous');
    });

    this.player.on('seek', (offset) => {
      this.sendCommand('seek', offset);
    });

    this.player.on('quit', () => {
      if (this.mainWindow) {
        this.mainWindow.destroy();
      }
    });
  }

  sendCommand(command, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('gala:media-command', command, payload);
    }
  }

  updateTrack(metadata) {
    if (!this.player) return;

    const mprisMetadata = {
      'xesam:title': metadata.title || 'Unknown Title',
      'xesam:artist': metadata.artist ? [metadata.artist] : ['Unknown Artist'],
      'xesam:album': metadata.album || '',
      'mpris:artUrl': metadata.artwork || ''
    };

    if (metadata.duration && metadata.duration > 0) {
      // MPRIS duration is in microseconds
      mprisMetadata['mpris:length'] = Math.round(metadata.duration * 1000);
    }

    this.player.metadata = mprisMetadata;
  }

  updatePlaybackState(state) {
    if (!this.player) return;
    this.player.playbackStatus = state; // 'Playing', 'Paused', or 'Stopped'
  }

  updatePosition(positionMs) {
    if (!this.player) return;
    // MPRIS position is in microseconds
    this.player.position = Math.round(positionMs * 1000);
  }

  destroy() {
    if (this.player) {
      this.player = null;
    }
  }
}

module.exports = MprisManager;
