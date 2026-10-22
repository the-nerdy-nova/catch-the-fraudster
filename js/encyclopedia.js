// Draws the Fraud Encyclopedia: every pattern, with the ones the player
// has not met yet shown as locked.

function buildEntry(pattern) {
  const entry = document.createElement('article');
  entry.className = `entry is-${pattern.kind}`;

  const tag = document.createElement('span');
  tag.className = 'entry-tag';
  tag.textContent = pattern.kind === 'fraud' ? 'Fraud pattern' : 'Genuine look-alike';

  const name = document.createElement('h4');
  name.className = 'entry-name';
  name.textContent = pattern.name;

  const summary = document.createElement('p');
  summary.textContent = pattern.plainEnglish;

  const signsTitle = document.createElement('p');
  signsTitle.className = 'entry-label';
  signsTitle.textContent = pattern.kind === 'fraud' ? 'Warning signs' : 'Signs it is genuine';

  const signs = document.createElement('ul');
  signs.className = 'signs';
  for (const sign of pattern.signs) {
    const li = document.createElement('li');
    li.textContent = sign;
    signs.append(li);
  }

  const respondTitle = document.createElement('p');
  respondTitle.className = 'entry-label';
  respondTitle.textContent = 'What to do';

  const respond = document.createElement('p');
  respond.textContent = pattern.howToRespond;

  entry.append(tag, name, summary, signsTitle, signs, respondTitle, respond);
  return entry;
}

function buildLockedEntry() {
  const entry = document.createElement('article');
  entry.className = 'entry is-locked';
  const name = document.createElement('h4');
  name.className = 'entry-name';
  name.textContent = '🔒 Not discovered yet';
  const hint = document.createElement('p');
  hint.textContent = 'Meet this pattern during a shift to unlock it.';
  entry.append(name, hint);
  return entry;
}

function buildGroup(title, patterns, seen) {
  const group = document.createElement('section');
  const heading = document.createElement('h3');
  heading.className = 'entry-group';
  heading.textContent = title;
  group.append(heading);
  for (const pattern of patterns) {
    group.append(seen.has(pattern.id) ? buildEntry(pattern) : buildLockedEntry());
  }
  return group;
}

// patternList: every pattern, in file order. seenIds: ids the player has met.
export function renderEncyclopedia(patternList, seenIds) {
  const seen = new Set(seenIds);
  const found = patternList.filter((p) => seen.has(p.id)).length;

  document.getElementById('encyclopedia-count').textContent =
    `${found} of ${patternList.length} patterns discovered`;

  const list = document.getElementById('encyclopedia-list');
  list.replaceChildren(
    buildGroup('Fraud patterns', patternList.filter((p) => p.kind === 'fraud'), seen),
    buildGroup('Genuine look-alikes', patternList.filter((p) => p.kind === 'genuine'), seen),
  );
}
