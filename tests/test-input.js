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

  state = 'ready';
  documentTarget.dispatch('keydown', {
    key: ' ',
    defaultPrevented: true,
    preventDefault() {},
  });

  assert(started === 2, 'space key should still start the game even if a focused button marked the event as prevented');

  state = 'ready';
  documentTarget.dispatch('keyup', {
    key: ' ',
    preventDefault() {},
  });

  assert(started === 3, 'space keyup should also be able to start the game in environments that trigger lifecycle actions on keyup');

  state = 'ready';
  documentTarget.dispatch('keydown', {
    key: 'Unidentified',
    code: '',
    preventDefault() {},
  });

  assert(started === 4, 'ready state should start on generic non-modifier key input even when browser does not report space consistently');

  controller.destroy();
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;

  assert(restarted === 0, 'restart should not trigger during start test');
}
