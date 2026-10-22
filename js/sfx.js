// Short sound effects made in the browser with the Web Audio API, so the
// game needs no sound files. Every sound is optional: if audio is
// unavailable or switched off, the game is silent.

let audio = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

function context() {
  if (!audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audio = new AudioContext();
  }
  if (audio.state === 'suspended') {
    audio.resume();
  }
  return audio;
}

// Plays one note: frequency in Hz, length in seconds, starting `delay`
// seconds from now.
function tone(frequency, length, { type = 'sine', delay = 0, volume = 0.06, slideTo = null } = {}) {
  if (!enabled) {
    return;
  }
  try {
    const ctx = context();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  } catch {
    // No audio available.
  }
}

export const sfx = {
  click() {
    tone(520, 0.05, { type: 'square', volume: 0.025 });
  },
  clue() {
    tone(1400, 0.07, { type: 'square', volume: 0.03 });
    tone(900, 0.09, { type: 'square', volume: 0.025, delay: 0.06 });
  },
  arrive() {
    tone(880, 0.08, { volume: 0.035 });
  },
  correct() {
    tone(660, 0.12, { type: 'triangle', volume: 0.07 });
    tone(990, 0.2, { type: 'triangle', volume: 0.07, delay: 0.09 });
  },
  wrong() {
    tone(220, 0.35, { type: 'sawtooth', volume: 0.05, slideTo: 90 });
  },
  tick() {
    tone(1100, 0.04, { type: 'square', volume: 0.025 });
  },
  start() {
    [392, 523, 659].forEach((f, i) => tone(f, 0.14, { type: 'triangle', delay: i * 0.08, volume: 0.06 }));
  },
  end() {
    [659, 523, 392].forEach((f, i) => tone(f, 0.18, { type: 'triangle', delay: i * 0.1, volume: 0.06 }));
  },
  unlock() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', delay: i * 0.11, volume: 0.07 }));
  },
};
