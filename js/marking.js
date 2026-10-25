import { MINUS, superscript, xPart, termsOf, formatTerm, formatTerms, formatPoly, multiply } from './poly.js';

export const HINTS = {
  empty: 'Write your answer in the box',
  unreadable: 'Write just the expanded answer',
  leadingPlus: 'No + needed at the start',
  doubleSign: `Use one sign: write ${MINUS} 3x, not + ${MINUS}3x`,
  zero: 'Leave out terms that are 0',
  powerOne: 'Write x, not x¹',
  powerZero: 'Write the number on its own, not x⁰',
  powerDigit: 'Use the power button: x², not x2',
};

const SUPERSCRIPT_TO_DIGIT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

// Plain ASCII form: capital X to x, every kind of minus to "-", superscripts to "^n", no spaces.
export function normalise(raw) {
  return raw
    .replace(/X/g, 'x')
    .replace(/[−‐‑‒–—﹣－]/g, '-')
    .replace(/＋/g, '+')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (s) => '^' + [...s].map((c) => SUPERSCRIPT_TO_DIGIT[c]).join(''))
    .replace(/\s+/g, '');
}

// What the app read, for the preview line. Shown even when the answer would be rejected.
export function prettify(raw) {
  return normalise(raw)
    .replace(/\^(\d+)/g, (_, d) => superscript(d))
    .replace(/[+-]/g, (sign, i) => (i === 0 ? sign : ` ${sign} `))
    .replace(/ {2,}/g, ' ')
    .trim()
    .replace(/-/g, MINUS);
}

const reject = (hint) => ({ ok: false, hint });

function leadingOneHint(sign, power) {
  const s = sign < 0 ? MINUS : '';
  return `Write ${s}${xPart(power)}, not ${s}1${xPart(power)}`;
}

// Reads an answer into terms in the order written, or rejects it with a hint.
export function readAnswer(raw) {
  const s = normalise(raw);
  if (s === '') return reject(HINTS.empty);
  if (/[^0-9x+\-^]/.test(s)) return reject(HINTS.unreadable);
  if (s.startsWith('+')) return reject(HINTS.leadingPlus);
  if (/[+-]{2,}/.test(s)) return reject(HINTS.doubleSign);
  if (/[+-]$/.test(s)) return reject(HINTS.unreadable);

  const terms = [];
  for (const chunk of s.split(/(?=[+-])/)) {
    const sign = chunk[0] === '-' ? -1 : 1;
    const body = chunk.replace(/^[+-]/, '');
    const m = body.match(/^(\d*)(?:(x)(?:\^(\d+)|(\d+))?)?$/);
    if (!m || body === '') return reject(HINTS.unreadable);
    const [, digits, x, power, trailingDigits] = m;
    if (trailingDigits !== undefined) return reject(HINTS.powerDigit);
    if (digits !== '' && Number(digits) === 0) return reject(HINTS.zero);
    if (digits.length > 1 && digits[0] === '0') return reject(HINTS.unreadable);

    let p = 0;
    if (x) {
      p = 1;
      if (power !== undefined) {
        if (power.length > 1 && power[0] === '0') return reject(HINTS.unreadable);
        p = Number(power);
        if (p === 1) return reject(HINTS.powerOne);
        if (p === 0) return reject(HINTS.powerZero);
      }
      if (digits === '1') return reject(leadingOneHint(sign, p));
    }
    terms.push({ coef: sign * (digits === '' ? 1 : Number(digits)), power: p });
  }
  return { ok: true, terms };
}

// 'correct' | 'unordered' (right, collected, wrong order) | 'uncollected' (right total) | 'wrong'
export function classify(terms, answer) {
  const totals = new Map();
  for (const t of terms) totals.set(t.power, (totals.get(t.power) ?? 0) + t.coef);
  const top = Math.max(answer.length - 1, ...totals.keys());
  for (let p = 0; p <= top; p++) {
    if ((totals.get(p) ?? 0) !== (answer[p] ?? 0)) return 'wrong';
  }
  const powers = terms.map((t) => t.power);
  if (new Set(powers).size !== powers.length) return 'uncollected';
  return powers.every((p, i) => i === 0 || p < powers[i - 1]) ? 'correct' : 'unordered';
}

export function newQuestionState() {
  return { attempt: 1, done: false, marks: 0, finalAnswer: null, feedback: null };
}

// Feedback kinds: rejected, retry (first answer wrong), correct, unordered, uncollected,
// second (right on the retry), second-uncollected, solution (wrong twice).
export function submitAnswer(state, raw, answer) {
  if (state.done) return state;
  const read = readAnswer(raw);
  if (!read.ok) return { ...state, feedback: { kind: 'rejected', hint: read.hint } };

  const result = classify(read.terms, answer);
  if (state.attempt === 1) {
    if (result === 'wrong') return { ...state, attempt: 2, feedback: { kind: 'retry' } };
    const marks = result === 'uncollected' ? 0.5 : 1;
    return { ...state, done: true, marks, finalAnswer: raw, feedback: { kind: result } };
  }
  if (result === 'wrong') return { ...state, done: true, marks: 0, finalAnswer: raw, feedback: { kind: 'solution' } };
  const kind = result === 'uncollected' ? 'second-uncollected' : 'second';
  return { ...state, done: true, marks: 0.5, finalAnswer: raw, feedback: { kind } };
}

// Grid-method working: row headers are the first bracket's terms, columns the second's.
export function gridSolution(a, b) {
  const rows = termsOf(a);
  const cols = termsOf(b);
  const cells = rows.map((r) => cols.map((c) => ({ coef: r.coef * c.coef, power: r.power + c.power })));
  const header = (t, i) => (i === 0 || t.coef < 0 ? formatTerm(t) : '+' + formatTerm(t));
  return {
    rowLabels: rows.map(header),
    colLabels: cols.map(header),
    cells: cells.map((row) => row.map(formatTerm)),
    expanded: formatTerms(cells.flat()),
    answer: formatPoly(multiply(a, b)),
  };
}

export function formatScore(n) {
  const whole = Math.floor(n);
  if (n - whole === 0.5) return whole === 0 ? '½' : `${whole}½`;
  return String(whole);
}
