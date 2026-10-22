// Starts the game and connects the buttons to the game logic.

import { loadData } from './data.js';
import {
  createShift, startNext, advance, openClue, decide,
  timeLeft, isLastCase, buildReport, passMark,
} from './game.js';
import { rankStars } from './scoring.js';
import {
  showScreen, showNotice, setSoundButton, renderMenu, renderBriefing,
  renderHud, renderQueue, renderCase, renderReveal, renderReport,
  toggleCluePanel, flashTimeCost, popScore, flashScreen, setShareStatus,
} from './ui.js';
import { renderEncyclopedia } from './encyclopedia.js';
import {
  loadProgress, saveProgress, clearProgress, loadSoundOn, saveSoundOn,
} from './storage.js';
import { buildShareText, copyText } from './share.js';
import { sfx, setSoundEnabled } from './sfx.js';

const TICK_MS = 200;

let cases = [];
let patterns = {};
let patternList = [];
let config = {};
let levels = [];
let progress = loadProgress();
let soundOn = loadSoundOn();
let shift = null;
let timerId = null;
let lastTick = 0;
let lastWholeSecond = null;
let shareText = '';

function levelLabel(level) {
  return `Level ${level.id} · ${level.name}`;
}

// ---- Menu ----

function showMenu() {
  const menuLevels = levels.map((level) => {
    const previous = levels.find((l) => l.id === level.id - 1);
    const best = progress.best[level.id];
    return {
      id: level.id,
      name: level.name,
      description: level.description,
      cases: level.casesPerShift,
      seconds: level.shiftSeconds,
      percent: level.unlockPercent,
      locked: level.id > progress.unlockedLevel,
      lockedHint: previous ? `Pass Level ${previous.id} to unlock` : '',
      best: best && { ...best, stars: rankStars(best.rank, config) },
    };
  });
  const found = patternList.filter((p) => progress.seen.includes(p.id)).length;
  renderMenu(
    menuLevels,
    config.ranks.length,
    `📖 Fraud Encyclopedia · ${found}/${patternList.length}`,
    showBriefing,
  );
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

function toggleSound() {
  soundOn = !soundOn;
  setSoundEnabled(soundOn);
  setSoundButton(soundOn);
  saveSoundOn(soundOn);
  sfx.click();
}

// ---- Briefing ----

// The shift is dealt here so the briefing can show the exact pass mark.
// The clock does not start until the player presses Start shift.
function showBriefing(levelId) {
  const level = levels.find((l) => l.id === levelId);
  const next = levels.find((l) => l.id === level.id + 1);
  shift = createShift(cases, config, level);
  renderBriefing({
    levelLabel: levelLabel(level),
    description: level.description,
    cases: shift.deck.length,
    seconds: level.shiftSeconds,
    clueCost: config.clueCostSeconds,
    target: passMark(shift),
    percent: level.unlockPercent,
    nextLabel: next ? levelLabel(next) : '',
  });
  sfx.click();
  showScreen('briefing');
}

function beginShift() {
  showScreen('shift');
  showCurrentCase();
  lastTick = performance.now();
  lastWholeSecond = null;
  timerId = setInterval(tick, TICK_MS);
  sfx.start();
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
    totalTime: shift.config.shiftSeconds,
    score: shift.stats.score,
    target: passMark(shift),
    streak: shift.stats.streak,
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

// Saves the result and works out what to tell the player about passing.
function recordResult(report) {
  const level = shift.level;
  const next = levels.find((l) => l.id === level.id + 1);
  const passed = report.score >= report.unlockTarget;
  const stars = rankStars(report.rank, config);

  const previousBest = progress.best[level.id];
  const isNewBest = !previousBest || report.score > previousBest.score;
  if (isNewBest) {
    progress.best[level.id] = { score: report.score, rank: report.rank };
  }

  let message;
  let unlocked = false;
  if (passed && next && progress.unlockedLevel < next.id) {
    progress.unlockedLevel = next.id;
    unlocked = true;
    message = `🔓 ${levelLabel(next)} unlocked! You scored ${report.score}, pass mark was ${report.unlockTarget}.`;
  } else if (passed && next) {
    message = `✓ Level passed. You scored ${report.score}, pass mark was ${report.unlockTarget}.`;
  } else if (passed) {
    message = `🏆 Final level passed. You scored ${report.score}, pass mark was ${report.unlockTarget}.`;
  } else {
    const short = report.unlockTarget - report.score;
    message = `✕ ${short} points short. Pass mark was ${report.unlockTarget}, you scored ${report.score}.`;
  }

  saveProgress(progress);
  return {
    levelLabel: levelLabel(level),
    isNewBest,
    status: passed ? 'pass' : 'fail',
    message,
    unlocked,
    stars,
    starTotal: config.ranks.length,
  };
}

function endShift() {
  clearInterval(timerId);
  const report = buildReport(shift);
  const extras = recordResult(report);
  shareText = buildShareText(report, extras.levelLabel);
  renderReport(report, extras);
  showScreen('report');
  if (extras.unlocked) {
    sfx.unlock();
  } else {
    sfx.end();
  }
}

async function onShare() {
  const copied = await copyText(shareText);
  // If copying is blocked, show the text so it can be copied by hand.
  setShareStatus(copied ? '✓ Copied. Paste it anywhere to share.' : shareText);
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

  const waitingBefore = shift.upcoming.length;
  advance(shift, seconds);
  if (shift.upcoming.length < waitingBefore) {
    sfx.arrive();
  }

  // Tick each second during the final ten seconds.
  const left = Math.ceil(timeLeft(shift));
  if (shift.phase === 'deciding' && left <= 10 && left > 0 && left !== lastWholeSecond) {
    sfx.tick();
  }
  lastWholeSecond = left;

  afterClockChange();
}

function onOpenClue(key) {
  openClue(shift, key);
  sfx.clue();
  flashTimeCost();
  afterClockChange();
}

function onInvestigate() {
  if (shift?.phase !== 'deciding') {
    return;
  }
  sfx.click();
  toggleCluePanel();
}

function onDecide(decision) {
  if (shift?.phase !== 'deciding') {
    return;
  }
  const currentCase = shift.current.case;
  const result = decide(shift, decision);

  // The player has now met this pattern, so add it to the encyclopedia.
  if (!progress.seen.includes(currentCase.patternId)) {
    progress.seen.push(currentCase.patternId);
    saveProgress(progress);
  }

  if (result.correct) {
    sfx.correct();
  } else {
    sfx.wrong();
  }
  flashScreen(result.correct);
  popScore(result.points + result.bonus);
  renderReveal(currentCase, result, patterns[currentCase.patternId], shift.openedClues, isLastCase(shift));
  refreshHud();
}

function onNext() {
  if (shift?.phase !== 'reveal') {
    return;
  }
  startNext(shift);
  if (shift.phase === 'over') {
    endShift();
  } else {
    showCurrentCase();
  }
}

// Keyboard shortcuts while a shift is on screen.
function onKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
    return;
  }
  if (document.getElementById('screen-shift').hidden) {
    return;
  }
  const actions = {
    a: () => onDecide('approve'),
    d: () => onDecide('decline'),
    i: onInvestigate,
    n: onNext,
  };
  const action = actions[event.key.toLowerCase()];
  if (action) {
    event.preventDefault();
    action();
  }
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

  setSoundEnabled(soundOn);
  setSoundButton(soundOn);

  const on = (id, handler) => document.getElementById(id).addEventListener('click', handler);
  on('btn-approve', () => onDecide('approve'));
  on('btn-decline', () => onDecide('decline'));
  on('btn-investigate', onInvestigate);
  on('btn-next', onNext);
  on('btn-go', beginShift);
  on('btn-briefing-back', showMenu);
  on('btn-again', () => showBriefing(shift.level.id));
  on('btn-menu', showMenu);
  on('btn-encyclopedia', showEncyclopedia);
  on('btn-encyclopedia-back', showMenu);
  on('btn-reset', resetProgress);
  on('btn-share', onShare);
  on('btn-quit', quitShift);
  on('btn-sound', toggleSound);
  document.addEventListener('keydown', onKey);

  showMenu();
}

// On a file:// address the data cannot load; index.html already explains why.
if (location.protocol !== 'file:') {
  start();
}
