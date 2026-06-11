const OBSTACLE_TYPES = {
  slime: { width: 34, height: 22, offsetY: 0 },
  hound: { width: 42, height: 28, offsetY: 0 },
  guard: { width: 34, height: 38, offsetY: 0 },
};

export function createObstacleManager(config) {
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

export function createObstacle(type, manager) {
  const preset = OBSTACLE_TYPES[type] ?? OBSTACLE_TYPES.spike;

  return {
    type,
    x: manager.laneWidth + 40,
    y: manager.groundY - preset.height - preset.offsetY,
    width: preset.width,
    height: preset.height,
    passed: false,
  };
}

export function updateObstacles(manager, deltaTime) {
  for (const obstacle of manager.items) {
    obstacle.x -= manager.speed * deltaTime;
  }

  manager.items = manager.items.filter((obstacle) => obstacle.x + obstacle.width > -60);
}

export function detectCollision(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

export function shouldSpawnObstacle(manager, elapsedSinceLastSpawn, spawnGap) {
  return manager.items.length === 0 || elapsedSinceLastSpawn >= spawnGap;
}

export function getObstacleBounds(obstacle) {
  return {
    x: obstacle.x,
    y: obstacle.y,
    width: obstacle.width,
    height: obstacle.height,
  };
}

export function markPassedObstacles(manager, playerX, onPass) {
  for (const obstacle of manager.items) {
    if (!obstacle.passed && obstacle.x + obstacle.width < playerX) {
      obstacle.passed = true;
      onPass?.(obstacle);
    }
  }
}

export function spawnObstacle(manager, type) {
  const obstacle = createObstacle(type, manager);
  manager.items.push(obstacle);
  return obstacle;
}

export function listObstacleTypes() {
  return Object.keys(OBSTACLE_TYPES);
}
