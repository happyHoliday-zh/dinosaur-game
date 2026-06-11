import { DungeonRunnerGame } from '../scripts/game.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createClassList() {
  const classes = new Set();

  return {
    add(...values) {
      values.forEach((value) => classes.add(value));
    },
    remove(...values) {
      values.forEach((value) => classes.delete(value));
    },
    toggle(value, force) {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }

        classes.add(value);
        return true;
      }

      if (force) {
        classes.add(value);
        return true;
      }

      classes.delete(value);
      return false;
    },
    contains(value) {
      return classes.has(value);
    },
  };
}

function createElement(id, options = {}) {
  const listeners = new Map();
  const element = {
    id,
    tagName: options.tagName ?? 'DIV',
    style: {},
    classList: createClassList(),
    children: [],
    clientWidth: options.clientWidth ?? 0,
    clientHeight: options.clientHeight ?? 0,
    innerHTML: '',
    textContent: '',
    attributes: {},
    closest(selector) {
      if (selector === 'button' && this.tagName === 'BUTTON') {
        return this;
      }

      return null;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      listeners.set(
        type,
        handlers.filter((item) => item !== handler)
      );
    },
    dispatchEvent(type, event = {}) {
      const handlers = listeners.get(type) ?? [];
      handlers.forEach((handler) => handler(event));
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
    },
    remove() {
      this.parentNode?.removeChild?.(this);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    focus() {},
  };

  Object.defineProperty(element, 'innerHTML', {
    get() {
      return '';
    },
    set() {
      element.children = [];
    },
  });

  return element;
}

export function runGameStartTests() {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  const elements = new Map();
  const ids = [
    ['game-root', { clientWidth: 960, clientHeight: 420 }],
    ['game-track', { clientWidth: 960, clientHeight: 420 }],
    ['player', {}],
    ['player-sprite', {}],
    ['coin-layer', {}],
    ['obstacle-layer', {}],
    ['start-button', { tagName: 'BUTTON' }],
    ['restart-button', { tagName: 'BUTTON' }],
    ['score', {}],
    ['high-score', {}],
    ['coin-count', {}],
    ['audio-toggle', { tagName: 'BUTTON' }],
    ['start-overlay', {}],
    ['game-over-overlay', {}],
    ['final-score', {}],
    ['final-coins', {}],
  ];

  ids.forEach(([id, options]) => {
    elements.set(id, createElement(id, options));
  });

  const documentListeners = new Map();
  const fakeDocument = {
    getElementById(id) {
      return elements.get(id) ?? null;
    },
    createElement(tagName) {
      return createElement('', { tagName: tagName.toUpperCase() });
    },
    addEventListener(type, handler) {
      const handlers = documentListeners.get(type) ?? [];
      handlers.push(handler);
      documentListeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = documentListeners.get(type) ?? [];
      documentListeners.set(
        type,
        handlers.filter((item) => item !== handler)
      );
    },
    dispatch(type, event) {
      const handlers = documentListeners.get(type) ?? [];
      handlers.forEach((handler) => handler(event));
    },
  };

  const windowListeners = new Map();
  const fakeWindow = {
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    addEventListener(type, handler) {
      const handlers = windowListeners.get(type) ?? [];
      handlers.push(handler);
      windowListeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = windowListeners.get(type) ?? [];
      windowListeners.set(
        type,
        handlers.filter((item) => item !== handler)
      );
    },
  };

  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};

  const game = new DungeonRunnerGame(elements.get('game-root'));

  fakeDocument.dispatch('keydown', {
    key: ' ',
    code: 'Space',
    preventDefault() {},
    defaultPrevented: false,
    target: elements.get('start-button'),
  });

  assert(game.state === 'running', 'space key should start the game from the ready screen in an integrated game instance');

  globalThis.document = originalDocument;
  globalThis.window = originalWindow;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
}
