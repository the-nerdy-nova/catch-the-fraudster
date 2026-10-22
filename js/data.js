// Loads the game content from the /data folder.

async function loadJson(path) {
  // 'no-cache' asks the server whether the file changed, so players
  // never mix old game content with new code.
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Could not load ${path} (status ${response.status})`);
  }
  return response.json();
}

const CARD_FIELDS = [
  'customer', 'amount', 'currency', 'method',
  'destination', 'country', 'time', 'accountAge',
];

// Prints a warning for any case that would break the game, so content
// mistakes show up in the browser console straight away.
function checkCases(cases, patterns, config) {
  for (const c of cases) {
    if (config.ratesToReportCurrency[c.card?.currency] === undefined) {
      console.warn(`Case ${c.id}: no exchange rate in config.json for "${c.card?.currency}"`);
    }
    if (c.truth !== 'fraud' && c.truth !== 'genuine') {
      console.warn(`Case ${c.id}: "truth" must be "fraud" or "genuine"`);
    }
    if (!patterns[c.patternId]) {
      console.warn(`Case ${c.id}: unknown patternId "${c.patternId}"`);
    } else if (patterns[c.patternId].kind !== c.truth) {
      console.warn(`Case ${c.id}: is "${c.truth}" but its pattern is "${patterns[c.patternId].kind}"`);
    }
    for (const field of CARD_FIELDS) {
      if (c.card?.[field] === undefined) {
        console.warn(`Case ${c.id}: card is missing "${field}"`);
      }
    }
    for (const clue of c.giveaways ?? []) {
      if (!c.clues?.[clue]) {
        console.warn(`Case ${c.id}: giveaway "${clue}" is not one of its clues`);
      }
    }
  }
}

function checkLevels(levels, cases) {
  for (const level of levels) {
    const available = cases.filter((c) => c.level === level.id).length;
    if (available < level.casesPerShift) {
      console.warn(`Level ${level.id}: wants ${level.casesPerShift} cases per shift but only ${available} exist`);
    }
  }
}

export async function loadData() {
  const [cases, patternList, config, levels] = await Promise.all([
    loadJson('data/cases.json'),
    loadJson('data/patterns.json'),
    loadJson('data/config.json'),
    loadJson('data/levels.json'),
  ]);

  // Turn the list into a lookup so we can find a pattern by its id.
  const patterns = {};
  for (const pattern of patternList) {
    patterns[pattern.id] = pattern;
  }

  checkCases(cases, patterns, config);
  checkLevels(levels, cases);
  return { cases, patterns, patternList, config, levels };
}
