// Turns decisions into points. All the numbers come from data/config.json.

// Speed bonus tiers are listed fastest first, so the first match wins.
function speedBonus(secondsTaken, config) {
  for (const tier of config.speedBonus) {
    if (secondsTaken <= tier.withinSeconds) {
      return tier.points;
    }
  }
  return 0;
}

// Fraud losses are added up in one currency so the total makes sense.
function toReportCurrency(amount, currency, config) {
  return amount * (config.ratesToReportCurrency[currency] ?? 1);
}

export function scoreDecision(currentCase, decision, secondsTaken, config) {
  const isFraud = currentCase.truth === 'fraud';
  let kind;
  if (isFraud) {
    kind = decision === 'decline' ? 'fraudCaught' : 'fraudApproved';
  } else {
    kind = decision === 'approve' ? 'genuineApproved' : 'genuineDeclined';
  }

  const correct = kind === 'fraudCaught' || kind === 'genuineApproved';
  const { amount, currency } = currentCase.card;

  return {
    kind,
    correct,
    points: config.points[kind],
    bonus: correct ? speedBonus(secondsTaken, config) : 0,
    loss: kind === 'fraudApproved' ? toReportCurrency(amount, currency, config) : 0,
  };
}

// The score for getting every decision right, before any speed bonus.
export function maxScore(cases, config) {
  let total = 0;
  for (const c of cases) {
    total += c.truth === 'fraud' ? config.points.fraudCaught : config.points.genuineApproved;
  }
  return total;
}

// Rank depends on the share of that all-correct score, so it works for
// shifts of any length. Speed bonuses can make up for a mistake.
// Ranks are listed highest first.
export function rankFor(score, max, config) {
  const percent = max > 0 ? (score / max) * 100 : 0;
  const rank = config.ranks.find((r) => percent >= r.minPercent) ?? config.ranks.at(-1);
  return rank.name;
}

// Stars for a rank: the lowest rank gets 1, the highest gets one per rank.
export function rankStars(rankName, config) {
  const index = config.ranks.findIndex((r) => r.name === rankName);
  return index === -1 ? 1 : config.ranks.length - index;
}
