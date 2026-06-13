import { runPlayerTests } from './test-player.js';
import { runObstacleTests } from './test-obstacles.js';
import { runInputTests } from './test-input.js';
import { runCoinTests } from './test-coins.js';
import { runAudioTests } from './test-audio.js';
import { runGameStartTests } from './test-game-start.js';
import { runBrowserEntryTests } from './test-browser-entry.js';

const suites = [
  ['player', runPlayerTests],
  ['obstacles', runObstacleTests],
  ['input', runInputTests],
  ['coins', runCoinTests],
  ['audio', runAudioTests],
  ['game-start', runGameStartTests],
  ['browser-entry', runBrowserEntryTests],
];

const failures = [];

for (const [name, suite] of suites) {
  try {
    suite();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

if (failures.length > 0) {
  throw new Error(`${failures.length} test suite(s) failed`);
}

console.log('ALL TESTS PASSED');
