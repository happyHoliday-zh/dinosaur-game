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
  };
}

export function jumpPlayer(player) {
  if (!player.isGrounded) {
    return false;
  }

  player.velocityY = -player.jumpVelocity;
  player.isGrounded = false;
  return true;
}

export function updatePlayer(player, deltaTime) {
  player.velocityY += player.gravity * deltaTime;
  player.y += player.velocityY * deltaTime;

  if (player.y >= player.baseY) {
    player.y = player.baseY;
    player.velocityY = 0;
    player.isGrounded = true;
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
