import {
  createCoinManager,
  createCoinPattern,
  updateCoins,
  collectCoins,
} from '../scripts/coins.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runCoinTests() {
  const manager = createCoinManager({
    laneWidth: 960,
    groundY: 220,
    speed: 240,
  });

  createCoinPattern(manager, {
    count: 3,
    startX: 500,
    baseY: 120,
    gap: 28,
  });

  assert(manager.items.length === 3, 'coin pattern should create multiple visible coins');

  const firstCoinX = manager.items[0].x;
  updateCoins(manager, 0.5);

  assert(manager.items[0].x < firstCoinX, 'coins should move left with the track');

  const collected = collectCoins(
    manager,
    {
      x: manager.items[0].x - 4,
      y: manager.items[0].y - 4,
      width: manager.items[0].width + 8,
      height: manager.items[0].height + 8,
    }
  );

  assert(collected === 1, 'player bounds should collect intersecting coin');
  assert(manager.items[0].collected === true, 'collected coin should be marked');
}
