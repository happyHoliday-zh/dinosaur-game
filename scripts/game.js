import { GAME_CONFIG, clamp, randomBetween } from './config.js';
import { createAmbientAudioController } from './audio.js';
import { collectCoins, createCoinManager, createCoinPattern, shouldSpawnCoinPattern, updateCoins } from './coins.js';
import { createInputController } from './input.js';
import { createObstacleManager, detectCollision, getObstacleBounds, listObstacleTypes, markPassedObstacles, shouldSpawnObstacle, updateObstacles } from './obstacles.js';
import { createPlayerState, getPlayerBounds, jumpPlayer, resolvePlayerX, updatePlayer } from './player.js';
import { createUiController } from './ui.js';

export class DungeonRunnerGame {
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
    const isPortrait = trackHeight > trackWidth;

    this.player = createPlayerState({
      ...GAME_CONFIG.player,
      x: resolvePlayerX(trackWidth, isPortrait),
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
    const isPortrait = trackHeight > trackWidth;

    if (!this.player) {
      return;
    }

    const heightAboveGround = this.player.baseY - this.player.y;

    this.player.x = resolvePlayerX(trackWidth, isPortrait);
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
