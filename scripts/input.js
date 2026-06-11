export function createInputController({ target, onJump, onStart, onRestart, getState }) {
  const documentTarget = globalThis.document ?? null;
  const windowTarget = globalThis.window ?? null;

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

  function handleKeyDown(event) {
    if (event.defaultPrevented) {
      return;
    }

    if (!isJumpKey(event) && event.code !== 'Enter' && event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    handleAction();
  }

  function handlePointerDown(event) {
    if (event.target.closest('button')) {
      return;
    }

    event.preventDefault();
    handleAction();
  }

  documentTarget?.addEventListener('keydown', handleKeyDown);
  windowTarget?.addEventListener('keydown', handleKeyDown);
  target.addEventListener('pointerdown', handlePointerDown);

  return {
    destroy() {
      documentTarget?.removeEventListener('keydown', handleKeyDown);
      windowTarget?.removeEventListener('keydown', handleKeyDown);
      target.removeEventListener('pointerdown', handlePointerDown);
    },
  };
}
