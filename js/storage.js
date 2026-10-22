// Saves progress in the browser. Every call is wrapped in try/catch because
// storage can be switched off (for example in private browsing); the game
// then still works, it just forgets progress when the page is closed.

const KEY = 'catch-the-fraudster-progress-v1';

function freshProgress() {
  return {
    unlockedLevel: 1, // highest level the player may start
    best: {},         // best result per level id: { score, rank }
    seen: [],         // ids of patterns the player has met
  };
}

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved || typeof saved !== 'object') {
      return freshProgress();
    }
    const progress = { ...freshProgress(), ...saved };
    if (!Array.isArray(progress.seen)) {
      progress.seen = [];
    }
    return progress;
  } catch {
    return freshProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable: carry on without saving.
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  return freshProgress();
}

const SOUND_KEY = 'catch-the-fraudster-sound';

export function loadSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundOn(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Storage unavailable: the choice lasts until the page is closed.
  }
}
