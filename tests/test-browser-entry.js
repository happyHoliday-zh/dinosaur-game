import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runBrowserEntryTests() {
  const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const indexPath = path.join(rootDir, 'index.html');
  const bundlePath = path.join(rootDir, 'scripts', 'browser-bundle.js');
  const html = fs.readFileSync(indexPath, 'utf8');

  assert(!html.includes('type="module"'), 'index.html should not depend on a module script entry');
  assert(
    html.includes('<script src="./scripts/browser-bundle.js"></script>'),
    'index.html should load the browser bundle entry script'
  );
  assert(fs.existsSync(bundlePath), 'browser bundle should exist for direct file:// launches');

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
      textContent: '',
      attributes: {},
      parentNode: null,
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

  const context = {
    console,
    Math,
    document: fakeDocument,
    window: fakeWindow,
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
  };
  context.globalThis = context;
  fakeWindow.document = fakeDocument;
  fakeWindow.requestAnimationFrame = context.requestAnimationFrame;
  fakeWindow.cancelAnimationFrame = context.cancelAnimationFrame;

  vm.runInNewContext(fs.readFileSync(bundlePath, 'utf8'), context, { filename: bundlePath });

  assert(context.window.game, 'browser bundle should initialize the game on window for direct file launches');

  fakeDocument.dispatch('keydown', {
    key: ' ',
    code: 'Space',
    preventDefault() {},
    defaultPrevented: false,
    target: elements.get('start-button'),
  });

  assert(context.window.game.state === 'running', 'browser bundle should start the game on space key input');
}
