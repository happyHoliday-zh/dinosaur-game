import { createAmbientAudioController } from '../scripts/audio.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createFakeEngine() {
  return {
    initCalls: 0,
    startCalls: 0,
    targetHistory: [],
    destroyed: false,
    async init() {
      this.initCalls += 1;
      return true;
    },
    async start() {
      this.startCalls += 1;
    },
    setTargetGain(value) {
      this.targetHistory.push(value);
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

export async function runAudioTests() {
  const engine = createFakeEngine();
  const audio = createAmbientAudioController({ engine, initialMuted: true });

  assert(audio.getSnapshot().muted === true, 'audio should honor initial muted state');

  await audio.startRun();

  assert(engine.initCalls === 1, 'audio should initialize engine on first run start');
  assert(engine.startCalls === 1, 'audio should start engine on first run start');
  assert(audio.getSnapshot().mode === 'running', 'audio mode should switch to running');
  assert(engine.targetHistory.at(-1) === 0, 'muted audio should keep ambient gain at zero');

  const muted = audio.toggleMute();
  assert(muted === false, 'toggleMute should disable mute on first toggle when initially muted');
  assert(engine.targetHistory.at(-1) > 0, 'unmuting should restore ambient gain');

  await audio.setGameOver();
  assert(audio.getSnapshot().mode === 'gameOver', 'game over should update audio mode');

  const unmuted = audio.toggleMute();
  assert(unmuted === true, 'toggleMute should enable mute on second toggle');
  assert(engine.targetHistory.at(-1) === 0, 'muting after game over should drive gain to zero');

  audio.destroy();
  assert(engine.destroyed === true, 'destroy should clean up the engine');
}
