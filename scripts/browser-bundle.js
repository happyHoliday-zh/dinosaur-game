(function () {
  const GAME_CONFIG = {
    width: 960,
    height: 420,
    groundOffset: 58,
    scoreRate: 18,
    pointsPerObstacle: 25,
    coinPatternDistance: 320,
    spawnDelayRange: [0.95, 1.65],
    obstacleTypes: ['spike', 'skull', 'fire'],
    player: {
      width: 40,
      height: 40,
      jumpVelocity: 680,
      gravity: 1800,
      x: 204,
    },
    movement: {
      baseSpeed: 290,
      maxSpeed: 520,
      acceleration: 8,
    },
    storageKeys: {
      highScore: 'dungeon-runner-high-score',
      totalCoins: 'dungeon-runner-total-coins',
      audioMuted: 'dungeon-runner-audio-muted',
    },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

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
    } catch {}
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
    } catch {}
  }

  function formatScore(value, digits = 5) {
    return String(Math.max(0, Math.floor(value))).padStart(digits, '0');
  }

  function createUiController(config) {
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

  const MODE_GAINS = {
    idle: 0.035,
    running: 0.085,
    gameOver: 0.018,
  };

  function createWebAudioEngine() {
    let audioContext = null;
    let masterGain = null;
    let droneGain = null;
    let windGain = null;
    let droneOscillator = null;
    let windFilter = null;
    let windSource = null;
    let hasStarted = false;

    function createNoiseBuffer(context) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const channel = buffer.getChannelData(0);

      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }

      return buffer;
    }

    return {
      async init() {
        if (audioContext) {
          return true;
        }

        const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!AudioContextClass) {
          return false;
        }

        audioContext = new AudioContextClass();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(audioContext.destination);

        droneGain = audioContext.createGain();
        droneGain.gain.value = 0.22;
        droneGain.connect(masterGain);

        droneOscillator = audioContext.createOscillator();
        droneOscillator.type = 'triangle';
        droneOscillator.frequency.value = 46;
        droneOscillator.connect(droneGain);

        windGain = audioContext.createGain();
        windGain.gain.value = 0.12;
        windGain.connect(masterGain);

        windFilter = audioContext.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 720;
        windFilter.Q.value = 0.4;
        windFilter.connect(windGain);

        windSource = audioContext.createBufferSource();
        windSource.buffer = createNoiseBuffer(audioContext);
        windSource.loop = true;
        windSource.playbackRate.value = 0.25;
        windSource.connect(windFilter);

        return true;
      },
      async start() {
        if (!audioContext) {
          return false;
        }

        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        if (!hasStarted) {
          droneOscillator.start();
          windSource.start();
          hasStarted = true;
        }

        return true;
      },
      setTargetGain(value) {
        if (!audioContext || !masterGain) {
          return;
        }

        const now = audioContext.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.linearRampToValueAtTime(clamp(value, 0, 0.2), now + 0.35);
      },
      destroy() {
        try {
          droneOscillator?.stop();
        } catch {}

        try {
          windSource?.stop();
        } catch {}

        audioContext?.close?.();
        audioContext = null;
        masterGain = null;
        droneGain = null;
        windGain = null;
        droneOscillator = null;
        windFilter = null;
        windSource = null;
        hasStarted = false;
      },
    };
  }

  function createAmbientAudioController({ engine = createWebAudioEngine(), initialMuted = false } = {}) {
    const state = {
      initialized: false,
      started: false,
      muted: initialMuted,
      mode: 'idle',
    };

    function applyGain() {
      const target = state.muted ? 0 : MODE_GAINS[state.mode];
      engine.setTargetGain(target);
    }

    async function ensureReady() {
      if (!state.initialized) {
        state.initialized = await engine.init();
      }

      if (state.initialized && !state.started) {
        await engine.start();
        state.started = true;
      }

      applyGain();
      return state.initialized;
    }

    return {
      async startRun() {
        state.mode = 'running';
        await ensureReady();
      },
      async setIdle() {
        state.mode = 'idle';
        await ensureReady();
      },
      async setGameOver() {
        state.mode = 'gameOver';
        await ensureReady();
      },
      toggleMute() {
        state.muted = !state.muted;
        applyGain();
        return state.muted;
      },
      getSnapshot() {
        return { ...state };
      },
      destroy() {
        engine.destroy();
      },
    };
  }

  const OBSTACLE_TYPES = {
    slime: { width: 34, height: 22, offsetY: 0 },
    hound: { width: 42, height: 28, offsetY: 0 },
    guard: { width: 34, height: 38, offsetY: 0 },
  };

  function createObstacleManager(config) {
    return {
      items: [],
      speed: config.speed,
      laneWidth: config.laneWidth,
      groundY: config.groundY,
      spawn(type) {
        return spawnObstacle(this, type);
      },
    };
  }

  function createObstacle(type, manager) {
    const preset = OBSTACLE_TYPES[type] ?? OBSTACLE_TYPES.slime;

    return {
      type,
      x: manager.laneWidth + 40,
      y: manager.groundY - preset.height - preset.offsetY,
      width: preset.width,
      height: preset.height,
      passed: false,
    };
  }

  function updateObstacles(manager, deltaTime) {
    for (const obstacle of manager.items) {
      obstacle.x -= manager.speed * deltaTime;
    }

    manager.items = manager.items.filter((obstacle) => obstacle.x + obstacle.width > -60);
  }

  function detectCollision(first, second) {
    return (
      first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y
    );
  }

  function shouldSpawnObstacle(manager, elapsedSinceLastSpawn, spawnGap) {
    return manager.items.length === 0 || elapsedSinceLastSpawn >= spawnGap;
  }

  function getObstacleBounds(obstacle) {
    return {
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
    };
  }

  function markPassedObstacles(manager, playerX, onPass) {
    for (const obstacle of manager.items) {
      if (!obstacle.passed && obstacle.x + obstacle.width < playerX) {
        obstacle.passed = true;
        onPass?.(obstacle);
      }
    }
  }

  function spawnObstacle(manager, type) {
    const obstacle = createObstacle(type, manager);
    manager.items.push(obstacle);
    return obstacle;
  }

  function listObstacleTypes() {
    return Object.keys(OBSTACLE_TYPES);
  }

  function createCoinManager(config) {
    return {
      items: [],
      laneWidth: config.laneWidth,
      groundY: config.groundY,
      speed: config.speed,
    };
  }

  function createCoinPattern(manager, pattern) {
    const { count, startX, baseY, gap } = pattern;

    for (let index = 0; index < count; index += 1) {
      manager.items.push({
        x: startX + index * gap,
        y: baseY,
        width: 18,
        height: 18,
        collected: false,
        sparkle: 0,
      });
    }
  }

  function updateCoins(manager, deltaTime) {
    for (const coin of manager.items) {
      coin.x -= manager.speed * deltaTime;

      if (coin.sparkle > 0) {
        coin.sparkle = Math.max(0, coin.sparkle - deltaTime);
      }
    }

    manager.items = manager.items.filter((coin) => coin.x + coin.width > -40 && !coin.collected);
  }

  function collectCoins(manager, playerBounds) {
    let collected = 0;

    for (const coin of manager.items) {
      if (coin.collected) {
        continue;
      }

      if (detectCollision(playerBounds, coin)) {
        coin.collected = true;
        coin.sparkle = 0.18;
        collected += 1;
      }
    }

    return collected;
  }

  function shouldSpawnCoinPattern(distanceSinceLastPattern, gapDistance) {
    return distanceSinceLastPattern >= gapDistance;
  }

  function resolvePlayerX(trackWidth) {
    return Math.round(clamp(trackWidth * 0.21, 72, 220));
  }

  function createPlayerState(config) {
    const baseY = config.groundY - config.height;

    return {
      x: config.x ?? 120,
      y: baseY,
      width: config.width ?? 40,
      height: config.height,
      baseY,
      velocityY: 0,
      gravity: config.gravity,
      jumpVelocity: config.jumpVelocity,
      isGrounded: true,
      maxJumps: config.maxJumps ?? 2,
      jumpsUsed: 0,
    };
  }

  function jumpPlayer(player) {
    if (player.jumpsUsed >= player.maxJumps) {
      return false;
    }

    player.velocityY = -player.jumpVelocity;
    player.isGrounded = false;
    player.jumpsUsed += 1;
    return true;
  }

  function updatePlayer(player, deltaTime) {
    player.velocityY += player.gravity * deltaTime;
    player.y += player.velocityY * deltaTime;

    if (player.y >= player.baseY) {
      player.y = player.baseY;
      player.velocityY = 0;
      player.isGrounded = true;
      player.jumpsUsed = 0;
    }

    return player;
  }

  function getPlayerBounds(player) {
    return {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
    };
  }

  function createInputController({ target, onJump, onStart, onRestart, getState }) {
    const documentTarget = globalThis.document ?? null;
    const windowTarget = globalThis.window ?? null;

    const isModifierKey = (event) =>
      event.key === 'Shift' ||
      event.key === 'Control' ||
      event.key === 'Alt' ||
      event.key === 'Meta' ||
      event.key === 'CapsLock' ||
      event.key === 'Tab';

    const isJumpKey = (event) => {
      const code = event.code;
      const key = event.key;

      return code === 'Space' || code === 'ArrowUp' || key === ' ' || key === 'Spacebar' || key === 'ArrowUp';
    };

    function handleAction() {
      const state = getState();

      if (state === 'ready') {
        onStart();
        return;
      }

      if (state === 'gameOver') {
        onRestart();
        return;
      }

      onJump();
    }

    function handleKeyEvent(event, phase) {
      const state = getState();
      const isLifecycleKey = state === 'ready' || state === 'gameOver';
      const isExplicitActionKey = isJumpKey(event) || event.code === 'Enter' || event.key === 'Enter';
      const isGenericLifecycleKey = isLifecycleKey && !isModifierKey(event);

      if (!isExplicitActionKey && !isGenericLifecycleKey) {
        return;
      }

      if (phase === 'keyup' && !isLifecycleKey) {
        return;
      }

      if (phase === 'keypress' && !isLifecycleKey) {
        return;
      }

      if (event.defaultPrevented && !isLifecycleKey) {
        return;
      }

      event.preventDefault();
      handleAction();
    }

    function handleKeyDown(event) {
      handleKeyEvent(event, 'keydown');
    }

    function handleKeyUp(event) {
      handleKeyEvent(event, 'keyup');
    }

    function handleKeyPress(event) {
      handleKeyEvent(event, 'keypress');
    }

    function handlePointerDown(event) {
      if (event.target.closest('button')) {
        return;
      }

      event.preventDefault();
      handleAction();
    }

    documentTarget?.addEventListener('keydown', handleKeyDown, true);
    documentTarget?.addEventListener('keyup', handleKeyUp, true);
    documentTarget?.addEventListener('keypress', handleKeyPress, true);
    windowTarget?.addEventListener('keydown', handleKeyDown, true);
    windowTarget?.addEventListener('keyup', handleKeyUp, true);
    windowTarget?.addEventListener('keypress', handleKeyPress, true);
    target.addEventListener('pointerdown', handlePointerDown);

    return {
      destroy() {
        documentTarget?.removeEventListener('keydown', handleKeyDown, true);
        documentTarget?.removeEventListener('keyup', handleKeyUp, true);
        documentTarget?.removeEventListener('keypress', handleKeyPress, true);
        windowTarget?.removeEventListener('keydown', handleKeyDown, true);
        windowTarget?.removeEventListener('keyup', handleKeyUp, true);
        windowTarget?.removeEventListener('keypress', handleKeyPress, true);
        target.removeEventListener('pointerdown', handlePointerDown);
      },
    };
  }

  class DungeonRunnerGame {
    constructor(root) {
      this.root = root;
      this.track = document.getElementById('game-track');
      this.playerNode = document.getElementById('player');
      this.playerSpriteNode = document.getElementById('player-sprite');
      this.coinLayer = document.getElementById('coin-layer');
      this.obstacleLayer = document.getElementById('obstacle-layer');
      this.startButton = document.getElementById('start-button');
      this.restartButton = document.getElementById('restart-button');
      this.ui = createUiController(GAME_CONFIG);

      this.rafId = 0;
      this.lastTime = 0;
      this.spawnTimer = 0;
      this.spawnDelay = randomBetween(...GAME_CONFIG.spawnDelayRange);
      this.coinDistanceTimer = 0;
      this.state = 'ready';
      this.score = 0;
      this.currentRunCoins = 0;

      const initialProgress = this.ui.getInitialProgress();
      this.highScore = initialProgress.highScore;
      this.totalCoins = initialProgress.totalCoins;
      this.audio = createAmbientAudioController({
        initialMuted: initialProgress.audioMuted,
      });

      this.bindUi();
      this.createSession();
      this.attachInput();
      this.attachResizeHandling();
      this.ui.showStart();
      this.focusGame();
      this.render();
    }

    bindUi() {
      this.startButton.addEventListener('click', () => this.start());
      this.restartButton.addEventListener('click', () => this.restart());
      this.startButton.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          this.start();
        }
      });
      this.restartButton.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          this.restart();
        }
      });
      this.ui.bindAudioToggle(() => {
        const isMuted = this.audio.toggleMute();
        this.ui.updateAudioToggle(isMuted);
        this.ui.persistAudioMuted(isMuted);
      });
      this.ui.updateAudioToggle(this.audio.getSnapshot().muted);
    }

    focusGame() {
      this.root.focus?.({ preventScroll: true });
    }

    attachResizeHandling() {
      this.handleResize = () => {
        this.refreshLayoutMetrics();
        this.render();
      };

      window.addEventListener('resize', this.handleResize);
    }

    createSession() {
      const trackWidth = this.track.clientWidth || GAME_CONFIG.width;
      const trackHeight = this.track.clientHeight || GAME_CONFIG.height;
      const groundY = trackHeight - GAME_CONFIG.groundOffset;

      this.player = createPlayerState({
        ...GAME_CONFIG.player,
        x: resolvePlayerX(trackWidth),
        groundY,
      });

      this.obstacleManager = createObstacleManager({
        groundY,
        laneWidth: trackWidth,
        speed: GAME_CONFIG.movement.baseSpeed,
      });
      this.coinManager = createCoinManager({
        groundY,
        laneWidth: trackWidth,
        speed: GAME_CONFIG.movement.baseSpeed,
      });

      this.clearObstacles();
      this.clearCoins();
      this.playerSpriteNode.classList.remove('player-jumping');
      this.playerSpriteNode.classList.add('player-running');
    }

    refreshLayoutMetrics() {
      const trackWidth = this.track.clientWidth || GAME_CONFIG.width;
      const trackHeight = this.track.clientHeight || GAME_CONFIG.height;
      const groundY = trackHeight - GAME_CONFIG.groundOffset;

      if (!this.player) {
        return;
      }

      const heightAboveGround = this.player.baseY - this.player.y;

      this.player.x = resolvePlayerX(trackWidth);
      this.player.baseY = groundY - this.player.height;
      this.player.y = this.player.baseY - heightAboveGround;

      this.obstacleManager.laneWidth = trackWidth;
      this.obstacleManager.groundY = groundY;
      this.coinManager.laneWidth = trackWidth;
      this.coinManager.groundY = groundY;
    }

    attachInput() {
      this.input = createInputController({
        target: this.root,
        onJump: () => this.jump(),
        onStart: () => this.start(),
        onRestart: () => this.restart(),
        getState: () => this.state,
      });
    }

    clearObstacles() {
      this.obstacleManager.items = [];
      this.obstacleLayer.innerHTML = '';
    }

    clearCoins() {
      this.coinManager.items = [];
      this.coinLayer.innerHTML = '';
    }

    start() {
      if (this.state === 'running') {
        return;
      }

      this.state = 'running';
      this.lastTime = 0;
      this.spawnTimer = 0;
      this.spawnDelay = randomBetween(...GAME_CONFIG.spawnDelayRange);
      this.coinDistanceTimer = 0;
      this.ui.hideStart();
      this.ui.hideGameOver();
      this.focusGame();
      this.audio.startRun();

      if (!this.rafId) {
        this.rafId = requestAnimationFrame((timestamp) => this.frame(timestamp));
      }
    }

    restart() {
      this.score = 0;
      this.currentRunCoins = 0;
      this.createSession();
      this.ui.updateHud({
        score: this.score,
        highScoreValue: this.highScore,
        totalCoinsValue: this.totalCoins,
      });
      this.focusGame();
      this.start();
    }

    jump() {
      if (this.state !== 'running') {
        return;
      }

      const didJump = jumpPlayer(this.player);
      this.playerSpriteNode.classList.toggle('player-jumping', didJump && !this.player.isGrounded);
    }

    frame(timestamp) {
      if (this.state !== 'running') {
        this.rafId = 0;
        return;
      }

      if (!this.lastTime) {
        this.lastTime = timestamp;
      }

      const deltaTime = Math.min(0.032, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      this.update(deltaTime);
      this.render();
      this.rafId = requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp));
    }

    update(deltaTime) {
      updatePlayer(this.player, deltaTime);

      if (this.player.isGrounded) {
        this.playerSpriteNode.classList.remove('player-jumping');
      }

      const speedBoost = this.score * GAME_CONFIG.movement.acceleration * 0.02;
      const laneSpeed = clamp(
        GAME_CONFIG.movement.baseSpeed + speedBoost,
        GAME_CONFIG.movement.baseSpeed,
        GAME_CONFIG.movement.maxSpeed
      );
      this.obstacleManager.speed = laneSpeed;
      this.coinManager.speed = laneSpeed;

      this.spawnTimer += deltaTime;
      this.coinDistanceTimer += laneSpeed * deltaTime;

      if (shouldSpawnObstacle(this.obstacleManager, this.spawnTimer, this.spawnDelay)) {
        this.spawnObstacle();
        this.spawnTimer = 0;
        this.spawnDelay = randomBetween(...GAME_CONFIG.spawnDelayRange);
      }

      updateObstacles(this.obstacleManager, deltaTime);
      updateCoins(this.coinManager, deltaTime);

      markPassedObstacles(this.obstacleManager, this.player.x, () => {
        this.score += GAME_CONFIG.pointsPerObstacle;
      });

      this.score += deltaTime * GAME_CONFIG.scoreRate;

      const playerBounds = getPlayerBounds(this.player);
      const collectedCoins = collectCoins(this.coinManager, playerBounds);

      if (collectedCoins > 0) {
        this.currentRunCoins += collectedCoins;
        this.totalCoins += collectedCoins;
      }

      if (shouldSpawnCoinPattern(this.coinDistanceTimer, GAME_CONFIG.coinPatternDistance)) {
        this.spawnCoinPattern();
        this.coinDistanceTimer = 0;
      }

      for (const obstacle of this.obstacleManager.items) {
        if (detectCollision(playerBounds, getObstacleBounds(obstacle))) {
          this.handleGameOver();
          return;
        }
      }

      this.highScore = Math.max(this.highScore, Math.floor(this.score));
      this.ui.updateHud({
        score: this.score,
        highScoreValue: this.highScore,
        totalCoinsValue: this.totalCoins,
      });
    }

    spawnObstacle() {
      const types = listObstacleTypes();
      const type = types[Math.floor(Math.random() * types.length)];
      const obstacle = this.obstacleManager.spawn(type);
      const node = document.createElement('div');
      node.className = `obstacle obstacle-${obstacle.type}`;
      obstacle.node = node;
      this.obstacleLayer.appendChild(node);
    }

    spawnCoinPattern() {
      const jumpArcY = Math.max(76, this.player.baseY - 88);

      createCoinPattern(this.coinManager, {
        count: 3 + Math.floor(Math.random() * 3),
        startX: this.coinManager.laneWidth + 30,
        baseY: jumpArcY - Math.floor(Math.random() * 16),
        gap: 30,
      });

      for (const coin of this.coinManager.items) {
        if (coin.node) {
          continue;
        }

        const node = document.createElement('div');
        node.className = 'coin';
        coin.node = node;
        this.coinLayer.appendChild(node);
      }
    }

    handleGameOver() {
      this.state = 'gameOver';
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.audio.setGameOver();
      this.ui.persistHighScore(this.highScore);
      this.ui.persistTotalCoins(this.totalCoins);
      this.ui.showGameOver({
        score: this.score,
        totalCoinsValue: this.totalCoins,
      });
      this.focusGame();
    }

    render() {
      this.playerNode.style.transform = `translate3d(${this.player.x}px, ${this.player.y}px, 0)`;

      for (const coin of this.coinManager.items) {
        if (!coin.node) {
          continue;
        }

        coin.node.style.transform = `translate3d(${coin.x}px, ${coin.y}px, 0) scale(${coin.collected ? 0.35 : 1})`;
        coin.node.style.opacity = coin.collected ? '0' : '1';
      }

      for (const obstacle of this.obstacleManager.items) {
        if (!obstacle.node) {
          continue;
        }

        obstacle.node.style.transform = `translate3d(${obstacle.x}px, ${obstacle.y}px, 0)`;
      }

      const liveCoinNodes = new Set(this.coinManager.items.map((item) => item.node));
      for (const child of [...this.coinLayer.children]) {
        if (!liveCoinNodes.has(child)) {
          child.remove();
        }
      }

      const liveNodes = new Set(this.obstacleManager.items.map((item) => item.node));
      for (const child of [...this.obstacleLayer.children]) {
        if (!liveNodes.has(child)) {
          child.remove();
        }
      }
    }
  }

  const root = document.getElementById('game-root');

  if (root) {
    window.game = new DungeonRunnerGame(root);
  }
})();
