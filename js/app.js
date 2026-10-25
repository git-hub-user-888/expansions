import { LEVELS, SET_SIZE, generateSet } from './generator.js';
import { MINUS, formatPoly } from './poly.js';
import { newQuestionState, submitAnswer, prettify, gridSolution, formatScore } from './marking.js';
import { BADGES, recordSet, streaks, personalBests, formatDuration } from './progress.js';
import { loadProgress, saveProgress, shareBackup, readBackupFile, requestPersistence } from './store.js';
import { Scratchpad } from './scratchpad.js';
import { confetti } from './confetti.js';
import { icon } from './icons.js';

const root = document.getElementById('app');
let progress = loadProgress();
let leaveScreen = null;

// --- Small DOM helpers ---------------------------------------------------------------

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

function show(...nodes) {
  leaveScreen?.();
  leaveScreen = null;
  root.replaceChildren(...nodes);
  window.scrollTo(0, 0);
}

const badgeById = new Map(BADGES.map((b) => [b.id, b]));

function badgeChip(id) {
  return h('span', { class: 'chip chip-accent' }, icon('star'), badgeById.get(id).name);
}

// --- Menu ------------------------------------------------------------------------------

function menuScreen() {
  const { current } = streaks(progress.sets);
  const bests = personalBests(progress.sets);
  show(h('main', { class: 'page' },
    h('header', { class: 'menu-head' },
      h('h1', {}, 'Expansions'),
      h('span', { class: `chip${current ? ' chip-accent' : ''}` },
        current ? `${current}-day streak` : 'Start a streak today')),
    h('div', { class: 'stack' }, LEVELS.map((l) => levelCard(l, bests[l.level]))),
    h('button', { class: 'btn btn-secondary btn-wide', onclick: historyScreen }, 'History'),
  ));
}

function levelCard({ level, name, example }, best) {
  const locked = level > progress.unlockedLevel;
  return h('section', { class: `card level${locked ? ' locked' : ''}` },
    h('div', { class: 'level-head' },
      h('span', { class: 'eyebrow' }, `Level ${level}`),
      locked ? icon('lock') : best !== undefined ? h('span', { class: 'muted small' }, `Best time ${formatDuration(best)}`) : null),
    h('h2', {}, name),
    h('p', { class: 'maths example' }, example),
    locked
      ? h('p', { class: 'muted' }, `Get 10/10 on Level ${level - 1} to unlock`)
      : h('div', { class: 'row' },
        h('button', { class: 'btn btn-primary', onclick: () => startSet(level, 'practice') }, 'Practise'),
        h('button', { class: 'btn btn-secondary', onclick: () => startSet(level, 'timed') }, 'Timed')),
  );
}

// --- Question --------------------------------------------------------------------------

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'x', '²', '³', '⁴', '+', MINUS, 'back', 'clear'];

function startSet(level, mode) {
  playScreen({ level, mode, questions: generateSet(level), index: 0, results: [], startedAt: new Date(), finishedAt: null });
}

function playScreen(run) {
  let state = newQuestionState();

  // Top bar
  const titleEl = h('div', { class: 'play-title' });
  const scoreEl = h('div', { class: 'play-score' });
  const timerEl = run.mode === 'timed' ? h('div', { class: 'play-timer' }, '0:00') : null;
  const quitBtn = h('button', { class: 'btn btn-icon', 'aria-label': 'Quit this set', onclick: quit }, icon('close'));

  // Scratchpad
  const canvas = h('canvas', { class: 'pad-canvas', 'aria-label': 'Working area' });
  const pad = new Scratchpad(canvas);
  const toolBtns = {
    pen: h('button', { class: 'tool', 'aria-label': 'Pen', onclick: () => setTool('pen') }, icon('pen')),
    eraser: h('button', { class: 'tool', 'aria-label': 'Eraser', onclick: () => setTool('eraser') }, icon('eraser')),
  };
  const colourBtns = Object.fromEntries(['ink', 'blue', 'red'].map((c) => [c,
    h('button', { class: `tool swatch swatch-${c}`, 'aria-label': { ink: 'Black ink', blue: 'Blue ink', red: 'Red ink' }[c], onclick: () => setColour(c) }, h('span', {}))]));
  const undoBtn = h('button', { class: 'tool', 'aria-label': 'Undo', onclick: () => pad.undo() }, icon('undo'));
  const redoBtn = h('button', { class: 'tool', 'aria-label': 'Redo', onclick: () => pad.redo() }, icon('redo'));
  const clearPadBtn = h('button', { class: 'tool', 'aria-label': 'Clear working', onclick: () => pad.clear() }, icon('trash'));
  const toolbar = h('div', { class: 'toolbar' },
    toolBtns.pen, toolBtns.eraser, h('span', { class: 'sep' }),
    Object.values(colourBtns), h('span', { class: 'sep' }),
    undoBtn, redoBtn, clearPadBtn);
  const solutionEl = h('div', { class: 'solution', hidden: true });

  // Answer
  const questionEl = h('div', { class: 'question maths' });
  const previewEl = h('div', { class: 'preview' });
  const messageEl = h('div', { class: 'message', 'aria-live': 'polite' });
  const input = h('input', {
    class: 'answer-input maths', type: 'text', inputmode: 'none', placeholder: 'Type, tap or write your answer',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done',
    'aria-label': 'Your answer', oninput: updatePreview,
  });
  const keyboardBtn = h('button', { class: 'btn btn-icon', 'aria-label': 'Show keyboard', onclick: toggleKeyboard }, icon('keyboard'));
  const checkBtn = h('button', { class: 'btn btn-primary', onclick: check }, 'Check');
  const keypad = h('div', { class: 'keypad' }, KEYS.map((k) => h('button', {
    class: `key${k === 'back' || k === 'clear' ? ' key-action' : ''}${'²³⁴'.includes(k) ? ' key-power' : ''}`,
    'aria-label': k === 'back' ? 'Delete' : k === 'clear' ? 'Clear answer' : null,
    onclick: () => press(k),
  }, k === 'back' ? icon('backspace') : k === 'clear' ? 'Clear' : k)));
  const entry = h('div', { class: 'entry' }, h('div', { class: 'input-row' }, input, keyboardBtn, checkBtn), keypad);
  const nextBtn = h('button', { class: 'btn btn-primary btn-wide', onclick: next }, 'Next');
  const after = h('div', { class: 'after', hidden: true }, nextBtn);

  show(h('main', { class: 'play' },
    h('header', { class: 'play-bar' }, h('div', { class: 'bar-left' }, quitBtn, titleEl), h('div', { class: 'bar-right' }, timerEl, scoreEl)),
    questionEl,
    h('div', { class: 'pad' }, canvas, toolbar, solutionEl),
    h('section', { class: 'answer' }, previewEl, messageEl, entry, after),
  ));

  pad.onChange = updateToolbar;
  setTool('pen');
  setColour('ink');

  const timerId = timerEl ? setInterval(() => {
    timerEl.textContent = formatDuration(((run.finishedAt ?? new Date()) - run.startedAt) / 1000);
  }, 250) : null;

  function onKey(e) {
    if (e.key !== 'Enter' || e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    if (state.done) next();
    else if (document.activeElement === input) check();
  }
  document.addEventListener('keydown', onKey);
  leaveScreen = () => {
    clearInterval(timerId);
    pad.destroy();
    document.removeEventListener('keydown', onKey);
  };

  loadQuestion();

  function loadQuestion() {
    const q = run.questions[run.index];
    state = newQuestionState();
    titleEl.textContent = `Level ${run.level} · Question ${run.index + 1} of ${SET_SIZE}`;
    questionEl.textContent = q.text;
    input.value = '';
    updatePreview();
    setMessage(null);
    solutionEl.hidden = true;
    entry.hidden = false;
    after.hidden = true;
    pad.reset();
    updateScore();
  }

  function updateScore() {
    scoreEl.textContent = `Score ${formatScore(run.results.reduce((n, r) => n + r.marks, 0))}`;
  }

  function updatePreview() {
    const read = prettify(input.value);
    previewEl.replaceChildren(h('span', { class: 'muted' }, 'I read: '), h('span', { class: 'maths' }, read || '…'));
    checkBtn.disabled = read === '';
  }

  function setMessage(tone, text) {
    messageEl.className = `message${tone ? ` message-${tone}` : ''}`;
    messageEl.textContent = text ?? '';
  }

  function setTool(tool) {
    pad.tool = tool;
    updateToolbar();
  }

  function setColour(colour) {
    pad.colour = colour;
    pad.tool = 'pen';
    updateToolbar();
  }

  function updateToolbar() {
    for (const [name, btn] of Object.entries(toolBtns)) btn.classList.toggle('active', pad.tool === name);
    for (const [name, btn] of Object.entries(colourBtns)) btn.classList.toggle('active', pad.colour === name);
    undoBtn.disabled = !pad.canUndo;
    redoBtn.disabled = !pad.canRedo;
    clearPadBtn.disabled = pad.isBlank;
  }

  function press(key) {
    if (state.done) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (key === 'clear') input.value = '';
    else if (key === 'back') {
      if (start !== end) input.setRangeText('', start, end, 'end');
      else if (start > 0) input.setRangeText('', start - 1, start, 'end');
    } else input.setRangeText(key, start, end, 'end');
    updatePreview();
  }

  function toggleKeyboard() {
    const showing = input.inputMode === 'text';
    input.inputMode = showing ? 'none' : 'text';
    keyboardBtn.classList.toggle('active', !showing);
    keyboardBtn.setAttribute('aria-label', showing ? 'Show keyboard' : 'Hide keyboard');
    input.blur();
    if (!showing) input.focus();
  }

  function check() {
    if (state.done) return;
    const q = run.questions[run.index];
    state = submitAnswer(state, input.value, q.answer);
    const answer = formatPoly(q.answer);
    const messages = {
      rejected: ['hint', state.feedback.hint],
      retry: ['bad', 'Not quite. Have another go.'],
      correct: ['good', 'Correct. 1 mark.'],
      unordered: ['good', 'Correct. 1 mark. Tip: write powers from highest to lowest.'],
      uncollected: ['half', `½ mark. Collect like terms: ${answer}`],
      second: ['half', 'Correct on the second go. ½ mark.'],
      'second-uncollected': ['half', `½ mark. Collect like terms: ${answer}`],
      solution: ['bad', `0 marks. The answer is ${answer}.`],
    };
    setMessage(...messages[state.feedback.kind]);
    if (state.feedback.kind === 'solution') showSolution(q);
    if (state.done) finishQuestion(q);
  }

  function showSolution(q) {
    const g = gridSolution(...q.brackets);
    solutionEl.replaceChildren(h('div', { class: 'solution-card' },
      h('h3', {}, 'Worked solution'),
      h('table', { class: 'grid maths' },
        h('tr', {}, h('th', { class: 'corner' }, '×'), g.colLabels.map((c) => h('th', {}, c))),
        g.rowLabels.map((r, i) => h('tr', {}, h('th', {}, r), g.cells[i].map((c) => h('td', {}, c))))),
      h('p', { class: 'maths working' }, `= ${g.expanded}`),
      h('p', { class: 'maths working answer-line' }, `= ${g.answer}`),
    ));
    solutionEl.hidden = false;
  }

  function finishQuestion(q) {
    run.results.push({ text: q.text, answer: state.finalAnswer, marks: state.marks, correctAnswer: formatPoly(q.answer) });
    updateScore();
    entry.hidden = true;
    after.hidden = false;
    const last = run.index === SET_SIZE - 1;
    if (last) {
      run.finishedAt = new Date();
      clearInterval(timerId);
      if (timerEl) timerEl.textContent = formatDuration((run.finishedAt - run.startedAt) / 1000);
    }
    nextBtn.textContent = last ? 'See results' : 'Next';
    nextBtn.focus({ preventScroll: true });
  }

  function next() {
    if (!state.done) return;
    if (run.index === SET_SIZE - 1) finishSet(run);
    else {
      run.index += 1;
      loadQuestion();
    }
  }

  function quit() {
    if (confirm("Quit this set? This set won't be saved.")) menuScreen();
  }
}

function finishSet(run) {
  const score = run.results.reduce((n, r) => n + r.marks, 0);
  const firstTimeRight = run.results.filter((r) => r.marks === 1).length;
  const set = {
    id: crypto.randomUUID(),
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt.toISOString(),
    level: run.level,
    mode: run.mode,
    score,
    durationSeconds: Math.round((run.finishedAt - run.startedAt) / 100) / 10,
    perfect: firstTimeRight === SET_SIZE,
    firstTimeRight,
  };
  const outcome = recordSet(progress, set, run.finishedAt);
  progress = outcome.progress;
  resultsScreen(run, set, outcome, saveProgress(progress));
}

// --- Results ---------------------------------------------------------------------------

function markLabel(marks) {
  return marks === 1 ? '1' : marks === 0.5 ? '½' : '0';
}

function resultsScreen(run, set, outcome, saved) {
  const backupStatus = h('p', { class: 'muted small' },
    saved ? 'Saved on this iPad. Keep a copy in iCloud Drive in case the iPad is reset.' : 'Could not save on this iPad. Back up now to keep this set.');
  const banners = [
    outcome.unlockedLevel ? h('span', { class: 'chip chip-accent' }, `Level ${outcome.unlockedLevel} unlocked!`) : null,
    outcome.newPersonalBest ? h('span', { class: 'chip chip-accent' }, 'New personal best!') : null,
    // The "Level N unlocked!" chip already says what the level badge would.
    ...outcome.newBadges.filter((id) => !id.startsWith('level-')).map(badgeChip),
  ].filter(Boolean);

  show(h('main', { class: 'page' },
    h('header', { class: 'results-head' },
      h('p', { class: 'eyebrow' }, `Level ${set.level} · ${set.mode === 'timed' ? 'Timed' : 'Practice'}`),
      h('div', { class: 'big-score' }, formatScore(set.score), h('span', { class: 'out-of' }, `/${SET_SIZE}`)),
      set.mode === 'timed' ? h('p', { class: 'time' }, formatDuration(set.durationSeconds)) : null,
      banners.length ? h('div', { class: 'chips' }, banners) : null),
    h('div', { class: 'row row-center' },
      h('button', { class: 'btn btn-primary', onclick: () => startSet(set.level, set.mode) }, 'Try again'),
      h('button', { class: 'btn btn-secondary', onclick: menuScreen }, 'Menu')),
    h('ol', { class: 'card result-list' }, run.results.map((r) => h('li', {},
      h('div', { class: 'result-q maths' }, r.text),
      h('div', { class: 'result-a' },
        h('span', { class: 'maths' }, prettify(r.answer)),
        r.marks < 1 ? h('span', { class: 'muted small maths' }, `Answer: ${r.correctAnswer}`) : null),
      h('div', { class: `result-m m-${r.marks === 1 ? 'good' : r.marks === 0.5 ? 'half' : 'bad'}` }, markLabel(r.marks))))),
    backupCard(backupStatus),
  ));
  if (set.perfect) confetti();
}

function backupCard(status) {
  return h('section', { class: 'card backup' },
    h('div', {}, h('strong', {}, 'Back up'), status),
    h('button', {
      class: 'btn btn-secondary',
      onclick: async () => {
        try {
          const result = await shareBackup(progress);
          status.textContent = {
            shared: 'Backup done. Choose Save to Files, then iCloud Drive, if you have not already.',
            downloaded: 'Backup file downloaded.',
            cancelled: 'Backup skipped.',
          }[result];
        } catch (e) {
          status.textContent = `Backup failed: ${e.message}`;
        }
      },
    }, icon('cloud'), 'Back up to iCloud Drive'));
}

// --- History ---------------------------------------------------------------------------

function historyScreen() {
  const { current, best } = streaks(progress.sets);
  const bests = personalBests(progress.sets);
  const earned = new Set(progress.badges.map((b) => b.id));
  const days = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;
  const restoreStatus = h('p', { class: 'muted small' }, 'Restoring replaces the history on this iPad.');
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: restore });

  async function restore() {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = await readBackupFile(file);
      if (!confirm(`Replace this iPad's history (${progress.sets.length} sets) with the backup (${data.sets.length} sets)?`)) return;
      progress = data;
      saveProgress(progress);
      historyScreen();
    } catch (e) {
      restoreStatus.textContent = e.message;
    }
  }

  const tile = (label, value) => h('div', { class: 'card tile' }, h('span', { class: 'muted small' }, label), h('strong', {}, value));
  const setRow = (s) => h('div', { class: 'list-row' },
    h('span', {}, new Date(s.finishedAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })),
    h('span', { class: 'muted' }, `Level ${s.level} · ${s.mode === 'timed' ? `Timed ${formatDuration(s.durationSeconds)}` : 'Practice'}`),
    h('strong', { class: s.perfect ? 'perfect' : '' }, `${formatScore(s.score)}/${SET_SIZE}`));

  show(h('main', { class: 'page' },
    h('header', { class: 'page-head' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Back to menu', onclick: menuScreen }, icon('back')),
      h('h1', {}, 'History')),
    h('div', { class: 'tiles' },
      tile('Current streak', days(current)),
      tile('Best streak', days(best)),
      tile('Sets completed', progress.sets.length)),
    h('section', {}, h('h2', {}, 'Personal bests'),
      h('div', { class: 'card list' }, LEVELS.map((l) => h('div', { class: 'list-row' },
        h('span', {}, `Level ${l.level}`),
        bests[l.level] !== undefined
          ? h('strong', {}, formatDuration(bests[l.level]))
          : h('span', { class: 'muted' }, 'No timed 10/10 yet'))))),
    h('section', {}, h('h2', {}, 'Badges'),
      h('div', { class: 'badges' }, BADGES.map((b) => h('div', { class: `card badge${earned.has(b.id) ? ' earned' : ''}` },
        icon('star'), h('strong', {}, b.name), h('span', { class: 'muted small' }, b.description))))),
    h('section', {}, h('h2', {}, 'Sets'),
      progress.sets.length
        ? h('div', { class: 'card list' }, [...progress.sets].reverse().map(setRow))
        : h('p', { class: 'muted' }, 'No sets yet. Finish a set and it will show here.')),
    backupCard(h('p', { class: 'muted small' }, 'Save a copy of your history to iCloud Drive.')),
    h('section', { class: 'card backup' },
      h('div', {}, h('strong', {}, 'Restore from backup'), restoreStatus),
      h('button', { class: 'btn btn-secondary', onclick: () => fileInput.click() }, 'Choose file'),
      fileInput),
  ));
}

// --- Start -----------------------------------------------------------------------------

requestPersistence();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
menuScreen();
