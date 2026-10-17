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
  let lastPositionReportTime = 0;

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

      // Extract duration if an audio element is active and has a finite duration
      const audioEl = document.querySelector('audio');
      const duration = audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0 ? audioEl.duration : 0;

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

    // Report position every 2 seconds to avoid flooding IPC during heavy canvas/lyrics rendering
    const now = Date.now();
    if (audioEl && isPlaying && now - lastPositionReportTime >= 2000) {
      lastPositionReportTime = now;
      window.__galaBridge.sendPositionUpdate(Math.round(audioEl.currentTime * 1000));
    }
  }

  // Poll state smoothly every 500ms (minimal CPU overhead)
  setInterval(checkMediaSession, 500);

  // 2. Poll for MusicKit instance safely (avoiding re-initialization throws like Sidra does)
  let cachedMk = null;
  setInterval(() => {
    if (!window.MusicKit || typeof window.MusicKit.getInstance !== 'function') return;
    try {
      const mk = window.MusicKit.getInstance();
      if (mk && mk !== cachedMk) {
        cachedMk = mk;
      }
    } catch (_) {
      // Apple Music routinely destroys and re-initializes MusicKit during navigation.
      // getInstance() throws during this phase. Catch and ignore until engine is stable.
    }
  }, 500);

  // 3. Handle Inbound MPRIS media commands from Electron Main
  window.__galaBridge.onMediaCommand((command, payload) => {
    const audioEl = document.querySelector('audio');

    switch (command) {
      case 'play':
        if (cachedMk) cachedMk.play();
        else if (audioEl) audioEl.play().catch(() => {});
        break;

      case 'pause':
        if (cachedMk) cachedMk.pause();
        else if (audioEl) audioEl.pause();
        break;

      case 'play-pause':
        if (cachedMk) {
          cachedMk.isPlaying ? cachedMk.pause() : cachedMk.play();
        } else if (audioEl) {
          audioEl.paused ? audioEl.play().catch(() => {}) : audioEl.pause();
        }
        break;

      case 'next':
        if (cachedMk) cachedMk.skipToNextItem();
        break;

      case 'previous':
        if (cachedMk) cachedMk.skipToPreviousItem();
        break;

      case 'seek':
        const targetSecs = typeof payload === 'number' ? payload / 1000 : 0;
        if (cachedMk) {
          cachedMk.seekToTime(targetSecs);
        } else if (audioEl) {
          audioEl.currentTime = targetSecs;
        }
        break;
    }
  });
})();
