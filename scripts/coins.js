import { detectCollision } from './obstacles.js';

export function createCoinManager(config) {
  return {
    items: [],
    laneWidth: config.laneWidth,
    groundY: config.groundY,
    speed: config.speed,
  };
}

export function createCoinPattern(manager, pattern) {
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

export function updateCoins(manager, deltaTime) {
  for (const coin of manager.items) {
    coin.x -= manager.speed * deltaTime;

    if (coin.sparkle > 0) {
      coin.sparkle = Math.max(0, coin.sparkle - deltaTime);
    }
  }

  manager.items = manager.items.filter((coin) => coin.x + coin.width > -40 && !coin.collected);
}

export function collectCoins(manager, playerBounds) {
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
