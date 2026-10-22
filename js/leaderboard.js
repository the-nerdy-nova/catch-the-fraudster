// Draws the leaderboard screen: one tab per level, top ten scores each.

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function cell(text, className = '') {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) {
    td.className = className;
  }
  return td;
}

// levels: every level. board: { levelId: [entries] }.
// activeId: the level tab to show. highlight: the entry just saved, if any.
export function renderLeaderboard(levels, board, activeId, highlight, onTab) {
  const tabs = document.getElementById('board-tabs');
  tabs.replaceChildren();
  for (const level of levels) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(level.id === activeId));
    tab.textContent = `Level ${level.id} · ${level.name}`;
    tab.addEventListener('click', () => onTab(level.id));
    tabs.append(tab);
  }

  const entries = board[activeId] ?? [];
  const body = document.getElementById('board-body');
  body.replaceChildren();
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    if (entry === highlight) {
      row.className = 'is-you';
    }
    const place = index + 1;
    row.append(
      cell(place <= 3 ? ['🥇', '🥈', '🥉'][index] : String(place), 'board-place'),
      cell(entry.name, 'board-name'),
      cell(String(entry.score), 'board-score'),
      cell(entry.rank, 'board-rank'),
      cell(`${entry.accuracy}%`, 'board-accuracy'),
      cell(formatDate(entry.date), 'board-date'),
    );
    body.append(row);
  });

  const empty = document.getElementById('board-empty');
  empty.hidden = entries.length > 0;
  empty.textContent = `No scores yet. Play Level ${activeId} to set the first one.`;
  document.getElementById('board-table').hidden = entries.length === 0;
}
