export function createInputController({ target, onJump, onStart, onRestart, getState }) {
  const documentTarget = globalThis.document ?? null;
  const windowTarget = globalThis.window ?? null;
  const isModifierKey = (event) =>
    event.key === 'Shift' ||
    event.key === 'Control' ||
    event.key === 'Alt' ||
    event.key === 'Meta' ||
    event.key === 'CapsLock' ||
    event.key === 'Tab';

  const isJumpKey = (event) => {
    const code = event.code;
    const key = event.key;

    return (
      code === 'Space' ||
      code === 'ArrowUp' ||
      key === ' ' ||
      key === 'Spacebar' ||
      key === 'ArrowUp'
    );
  };

  function handleAction() {
    const state = getState();

    if (state === 'ready') {
      onStart();
      return;
    }

    if (state === 'gameOver') {
      onRestart();
      return;
    }

    onJump();
  }

  function handleKeyEvent(event, phase) {
    const state = getState();
    const isLifecycleKey = state === 'ready' || state === 'gameOver';
    const isExplicitActionKey = isJumpKey(event) || event.code === 'Enter' || event.key === 'Enter';
    const isGenericLifecycleKey = isLifecycleKey && !isModifierKey(event);

    if (!isExplicitActionKey && !isGenericLifecycleKey) {
      return;
    }

    if (phase === 'keyup' && !isLifecycleKey) {
      return;
    }

    if (phase === 'keypress' && !isLifecycleKey) {
      return;
    }

    if (event.defaultPrevented && !isLifecycleKey) {
      return;
    }

    event.preventDefault();
    handleAction();
  }

  function handleKeyDown(event) {
    handleKeyEvent(event, 'keydown');
  }

  function handleKeyUp(event) {
    handleKeyEvent(event, 'keyup');
  }

  function handleKeyPress(event) {
    handleKeyEvent(event, 'keypress');
  }

  function handlePointerDown(event) {
    if (event.target.closest('button')) {
      return;
    }

    event.preventDefault();
    handleAction();
  }

  documentTarget?.addEventListener('keydown', handleKeyDown, true);
  documentTarget?.addEventListener('keyup', handleKeyUp, true);
  documentTarget?.addEventListener('keypress', handleKeyPress, true);
  windowTarget?.addEventListener('keydown', handleKeyDown, true);
  windowTarget?.addEventListener('keyup', handleKeyUp, true);
  windowTarget?.addEventListener('keypress', handleKeyPress, true);
  target.addEventListener('pointerdown', handlePointerDown);

  return {
    destroy() {
      documentTarget?.removeEventListener('keydown', handleKeyDown, true);
      documentTarget?.removeEventListener('keyup', handleKeyUp, true);
      documentTarget?.removeEventListener('keypress', handleKeyPress, true);
      windowTarget?.removeEventListener('keydown', handleKeyDown, true);
      windowTarget?.removeEventListener('keyup', handleKeyUp, true);
      windowTarget?.removeEventListener('keypress', handleKeyPress, true);
      target.removeEventListener('pointerdown', handlePointerDown);
    },
  };
}
