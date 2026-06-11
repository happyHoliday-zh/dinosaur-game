const MODE_GAINS = {
  idle: 0.035,
  running: 0.085,
  gameOver: 0.018,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createWebAudioEngine() {
  let audioContext = null;
  let masterGain = null;
  let droneGain = null;
  let windGain = null;
  let droneOscillator = null;
  let windFilter = null;
  let windSource = null;
  let hasStarted = false;

  function createNoiseBuffer(context) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  return {
    async init() {
      if (audioContext) {
        return true;
      }

      const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContextClass) {
        return false;
      }

      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioContext.destination);

      droneGain = audioContext.createGain();
      droneGain.gain.value = 0.22;
      droneGain.connect(masterGain);

      droneOscillator = audioContext.createOscillator();
      droneOscillator.type = 'triangle';
      droneOscillator.frequency.value = 46;
      droneOscillator.connect(droneGain);

      windGain = audioContext.createGain();
      windGain.gain.value = 0.12;
      windGain.connect(masterGain);

      windFilter = audioContext.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 720;
      windFilter.Q.value = 0.4;
      windFilter.connect(windGain);

      windSource = audioContext.createBufferSource();
      windSource.buffer = createNoiseBuffer(audioContext);
      windSource.loop = true;
      windSource.playbackRate.value = 0.25;
      windSource.connect(windFilter);

      return true;
    },
    async start() {
      if (!audioContext) {
        return false;
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      if (!hasStarted) {
        droneOscillator.start();
        windSource.start();
        hasStarted = true;
      }

      return true;
    },
    setTargetGain(value) {
      if (!audioContext || !masterGain) {
        return;
      }

      const now = audioContext.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.linearRampToValueAtTime(clamp(value, 0, 0.2), now + 0.35);
    },
    destroy() {
      try {
        droneOscillator?.stop();
      } catch {}

      try {
        windSource?.stop();
      } catch {}

      audioContext?.close?.();
      audioContext = null;
      masterGain = null;
      droneGain = null;
      windGain = null;
      droneOscillator = null;
      windFilter = null;
      windSource = null;
      hasStarted = false;
    },
  };
}

export function createAmbientAudioController({ engine = createWebAudioEngine(), initialMuted = false } = {}) {
  const state = {
    initialized: false,
    started: false,
    muted: initialMuted,
    mode: 'idle',
  };

  function applyGain() {
    const target = state.muted ? 0 : MODE_GAINS[state.mode];
    engine.setTargetGain(target);
  }

  async function ensureReady() {
    if (!state.initialized) {
      state.initialized = await engine.init();
    }

    if (state.initialized && !state.started) {
      await engine.start();
      state.started = true;
    }

    applyGain();
    return state.initialized;
  }

  return {
    async startRun() {
      state.mode = 'running';
      await ensureReady();
    },
    async setIdle() {
      state.mode = 'idle';
      await ensureReady();
    },
    async setGameOver() {
      state.mode = 'gameOver';
      await ensureReady();
    },
    toggleMute() {
      state.muted = !state.muted;
      applyGain();
      return state.muted;
    },
    getSnapshot() {
      return { ...state };
    },
    destroy() {
      engine.destroy();
    },
  };
}
