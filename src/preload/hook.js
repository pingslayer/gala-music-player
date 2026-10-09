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
    // Attempt to use Apple's native MusicKit for bulletproof media control
    const mk = window.MusicKit && window.MusicKit.getInstance ? window.MusicKit.getInstance() : null;
    const audioEl = document.querySelector('audio');

    switch (command) {
      case 'play':
        if (mk) mk.play();
        else if (audioEl) audioEl.play().catch(() => {});
        break;

      case 'pause':
        if (mk) mk.pause();
        else if (audioEl) audioEl.pause();
        break;

      case 'play-pause':
        if (mk) {
          mk.isPlaying ? mk.pause() : mk.play();
        } else if (audioEl) {
          audioEl.paused ? audioEl.play().catch(() => {}) : audioEl.pause();
        }
        break;

      case 'next':
        if (mk) {
          mk.skipToNextItem();
        } else {
          const nextBtn = document.querySelector('button[aria-label*="Next"], button[data-testid*="next"]');
          if (nextBtn) nextBtn.click();
        }
        break;

      case 'previous':
        if (mk) {
          mk.skipToPreviousItem();
        } else {
          const prevBtn = document.querySelector('button[aria-label*="Previous"], button[data-testid*="previous"]');
          if (prevBtn) prevBtn.click();
        }
        break;

      case 'seek':
        const targetSecs = typeof payload === 'number' ? payload / 1000 : 0;
        if (mk) {
          mk.seekToTime(targetSecs);
        } else if (audioEl) {
          audioEl.currentTime = targetSecs;
        }
        break;
    }
  });
})();
