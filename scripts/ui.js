function safeReadNumber(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function safeWriteNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures so the game remains playable.
  }
}

function safeReadBoolean(key) {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function safeWriteBoolean(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures so the game remains playable.
  }
}

function formatScore(value, digits = 5) {
  return String(Math.max(0, Math.floor(value))).padStart(digits, '0');
}

export function createUiController(config) {
  const scoreNode = document.getElementById('score');
  const highScoreNode = document.getElementById('high-score');
  const coinNode = document.getElementById('coin-count');
  const audioToggleNode = document.getElementById('audio-toggle');
  const startOverlay = document.getElementById('start-overlay');
  const gameOverOverlay = document.getElementById('game-over-overlay');
  const finalScoreNode = document.getElementById('final-score');
  const finalCoinsNode = document.getElementById('final-coins');

  const highScore = safeReadNumber(config.storageKeys.highScore);
  const totalCoins = safeReadNumber(config.storageKeys.totalCoins);
  const audioMuted = safeReadBoolean(config.storageKeys.audioMuted);

  function setOverlay(node, visible) {
    node.classList.toggle('overlay-visible', visible);
  }

  function syncHud({ score, highScoreValue, totalCoinsValue }) {
    scoreNode.textContent = formatScore(score);
    highScoreNode.textContent = formatScore(highScoreValue);
    coinNode.textContent = formatScore(totalCoinsValue, 3);
  }

  syncHud({ score: 0, highScoreValue: highScore, totalCoinsValue: totalCoins });

  return {
    getInitialProgress() {
      return { highScore, totalCoins, audioMuted };
    },
    showStart() {
      setOverlay(startOverlay, true);
      setOverlay(gameOverOverlay, false);
    },
    hideStart() {
      setOverlay(startOverlay, false);
    },
    showGameOver({ score, totalCoinsValue }) {
      finalScoreNode.textContent = formatScore(score);
      finalCoinsNode.textContent = formatScore(totalCoinsValue, 3);
      setOverlay(gameOverOverlay, true);
    },
    hideGameOver() {
      setOverlay(gameOverOverlay, false);
    },
    updateHud({ score, highScoreValue, totalCoinsValue }) {
      syncHud({ score, highScoreValue, totalCoinsValue });
    },
    bindAudioToggle(onToggle) {
      audioToggleNode?.addEventListener('click', onToggle);
    },
    updateAudioToggle(isMuted) {
      if (!audioToggleNode) {
        return;
      }

      audioToggleNode.textContent = isMuted ? 'MUSIC OFF' : 'MUSIC ON';
      audioToggleNode.setAttribute('aria-pressed', String(isMuted));
    },
    persistHighScore(value) {
      safeWriteNumber(config.storageKeys.highScore, value);
    },
    persistTotalCoins(value) {
      safeWriteNumber(config.storageKeys.totalCoins, value);
    },
    persistAudioMuted(value) {
      safeWriteBoolean(config.storageKeys.audioMuted, value);
    },
  };
}
