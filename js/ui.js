// Everything that draws on the page. No game rules live here.

const el = (id) => document.getElementById(id);

// The clue types, in the order they appear in the Investigate panel.
const CLUE_LABELS = {
  device: 'Device & IP',
  velocity: 'Velocity',
  history: 'Account history',
  contact: 'Customer contact',
  blockchain: 'Blockchain view',
};

const CLUE_ICONS = {
  device: '📱',
  velocity: '⚡',
  history: '🗂️',
  contact: '💬',
  blockchain: '⛓️',
};

// The big stamp shown on each outcome.
const STAMPS = {
  fraudCaught: 'Fraud stopped',
  fraudApproved: 'Fraud missed',
  genuineApproved: 'Cleared',
  genuineDeclined: 'False alarm',
};

const SCREENS = ['start', 'briefing', 'shift', 'report', 'encyclopedia'];

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Restarts a CSS animation by removing and re-adding its class.
function replay(node, className) {
  node.classList.remove(className);
  // Reading a layout value makes the browser restart the animation.
  void node.offsetWidth;
  node.classList.add(className);
}

export function showScreen(name) {
  for (const screen of SCREENS) {
    el(`screen-${screen}`).hidden = screen !== name;
  }
  window.scrollTo(0, 0);
}

export function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    // Not a currency code the browser knows (e.g. a crypto ticker).
    return `${amount.toLocaleString('en-GB')} ${currency}`;
  }
}

export function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function signed(points) {
  return points > 0 ? `+${points}` : String(points);
}

function stars(count, total) {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, total - count));
}

export function showNotice(message) {
  const notice = el('notice');
  notice.textContent = message;
  notice.hidden = false;
}

export function setSoundButton(on) {
  const button = el('btn-sound');
  button.textContent = on ? '🔊' : '🔇';
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
}

// ---- Menu ----

// levels: [{ id, name, description, cases, seconds, percent, locked,
//            lockedHint, best: { score, rank, stars } | undefined }]
export function renderMenu(levels, starTotal, encyclopediaLabel, onPlay) {
  const list = el('level-list');
  list.replaceChildren();
  for (const level of levels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level';
    button.disabled = level.locked;

    const number = document.createElement('span');
    number.className = 'level-num';
    number.textContent = String(level.id).padStart(2, '0');

    const body = document.createElement('span');
    body.className = 'level-body';

    const title = document.createElement('span');
    title.className = 'level-title';
    title.textContent = level.name;

    const description = document.createElement('span');
    description.className = 'level-description';
    description.textContent = level.description;

    const meta = document.createElement('span');
    meta.className = 'level-meta';
    meta.textContent =
      `⏱ ${formatTime(level.seconds)} · ${level.cases} cases · Pass mark ${level.percent}% of a perfect shift`;

    const status = document.createElement('span');
    status.className = 'level-status';
    if (level.locked) {
      status.textContent = `🔒 ${level.lockedHint}`;
    } else if (level.best) {
      const starSpan = document.createElement('span');
      starSpan.className = 'level-stars';
      starSpan.textContent = stars(level.best.stars, starTotal);
      status.append(starSpan, ` Best ${level.best.score} · ${level.best.rank}`);
    } else {
      status.textContent = '▶ Ready to play';
    }

    body.append(title, description, meta, status);
    button.append(number, body);
    button.addEventListener('click', () => onPlay(level.id));
    list.append(button);
  }
  el('btn-encyclopedia').textContent = encyclopediaLabel;
}

// ---- Briefing ----

export function renderBriefing({ levelLabel, description, cases, seconds, clueCost, target, percent, nextLabel }) {
  el('briefing-level').textContent = levelLabel;
  el('briefing-description').textContent = description;
  el('brief-cases').textContent = cases;
  el('brief-time').textContent = formatTime(seconds);
  el('brief-target').textContent = `${target} pts`;
  el('brief-clue').textContent = `−${clueCost}s`;
  el('briefing-pass').textContent = nextLabel
    ? `Score ${target} points or more to unlock ${nextLabel}. That is ${percent}% of a perfect shift for these cases, and speed bonuses count towards it.`
    : `Score ${target} points or more to pass the final level. That is ${percent}% of a perfect shift for these cases.`;
}

// ---- Shift HUD ----

export function renderHud({ timeLeft, totalTime, score, target, streak, done, total, currentAngry }) {
  const share = Math.max(0, timeLeft / totalTime);
  const mid = share <= 0.5 && timeLeft > 30;
  const low = timeLeft <= 30;

  const time = el('hud-time');
  time.textContent = formatTime(timeLeft);
  time.classList.toggle('is-mid', mid);
  time.classList.toggle('is-low', low);
  const timeBar = el('hud-time-bar');
  timeBar.style.width = `${share * 100}%`;
  timeBar.classList.toggle('is-mid', mid);
  timeBar.classList.toggle('is-low', low);

  el('hud-score').textContent = score;

  const passed = score >= target;
  el('hud-target-label').textContent = passed ? 'Pass mark ✓' : 'Pass mark';
  el('hud-target-text').textContent = `${score} / ${target}`;
  el('hud-target-bar').style.width = `${Math.min(100, Math.max(0, (score / target) * 100))}%`;
  el('screen-shift').classList.toggle('is-passed', passed);

  const streakEl = el('hud-streak');
  streakEl.textContent = streak >= 3 ? `🔥x${streak}` : `x${streak}`;
  streakEl.classList.toggle('is-hot', streak >= 3);

  el('hud-cases').textContent = `${done}/${total}`;
  el('case-angry').hidden = !currentAngry;
}

// Briefly highlights the clock when a clue has cost time.
export function flashTimeCost() {
  replay(el('hud-time'), 'is-hit');
}

// Floats "+120" or "-100" up from the score.
export function popScore(points) {
  const pop = el('score-pop');
  pop.textContent = signed(points);
  pop.classList.toggle('is-down', points < 0);
  replay(pop, 'is-active');
}

// Washes the screen green or red after a decision.
export function flashScreen(good) {
  const flash = el('flash');
  flash.classList.remove('is-good', 'is-bad');
  replay(flash, good ? 'is-good' : 'is-bad');
}

export function setShareStatus(message) {
  el('share-status').textContent = message;
}

// Remembers what the queue looked like so it is only redrawn when it changes.
let lastQueueKey = null;

function initials(name) {
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('');
}

// customers: [{ name, state }] where state is 'calm', 'impatient' or 'angry'
export function renderQueue(customers) {
  const key = customers.map((c) => `${c.name}:${c.state}`).join('|');
  if (key === lastQueueKey) {
    return;
  }
  lastQueueKey = key;

  const list = el('queue-list');
  list.replaceChildren();
  if (customers.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'queue-empty';
    empty.textContent = 'Queue clear';
    list.append(empty);
    return;
  }
  for (const customer of customers) {
    const chip = document.createElement('span');
    chip.className = `queue-chip is-${customer.state}`;
    const avatar = document.createElement('span');
    avatar.className = 'queue-avatar';
    avatar.textContent = initials(customer.name);
    const name = document.createElement('span');
    name.textContent = customer.state === 'angry' ? `${customer.name} 😡` : customer.name;
    chip.append(avatar, name);
    list.append(chip);
  }
}

// ---- Case card ----

function addField(list, label, value) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  wrap.append(dt, dd);
  list.append(wrap);
}

// Builds one closed clue box. Clicking it shows the clue text and tells
// the game (through onOpen) that the player has used this clue.
function buildClue(key, text, clueCost, onOpen) {
  const wrap = document.createElement('div');
  wrap.className = 'clue';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'clue-toggle';
  const name = document.createElement('span');
  name.className = 'clue-name';
  name.textContent = `${CLUE_ICONS[key]} ${CLUE_LABELS[key]}`;
  const cost = document.createElement('span');
  cost.className = 'clue-cost';
  cost.textContent = `Reveal −${clueCost}s`;
  button.append(name, cost);

  const body = document.createElement('p');
  body.className = 'clue-text';
  body.textContent = text;
  body.hidden = true;

  button.addEventListener('click', () => {
    body.hidden = false;
    button.disabled = true;
    cost.textContent = 'Scanned';
    wrap.classList.add('is-open');
    onOpen(key);
  });

  wrap.append(button, body);
  return wrap;
}

function renderClues(currentCase, clueCost, onOpen) {
  const list = el('clue-list');
  list.replaceChildren();
  for (const key of Object.keys(CLUE_LABELS)) {
    const text = currentCase.clues?.[key];
    // A clue set to null does not apply to this case (e.g. no blockchain
    // view on a card payment), so it is left out.
    if (text) {
      list.append(buildClue(key, text, clueCost, onOpen));
    }
  }
  el('clue-hint').textContent = `Each clue you reveal costs ${clueCost} seconds of shift time.`;
}

function setCluePanelOpen(open) {
  el('clue-panel').hidden = !open;
  el('btn-investigate').setAttribute('aria-expanded', String(open));
  el('investigate-label').textContent = open ? '🔍 Hide clues' : '🔍 Investigate';
}

export function toggleCluePanel() {
  setCluePanelOpen(el('clue-panel').hidden);
}

export function renderCase(currentCase, clueCost, onOpenClue) {
  const { card } = currentCase;

  el('case-id').textContent = `#${currentCase.id.toUpperCase()}`;
  el('case-amount').textContent = formatMoney(card.amount, card.currency);
  el('case-method').textContent = card.method;

  const fields = el('case-fields');
  fields.replaceChildren();
  addField(fields, 'Customer', card.customer);
  addField(fields, 'Account age', card.accountAge);
  addField(fields, 'Merchant / destination', card.destination);
  addField(fields, 'Country', card.country);
  addField(fields, 'Time', card.time);
  addField(fields, 'Currency', card.currency);

  renderClues(currentCase, clueCost, onOpenClue);
  setCluePanelOpen(false);

  el('reveal').hidden = true;
  const caseCard = el('case-card');
  caseCard.hidden = false;
  replay(caseCard, 'is-entering');
}

// ---- Case closed ----

// The headline for each of the four possible outcomes.
function describeOutcome(currentCase, kind) {
  const money = formatMoney(currentCase.card.amount, currentCase.card.currency);
  switch (kind) {
    case 'fraudCaught':
      return { verdict: 'Nice catch. That was fraud.', outcome: `You protected ${money}.` };
    case 'fraudApproved':
      return { verdict: 'The fraudster got through.', outcome: `Fraud loss: ${money}.` };
    case 'genuineApproved':
      return { verdict: 'Good call. A genuine customer.', outcome: 'They were paid without delay.' };
    default:
      return { verdict: 'That was a genuine customer.', outcome: 'Customer friction: a real person was blocked.' };
  }
}

// Lists the clues that mattered most, and whether the player looked at them.
function renderGiveaways(currentCase, openedClues) {
  const list = el('reveal-giveaways');
  list.replaceChildren();
  for (const key of currentCase.giveaways ?? []) {
    const checked = openedClues.has(key);

    const li = document.createElement('li');
    li.className = checked ? 'giveaway is-checked' : 'giveaway is-missed';

    const head = document.createElement('div');
    head.className = 'giveaway-head';
    const name = document.createElement('strong');
    name.textContent = `${CLUE_ICONS[key]} ${CLUE_LABELS[key]}`;
    const tag = document.createElement('span');
    tag.className = 'giveaway-tag';
    tag.textContent = checked ? 'You checked this' : 'Not checked';
    head.append(name, tag);

    const text = document.createElement('p');
    text.textContent = currentCase.clues[key];

    li.append(head, text);
    list.append(li);
  }
}

// result comes from scoring.js: { kind, correct, points, bonus }
export function renderReveal(currentCase, result, pattern, openedClues, isLast) {
  const text = describeOutcome(currentCase, result.kind);
  const isFraud = currentCase.truth === 'fraud';

  const reveal = el('reveal');
  reveal.classList.toggle('is-correct', result.correct);
  reveal.classList.toggle('is-wrong', !result.correct);

  const truth = el('reveal-truth');
  truth.textContent = isFraud ? 'Fraud' : 'Genuine';
  truth.classList.toggle('is-fraud', isFraud);
  truth.classList.toggle('is-genuine', !isFraud);

  el('reveal-stamp').textContent = STAMPS[result.kind];
  el('reveal-points').textContent = result.bonus > 0
    ? `${signed(result.points + result.bonus)} pts (incl. ${signed(result.bonus)} speed)`
    : `${signed(result.points)} pts`;
  el('reveal-verdict').textContent = text.verdict;
  el('reveal-outcome').textContent = text.outcome;
  el('reveal-pattern').textContent = pattern?.name ?? 'Unknown pattern';
  el('reveal-explanation').textContent = currentCase.explanation;

  renderGiveaways(currentCase, openedClues);

  el('reveal-signs-title').textContent = isFraud
    ? 'Warning signs to remember'
    : 'Signs this was genuine';
  const signs = el('reveal-signs');
  signs.replaceChildren();
  for (const sign of pattern?.signs ?? []) {
    const li = document.createElement('li');
    li.textContent = sign;
    signs.append(li);
  }

  const next = el('btn-next');
  next.textContent = isLast ? 'See report ▶' : 'Next case ▶';

  el('case-card').hidden = true;
  reveal.hidden = false;
  replay(reveal, 'is-entering');
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  next.focus({ preventScroll: true });
}

// ---- Report ----

function addStat(grid, label, value, tone = '') {
  const wrap = document.createElement('div');
  wrap.className = `stat ${tone}`.trim();
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  wrap.append(dt, dd);
  grid.append(wrap);
}

// Counts the score up from zero for a bit of drama.
function countUp(node, target) {
  if (prefersReducedMotion()) {
    node.textContent = target;
    return;
  }
  const duration = 900;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    node.textContent = Math.round(target * eased);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

// extras: { levelLabel, isNewBest, status: 'pass' | 'fail' | '', message, stars, starTotal }
export function renderReport(report, extras) {
  el('report-level').textContent = `Shift report · ${extras.levelLabel}`;
  setShareStatus('');
  el('report-emblem').dataset.tier = String(extras.stars);
  el('report-stars').textContent = stars(extras.stars, extras.starTotal);
  el('report-best').hidden = !extras.isNewBest;

  const message = el('report-message');
  message.textContent = extras.message;
  message.hidden = !extras.message;
  message.classList.toggle('is-pass', extras.status === 'pass');
  message.classList.toggle('is-fail', extras.status === 'fail');

  el('report-rank').textContent = report.rank;
  countUp(el('report-score'), report.score);

  const grid = el('report-stats');
  grid.replaceChildren();
  addStat(grid, 'Fraud stopped', `${report.fraudCaught}/${report.fraudTotal}`, 'is-good');
  addStat(grid, 'Accuracy', `${report.accuracy}%`);
  addStat(grid, 'Best streak', `x${report.bestStreak}`, 'is-warn');
  addStat(grid, 'Fraud losses', formatMoney(report.losses, report.currency), report.losses > 0 ? 'is-bad' : '');
  addStat(grid, 'False positives', report.falsePositives, report.falsePositives > 0 ? 'is-bad' : '');
  addStat(grid, 'Angry customers', report.angry, report.angry > 0 ? 'is-bad' : '');
  addStat(grid, 'Pass mark', `${report.unlockTarget} pts`);
  addStat(grid, 'Not reviewed', report.notReviewed);
}
