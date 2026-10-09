// Starts the game and connects the buttons to the game logic.

import { loadData } from './data.js';
import { renderCase, renderReveal, showNotice } from './ui.js';

let cases = [];
let patterns = {};
let caseIndex = 0;

function showCurrentCase() {
  renderCase(cases[caseIndex]);
}

function decide(decision) {
  const currentCase = cases[caseIndex];
  renderReveal(currentCase, decision, patterns[currentCase.patternId]);
}

function nextCase() {
  // Loop back to the first case after the last one.
  caseIndex = (caseIndex + 1) % cases.length;
  showCurrentCase();
}

async function start() {
  try {
    ({ cases, patterns } = await loadData());
  } catch (error) {
    console.error(error);
    showNotice('The game data could not be loaded. Check the browser console for details.');
    return;
  }

  document.getElementById('btn-approve').addEventListener('click', () => decide('approve'));
  document.getElementById('btn-decline').addEventListener('click', () => decide('decline'));
  document.getElementById('btn-next').addEventListener('click', nextCase);

  showCurrentCase();
}

// On a file:// address the data cannot load; index.html already explains why.
if (location.protocol !== 'file:') {
  start();
}
