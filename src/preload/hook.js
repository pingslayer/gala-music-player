/**
 * Gala Hook Script - Injected into music.apple.com
 * Extracts playback status and metadata via official web standards (MediaSession)
 * without fragile HTML/CSS scraping.
 */
(function initGalaHook() {
  if (!window.__galaBridge) {
    return;
  }

  let lastTrackId = null;
  let lastPlaybackState = null;

  // 1. Observe MediaSession metadata updates
  function checkMediaSession() {
    if (!navigator.mediaSession || !navigator.mediaSession.metadata) {
      return;
    }

    const metadata = navigator.mediaSession.metadata;
    const title = metadata.title || '';
    const artist = metadata.artist || '';
    const album = metadata.album || '';
    const artworkList = metadata.artwork || [];
    const artwork = artworkList.length > 0 ? (artworkList[artworkList.length - 1].src || '') : '';

    const trackId = `${title}-${artist}-${album}`;
    if (trackId !== lastTrackId && title.length > 0) {
      lastTrackId = trackId;

      // Extract duration if an audio element is active
      const audioEl = document.querySelector('audio');
      const duration = audioEl && !isNaN(audioEl.duration) ? audioEl.duration : 0;

      window.__galaBridge.sendTrackUpdate({
        title,
        artist,
        album,
        artwork,
        duration: Math.round(duration * 1000) // milliseconds
      });
    }

    // Check playback state via MediaSession or HTMLMediaElement
    const audioEl = document.querySelector('audio');
    let isPlaying = false;
    if (audioEl) {
      isPlaying = !audioEl.paused && audioEl.currentTime > 0 && !audioEl.ended;
    } else if (navigator.mediaSession.playbackState) {
      isPlaying = navigator.mediaSession.playbackState === 'playing';
    }

    const currentState = isPlaying ? 'Playing' : 'Paused';
    if (currentState !== lastPlaybackState) {
      lastPlaybackState = currentState;
      window.__galaBridge.sendPlaybackState(currentState);
    }

    if (audioEl && isPlaying) {
      window.__galaBridge.sendPositionUpdate(Math.round(audioEl.currentTime * 1000));
    }
  }

  // Poll state smoothly every 500ms (minimal CPU overhead)
  setInterval(checkMediaSession, 500);

  // 2. Handle Inbound MPRIS media commands from Electron Main
  window.__galaBridge.onMediaCommand((command, payload) => {
    const audioEl = document.querySelector('audio');

    switch (command) {
      case 'play':
        if (audioEl) audioEl.play().catch(() => {});
        simulateMediaSessionAction('play');
        break;

      case 'pause':
        if (audioEl) audioEl.pause();
        simulateMediaSessionAction('pause');
        break;

      case 'play-pause':
        if (audioEl) {
          if (audioEl.paused) {
            audioEl.play().catch(() => {});
            simulateMediaSessionAction('play');
          } else {
            audioEl.pause();
            simulateMediaSessionAction('pause');
          }
        }
        break;

      case 'next':
        simulateMediaSessionAction('nexttrack');
        break;

      case 'previous':
        simulateMediaSessionAction('previoustrack');
        break;

      case 'seek':
        if (audioEl && typeof payload === 'number') {
          audioEl.currentTime = payload / 1000;
          simulateMediaSessionAction('seekto', { seekTime: payload / 1000 });
        }
        break;
    }
  });

  // Helper to trigger actions registered by Apple Music on navigator.mediaSession
  function simulateMediaSessionAction(actionName, details) {
    if (!navigator.mediaSession) return;
    try {
      // In Chromium, standard action handler trigger
      const handler = navigator.mediaSession._actions && navigator.mediaSession._actions[actionName];
      if (typeof handler === 'function') {
        handler(details || { action: actionName });
      }
    } catch (_) {
      // Best-effort execution
    }
  }
})();
