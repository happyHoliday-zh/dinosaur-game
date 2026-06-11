import { DungeonRunnerGame } from './game.js';

const root = document.getElementById('game-root');

if (root) {
  new DungeonRunnerGame(root);
}
