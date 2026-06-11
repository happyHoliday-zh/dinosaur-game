import { createInputController } from '../scripts/input.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    dispatch(type, event) {
      const handler = listeners.get(type);
      if (handler) {
        handler(event);
      }
    },
  };
}

export function runInputTests() {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  const target = createEventTarget();
  let state = 'ready';
  let started = 0;
  let restarted = 0;
  let jumped = 0;

  globalThis.window = windowTarget;
  globalThis.document = documentTarget;

  const controller = createInputController({
    target,
    onJump: () => {
      jumped += 1;
    },
    onStart: () => {
      started += 1;
      state = 'running';
    },
    onRestart: () => {
      restarted += 1;
    },
    getState: () => state,
  });

  documentTarget.dispatch('keydown', {
    key: ' ',
    preventDefault() {},
  });

  assert(started === 1, 'space key should start the game from ready state');
  assert(jumped === 0, 'space should start the game before triggering jump');

  controller.destroy();
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;

  assert(restarted === 0, 'restart should not trigger during start test');
}
