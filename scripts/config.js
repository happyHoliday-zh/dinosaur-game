export const GAME_CONFIG = {
  width: 960,
  height: 420,
  groundOffset: 58,
  scoreRate: 18,
  pointsPerObstacle: 25,
  coinPatternDistance: 200,
  spawnDelayRange: [0.95, 1.65],
  obstacleTypes: ['spike', 'skull', 'fire'],
  player: {
    width: 40,
    height: 40,
    jumpVelocity: 680,
    gravity: 1800,
    x: 176,
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

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
