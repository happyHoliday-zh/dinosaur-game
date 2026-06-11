function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function resolvePlayerX(trackWidth) {
  return Math.round(clamp(trackWidth * 0.21, 72, 220));
}

export function createPlayerState(config) {
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

export function jumpPlayer(player) {
  if (player.jumpsUsed >= player.maxJumps) {
    return false;
  }

  player.velocityY = -player.jumpVelocity;
  player.isGrounded = false;
  player.jumpsUsed += 1;
  return true;
}

export function updatePlayer(player, deltaTime) {
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

export function getPlayerBounds(player) {
  return {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
  };
}
