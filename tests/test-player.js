import { createPlayerState, jumpPlayer, resolvePlayerX, updatePlayer } from '../scripts/player.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runPlayerTests() {
  const landscapeX = resolvePlayerX(960);
  const portraitX = resolvePlayerX(480);

  assert(landscapeX > portraitX, 'landscape player position should sit farther right than portrait');
  assert(portraitX < 120, 'narrow-screen player position should stay left of center');
  assert(portraitX > 60, 'narrow-screen player position should still keep a stable left safety margin');

  const player = createPlayerState({
    groundY: 220,
    x: landscapeX,
    height: 40,
    jumpVelocity: 680,
    gravity: 1800,
  });

  jumpPlayer(player);

  assert(player.isGrounded === false, 'player should leave the ground after jumping');
  assert(player.velocityY < 0, 'jump should launch the player upward');
  assert(player.jumpsUsed === 1, 'first jump should consume one jump');

  updatePlayer(player, 1 / 12);
  const velocityBeforeSecondJump = player.velocityY;
  jumpPlayer(player);

  assert(player.velocityY < velocityBeforeSecondJump, 'player should be able to trigger a second jump while airborne');
  assert(player.jumpsUsed === 2, 'second jump should consume the second jump charge');

  const velocityAfterSecondJump = player.velocityY;
  jumpPlayer(player);

  assert(player.velocityY === velocityAfterSecondJump, 'player should not be able to jump a third time before landing');
  assert(player.jumpsUsed === 2, 'third jump attempt should not increase jumps used');

  for (let index = 0; index < 90; index += 1) {
    updatePlayer(player, 1 / 60);
  }

  assert(player.isGrounded === true, 'player should land back on the ground');
  assert(player.y === player.baseY, 'player y should return to the base ground position');
  assert(player.jumpsUsed === 0, 'landing should reset jump charges');
}
