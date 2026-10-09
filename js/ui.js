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

export function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    // Not a currency code the browser knows (e.g. a crypto ticker).
    return `${amount.toLocaleString('en-GB')} ${currency}`;
  }
}

export function showNotice(message) {
  const notice = el('notice');
  notice.textContent = message;
  notice.hidden = false;
}

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
  name.textContent = CLUE_LABELS[key];
  const cost = document.createElement('span');
  cost.className = 'clue-cost';
  cost.textContent = `Reveal · ${clueCost}s`;
  button.append(name, cost);

  const body = document.createElement('p');
  body.className = 'clue-text';
  body.textContent = text;
  body.hidden = true;

  button.addEventListener('click', () => {
    body.hidden = false;
    button.disabled = true;
    cost.textContent = 'Checked';
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
  el('clue-hint').textContent = `Each clue you reveal costs ${clueCost} seconds of your shift.`;
}

function setCluePanelOpen(open) {
  el('clue-panel').hidden = !open;
  const button = el('btn-investigate');
  button.setAttribute('aria-expanded', String(open));
  button.textContent = open ? 'Hide clues' : 'Investigate';
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
  el('case-card').hidden = false;
}

// Works out the headline for each of the four possible outcomes.
function describeOutcome(currentCase, decision) {
  const money = formatMoney(currentCase.card.amount, currentCase.card.currency);
  const isFraud = currentCase.truth === 'fraud';

  if (isFraud && decision === 'decline') {
    return { correct: true, verdict: 'Fraud stopped', outcome: `You protected ${money}.` };
  }
  if (isFraud && decision === 'approve') {
    return { correct: false, verdict: 'Fraud got through', outcome: `Fraud loss: ${money}.` };
  }
  if (!isFraud && decision === 'approve') {
    return { correct: true, verdict: 'Good call', outcome: 'A genuine customer was paid without delay.' };
  }
  return { correct: false, verdict: 'Genuine customer declined', outcome: 'Customer friction: a real customer was blocked.' };
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
    name.textContent = CLUE_LABELS[key];
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

export function renderReveal(currentCase, decision, pattern, openedClues) {
  const result = describeOutcome(currentCase, decision);
  const isFraud = currentCase.truth === 'fraud';

  const reveal = el('reveal');
  reveal.classList.toggle('is-correct', result.correct);
  reveal.classList.toggle('is-wrong', !result.correct);

  const truth = el('reveal-truth');
  truth.textContent = isFraud ? 'Fraud' : 'Genuine';
  truth.classList.toggle('is-fraud', isFraud);
  truth.classList.toggle('is-genuine', !isFraud);

  el('reveal-verdict').textContent = result.verdict;
  el('reveal-outcome').textContent = result.outcome;
  el('reveal-pattern').textContent = pattern?.name ?? 'Unknown pattern';
  el('reveal-explanation').textContent = currentCase.explanation;

  renderGiveaways(currentCase, openedClues);

  const signs = el('reveal-signs');
  signs.replaceChildren();
  for (const sign of pattern?.warningSigns ?? []) {
    const li = document.createElement('li');
    li.textContent = sign;
    signs.append(li);
  }

  el('case-card').hidden = true;
  reveal.hidden = false;
  el('btn-next').focus();
}
