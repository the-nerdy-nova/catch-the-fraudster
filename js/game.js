// The state of one shift: the clock, the queue and the running totals.
// Nothing here touches the page; main.js asks ui.js to draw the result.

import { scoreDecision, maxScore, rankFor } from './scoring.js';

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// A shift uses the general settings from config.json plus the chosen
// level's own pace (cases per shift, arrival speed, patience).
export function createShift(allCases, config, level) {
  const levelCases = allCases.filter((c) => c.level === level.id);
  const deck = shuffle(levelCases).slice(0, level.casesPerShift);
  const shift = {
    config: { ...config, ...level },
    level,
    deck,
    upcoming: [...deck], // cases that have not arrived yet
    queue: [],           // customers waiting behind the current one
    current: null,       // the customer on the card: { case, arrivedAt, angry }
    currentSince: 0,     // game time when the current case went on screen
    openedClues: new Set(),
    elapsed: 0,          // seconds of game time used so far
    nextArrivalAt: 0,
    // 'deciding' = clock running, 'reveal' = clock paused on Case closed,
    // 'over' = shift finished
    phase: 'deciding',
    stats: {
      score: 0,
      decisions: 0,
      correct: 0,
      fraudCaught: 0,
      fraudApproved: 0,
      genuineApproved: 0,
      genuineDeclined: 0,
      losses: 0,
      angry: 0,
      streak: 0,     // correct decisions in a row
      bestStreak: 0,
    },
  };
  startNext(shift);
  return shift;
}

function arrive(shift, atTime) {
  shift.queue.push({ case: shift.upcoming.shift(), arrivedAt: atTime, angry: false });
  shift.nextArrivalAt = atTime + shift.config.arrivalSeconds;
}

// Puts the next waiting customer on the card, or ends the shift if there
// is nobody left or the time is up.
export function startNext(shift) {
  if (shift.elapsed >= shift.config.shiftSeconds) {
    shift.phase = 'over';
    return;
  }
  // If the player is ahead of the queue, bring the next customer in now
  // instead of making them wait.
  if (shift.queue.length === 0 && shift.upcoming.length > 0) {
    arrive(shift, shift.elapsed);
  }
  if (shift.queue.length === 0) {
    shift.phase = 'over';
    return;
  }
  shift.current = shift.queue.shift();
  shift.currentSince = shift.elapsed;
  shift.openedClues = new Set();
  shift.phase = 'deciding';
}

// Moves the game clock forward. New customers arrive, and anyone who has
// waited too long gets angry (once) and costs points.
export function advance(shift, seconds) {
  if (shift.phase !== 'deciding') {
    return;
  }
  const { config, stats } = shift;
  shift.elapsed = Math.min(shift.elapsed + seconds, config.shiftSeconds);

  while (shift.upcoming.length > 0 && shift.elapsed >= shift.nextArrivalAt) {
    arrive(shift, shift.nextArrivalAt);
  }

  for (const customer of [shift.current, ...shift.queue]) {
    if (!customer.angry && shift.elapsed - customer.arrivedAt >= config.patienceSeconds) {
      customer.angry = true;
      stats.angry += 1;
      stats.score += config.points.angryCustomer;
    }
  }

  if (shift.elapsed >= config.shiftSeconds) {
    shift.phase = 'over';
  }
}

// Revealing a clue uses up game time, so the queue keeps moving too.
export function openClue(shift, key) {
  if (shift.phase !== 'deciding' || shift.openedClues.has(key)) {
    return;
  }
  shift.openedClues.add(key);
  advance(shift, shift.config.clueCostSeconds);
}

export function decide(shift, decision) {
  const secondsTaken = shift.elapsed - shift.currentSince;
  const result = scoreDecision(shift.current.case, decision, secondsTaken, shift.config);

  const { stats } = shift;
  stats.decisions += 1;
  stats[result.kind] += 1;
  stats.score += result.points + result.bonus;
  stats.losses += result.loss;
  if (result.correct) {
    stats.correct += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  } else {
    stats.streak = 0;
  }

  shift.phase = 'reveal';
  return result;
}

export function timeLeft(shift) {
  return shift.config.shiftSeconds - shift.elapsed;
}

// True when there is nothing left to review after the current case.
export function isLastCase(shift) {
  return timeLeft(shift) <= 0 || (shift.queue.length === 0 && shift.upcoming.length === 0);
}

// Points needed on this shift to pass the level. It depends on which
// cases were drawn, so it is worked out once the deck is known.
export function passMark(shift) {
  return Math.ceil((maxScore(shift.deck, shift.config) * shift.level.unlockPercent) / 100);
}

export function buildReport(shift) {
  const { stats, deck, config } = shift;
  return {
    score: stats.score,
    rank: rankFor(stats.score, maxScore(deck, config), config),
    unlockTarget: passMark(shift),
    bestStreak: stats.bestStreak,
    fraudCaught: stats.fraudCaught,
    fraudTotal: deck.filter((c) => c.truth === 'fraud').length,
    losses: stats.losses,
    currency: config.reportCurrency,
    falsePositives: stats.genuineDeclined,
    angry: stats.angry,
    notReviewed: deck.length - stats.decisions,
    accuracy: stats.decisions > 0 ? Math.round((stats.correct / stats.decisions) * 100) : 0,
  };
}
