import {
  createObstacleManager,
  updateObstacles,
  detectCollision,
} from '../scripts/obstacles.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runObstacleTests() {
  const manager = createObstacleManager({
    groundY: 220,
    laneWidth: 960,
    speed: 240,
  });

  manager.spawn('slime');

  assert(manager.items.length === 1, 'spawn should add one obstacle');

  const [obstacle] = manager.items;
  const originalX = obstacle.x;

  updateObstacles(manager, 0.5);

  assert(obstacle.x < originalX, 'obstacle should move left during update');

  const collides = detectCollision(
    { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height },
    { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height }
  );

  assert(collides === true, 'matching rectangles should collide');
}
