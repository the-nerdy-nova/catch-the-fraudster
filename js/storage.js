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

// The leaderboard: the top scores on this device, kept separately for each
// level. Resetting progress does not clear it.
const BOARD_KEY = 'catch-the-fraudster-leaderboard-v1';
const BOARD_SIZE = 10;
const NAME_KEY = 'catch-the-fraudster-last-name';

export function loadLeaderboard() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOARD_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function saveLeaderboard(board) {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(board));
  } catch {
    // Storage unavailable: the entry lasts until the page is closed.
  }
}

// Returns the place (1 = top) a score would take on a level's board, or 0
// if it does not make the top ten. Only positive scores count.
export function boardPlace(board, levelId, score) {
  if (score <= 0) {
    return 0;
  }
  const entries = board[levelId] ?? [];
  const place = entries.filter((e) => e.score >= score).length + 1;
  return place <= BOARD_SIZE ? place : 0;
}

// Adds an entry, keeps the top ten and returns the saved entry.
export function addToLeaderboard(board, levelId, entry) {
  const entries = [...(board[levelId] ?? []), entry];
  entries.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  board[levelId] = entries.slice(0, BOARD_SIZE);
  saveLeaderboard(board);
  return entry;
}

export function clearLeaderboard() {
  try {
    localStorage.removeItem(BOARD_KEY);
  } catch {
    // Nothing to clear.
  }
  return {};
}

export function loadLastName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveLastName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Not remembered.
  }
}
