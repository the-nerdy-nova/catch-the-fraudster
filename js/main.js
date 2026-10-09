// Starts the game and connects the buttons to the game logic.

import { loadData } from './data.js';
import {
  createShift, startNext, advance, openClue, decide,
  timeLeft, isLastCase, buildReport,
} from './game.js';
import {
  showScreen, showNotice, renderMenu, renderHud, renderQueue, renderCase,
  renderReveal, renderReport, toggleCluePanel, flashTimeCost, setShareStatus,
} from './ui.js';
import { buildShareText, copyText } from './share.js';
import { renderEncyclopedia } from './encyclopedia.js';
import { loadProgress, saveProgress, clearProgress } from './storage.js';

const TICK_MS = 200;

let cases = [];
let patterns = {};
let patternList = [];
let config = {};
let levels = [];
let progress = loadProgress();
let shift = null;
let timerId = null;
let lastTick = 0;
let shareText = '';

// ---- Menu ----

function showMenu() {
  const menuLevels = levels.map((level) => {
    const previous = levels.find((l) => l.id === level.id - 1);
    return {
      id: level.id,
      name: level.name,
      description: level.description,
      locked: level.id > progress.unlockedLevel,
      lockedHint: previous ? `pass Level ${previous.id} to unlock` : '',
      best: progress.best[level.id],
    };
  });
  const found = patternList.filter((p) => progress.seen.includes(p.id)).length;
  renderMenu(menuLevels, `Fraud Encyclopedia (${found} of ${patternList.length})`, startShift);
  showScreen('start');
}

function showEncyclopedia() {
  renderEncyclopedia(patternList, progress.seen);
  showScreen('encyclopedia');
}

function resetProgress() {
  if (window.confirm('Reset your unlocked levels, best scores and encyclopedia?')) {
    progress = clearProgress();
    showMenu();
  }
}

// ---- Shift ----

// How a waiting customer should look in the queue strip.
function queueState(customer) {
  if (customer.angry) {
    return 'angry';
  }
  const waited = shift.elapsed - customer.arrivedAt;
  return waited >= shift.config.patienceSeconds * 0.6 ? 'impatient' : 'calm';
}

function refreshHud() {
  renderHud({
    timeLeft: timeLeft(shift),
    score: shift.stats.score,
    done: shift.stats.decisions,
    total: shift.deck.length,
    currentAngry: shift.phase === 'deciding' && shift.current.angry,
  });
  renderQueue(shift.queue.map((customer) => ({
    name: customer.case.card.customer,
    state: queueState(customer),
  })));
}

function showCurrentCase() {
  renderCase(shift.current.case, config.clueCostSeconds, onOpenClue);
  refreshHud();
}

// Saves the result and works out what to tell the player about unlocking.
function recordResult(report) {
  const level = shift.level;
  const next = levels.find((l) => l.id === level.id + 1);
  const passed = report.score >= report.unlockTarget;

  const previousBest = progress.best[level.id];
  const isNewBest = !previousBest || report.score > previousBest.score;
  if (isNewBest) {
    progress.best[level.id] = { score: report.score, rank: report.rank };
  }

  let message = '';
  if (next && passed && progress.unlockedLevel < next.id) {
    progress.unlockedLevel = next.id;
    message = `Level ${next.id} "${next.name}" unlocked.`;
  } else if (next && !passed && progress.unlockedLevel < next.id) {
    message = `Score ${report.unlockTarget} points or more on this shift to unlock Level ${next.id}. You scored ${report.score}.`;
  } else if (!next && passed) {
    message = 'You have passed the highest level.';
  }

  saveProgress(progress);
  return { levelLabel: `Level ${level.id} · ${level.name}`, isNewBest, message };
}

function endShift() {
  clearInterval(timerId);
  const report = buildReport(shift);
  const extras = recordResult(report);
  shareText = buildShareText(report, extras.levelLabel);
  renderReport(report, extras);
  showScreen('report');
}

async function onShare() {
  const copied = await copyText(shareText);
  // If copying is blocked, show the text so it can be copied by hand.
  setShareStatus(copied ? 'Copied. Paste it anywhere to share.' : shareText);
}

function quitShift() {
  if (window.confirm('Quit this shift? Your score will not be saved.')) {
    clearInterval(timerId);
    showMenu();
  }
}

// Called whenever game time has moved: redraw, or finish if time ran out.
function afterClockChange() {
  if (shift.phase === 'over') {
    endShift();
  } else {
    refreshHud();
  }
}

function tick() {
  const now = performance.now();
  // Cap the step so the clock does not jump after the tab was in the background.
  const seconds = Math.min((now - lastTick) / 1000, 1);
  lastTick = now;
  advance(shift, seconds);
  afterClockChange();
}

function onOpenClue(key) {
  openClue(shift, key);
  flashTimeCost();
  afterClockChange();
}

function onDecide(decision) {
  if (shift.phase !== 'deciding') {
    return;
  }
  const currentCase = shift.current.case;
  const result = decide(shift, decision);

  // The player has now met this pattern, so add it to the encyclopedia.
  if (!progress.seen.includes(currentCase.patternId)) {
    progress.seen.push(currentCase.patternId);
    saveProgress(progress);
  }

  renderReveal(currentCase, result, patterns[currentCase.patternId], shift.openedClues, isLastCase(shift));
  refreshHud();
}

function onNext() {
  startNext(shift);
  if (shift.phase === 'over') {
    endShift();
  } else {
    showCurrentCase();
  }
}

function startShift(levelId) {
  const level = levels.find((l) => l.id === levelId);
  shift = createShift(cases, config, level);
  showScreen('shift');
  showCurrentCase();
  lastTick = performance.now();
  timerId = setInterval(tick, TICK_MS);
}

// ---- Start-up ----

async function start() {
  try {
    ({ cases, patterns, patternList, config, levels } = await loadData());
  } catch (error) {
    console.error(error);
    showNotice('The game data could not be loaded. Check the browser console for details.');
    return;
  }

  const on = (id, handler) => document.getElementById(id).addEventListener('click', handler);
  on('btn-approve', () => onDecide('approve'));
  on('btn-decline', () => onDecide('decline'));
  on('btn-investigate', toggleCluePanel);
  on('btn-next', onNext);
  on('btn-again', () => startShift(shift.level.id));
  on('btn-menu', showMenu);
  on('btn-encyclopedia', showEncyclopedia);
  on('btn-encyclopedia-back', showMenu);
  on('btn-reset', resetProgress);
  on('btn-share', onShare);
  on('btn-quit', quitShift);

  showMenu();
}

// On a file:// address the data cannot load; index.html already explains why.
if (location.protocol !== 'file:') {
  start();
}
