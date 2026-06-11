import { createPlayerState, jumpPlayer, updatePlayer } from '../scripts/player.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runPlayerTests() {
  const player = createPlayerState({
    groundY: 220,
    height: 40,
    jumpVelocity: 680,
    gravity: 1800,
  });

  jumpPlayer(player);

  assert(player.isGrounded === false, 'player should leave the ground after jumping');
  assert(player.velocityY < 0, 'jump should launch the player upward');

  const velocityAfterFirstJump = player.velocityY;
  jumpPlayer(player);

  assert(player.velocityY === velocityAfterFirstJump, 'player should not double jump while airborne');

  for (let index = 0; index < 90; index += 1) {
    updatePlayer(player, 1 / 60);
  }

  assert(player.isGrounded === true, 'player should land back on the ground');
  assert(player.y === player.baseY, 'player y should return to the base ground position');
}
