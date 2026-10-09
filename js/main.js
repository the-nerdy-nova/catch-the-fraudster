// Starts the game and connects the buttons to the game logic.

import { loadData } from './data.js';
import {
  createShift, startNext, advance, openClue, decide,
  timeLeft, isLastCase, buildReport,
} from './game.js';
import {
  showScreen, showNotice, renderHud, renderQueue, renderCase,
  renderReveal, renderReport, toggleCluePanel,
} from './ui.js';

const TICK_MS = 200;

let cases = [];
let patterns = {};
let config = {};
let shift = null;
let timerId = null;
let lastTick = 0;

// How a waiting customer should look in the queue strip.
function queueState(customer) {
  if (customer.angry) {
    return 'angry';
  }
  const waited = shift.elapsed - customer.arrivedAt;
  return waited >= config.patienceSeconds * 0.6 ? 'impatient' : 'calm';
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

function endShift() {
  clearInterval(timerId);
  renderReport(buildReport(shift));
  showScreen('report');
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
  afterClockChange();
}

function onDecide(decision) {
  if (shift.phase !== 'deciding') {
    return;
  }
  const currentCase = shift.current.case;
  const result = decide(shift, decision);
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

function startShift() {
  shift = createShift(cases, config);
  showScreen('shift');
  showCurrentCase();
  lastTick = performance.now();
  timerId = setInterval(tick, TICK_MS);
}

async function start() {
  try {
    ({ cases, patterns, config } = await loadData());
  } catch (error) {
    console.error(error);
    showNotice('The game data could not be loaded. Check the browser console for details.');
    return;
  }

  document.getElementById('btn-start').addEventListener('click', startShift);
  document.getElementById('btn-again').addEventListener('click', startShift);
  document.getElementById('btn-approve').addEventListener('click', () => onDecide('approve'));
  document.getElementById('btn-decline').addEventListener('click', () => onDecide('decline'));
  document.getElementById('btn-investigate').addEventListener('click', toggleCluePanel);
  document.getElementById('btn-next').addEventListener('click', onNext);

  showScreen('start');
}

// On a file:// address the data cannot load; index.html already explains why.
if (location.protocol !== 'file:') {
  start();
}
