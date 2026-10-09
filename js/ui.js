// Everything that draws on the page. No game rules live here.

const el = (id) => document.getElementById(id);

export function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
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

export function renderCase(currentCase) {
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

export function renderReveal(currentCase, decision, pattern) {
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
