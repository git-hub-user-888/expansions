import { test } from 'node:test';
import assert from 'node:assert/strict';
import { multiply } from '../js/poly.js';
import { readAnswer, classify, submitAnswer, newQuestionState, prettify, gridSolution, formatScore, HINTS } from '../js/marking.js';

// Brackets as coefficient arrays [c0, c1, c2].
const Q1 = [[3, 1], [-4, 1]];            // (x + 3)(x − 4) = x² − x − 12
const Q2 = [[3, 1], [-3, 1]];            // (x + 3)(x − 3) = x² − 9
const Q3 = [[-5, 2], [-20, 3, 1]];       // (2x − 5)(x² + 3x − 20) = 2x³ + x² − 55x + 100

// Outcome of a first attempt: 1, 0.5, 'wrong' or { hint }.
function firstAttempt(raw, brackets) {
  const answer = multiply(...brackets);
  const state = submitAnswer(newQuestionState(), raw, answer);
  if (state.feedback.kind === 'rejected') return { hint: state.feedback.hint, kind: 'rejected' };
  if (state.feedback.kind === 'retry') return { kind: 'wrong' };
  return { kind: state.feedback.kind, marks: state.marks };
}

// Spec section 9.
const CASES = [
  [1, Q1, 'x^2-x-12', { kind: 'correct', marks: 1 }],
  [2, Q1, 'x²−x−12', { kind: 'correct', marks: 1 }],
  [3, Q1, ' x ^ 2 - x - 12 ', { kind: 'correct', marks: 1 }],
  [4, Q1, 'X^2–X–12', { kind: 'correct', marks: 1 }],
  [5, Q1, '-x-12+x^2', { kind: 'unordered', marks: 1 }],
  [6, Q1, 'x^2+3x-4x-12', { kind: 'uncollected', marks: 0.5 }],
  [7, Q1, 'x^2-x-12-12+12', { kind: 'uncollected', marks: 0.5 }],
  [8, Q1, 'x^2-1x-12', { kind: 'rejected', hint: 'Write −x, not −1x' }],
  [9, Q1, 'x^2-x^1-12', { kind: 'rejected', hint: HINTS.powerOne }],
  [10, Q1, 'x^2+-x-12', { kind: 'rejected', hint: HINTS.doubleSign }],
  [11, Q1, 'x^2-x-12+0x', { kind: 'rejected', hint: HINTS.zero }],
  [12, Q1, 'x2-x-12', { kind: 'rejected', hint: HINTS.powerDigit }],
  [13, Q1, '+x^2-x-12', { kind: 'rejected', hint: HINTS.leadingPlus }],
  [14, Q1, '(x+3)(x-4)', { kind: 'rejected', hint: HINTS.unreadable }],
  [15, Q1, 'x^2-x-12=', { kind: 'rejected', hint: HINTS.unreadable }],
  [16, Q1, 'x^2+x-12', { kind: 'wrong' }],
  [17, Q1, 'x^2-x+12', { kind: 'wrong' }],
  [18, Q1, 'x^2-12', { kind: 'wrong' }],
  [19, Q1, 'x^2 × x - 12', { kind: 'rejected', hint: HINTS.unreadable }],
  [20, Q2, 'x^2-9', { kind: 'correct', marks: 1 }],
  [21, Q2, 'x^2+3x-3x-9', { kind: 'uncollected', marks: 0.5 }],
  [22, Q2, 'x^2+0x-9', { kind: 'rejected', hint: HINTS.zero }],
  [23, Q3, '2x^3+x^2-55x+100', { kind: 'correct', marks: 1 }],
  [24, Q3, '2x^3+1x^2-55x+100', { kind: 'rejected', hint: 'Write x², not 1x²' }],
  [25, Q3, '2x^3+6x^2-5x^2-55x+100', { kind: 'uncollected', marks: 0.5 }],
];

for (const [n, brackets, raw, expected] of CASES) {
  test(`marker case ${n}: ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(firstAttempt(raw, brackets), expected);
  });
}

test('other forms the spec rejects', () => {
  assert.equal(readAnswer('1x+3').hint, 'Write x, not 1x');
  assert.equal(readAnswer('x^2-x^0').hint, HINTS.powerZero);
  assert.equal(readAnswer('x^2--x').hint, HINTS.doubleSign);
  assert.equal(readAnswer('x^2++x').hint, HINTS.doubleSign);
  assert.equal(readAnswer('x^2+0').hint, HINTS.zero);
  assert.equal(readAnswer('').hint, HINTS.empty);
  assert.equal(readAnswer('   ').hint, HINTS.empty);
  assert.equal(readAnswer('x^2-').hint, HINTS.unreadable);
  assert.equal(readAnswer('x^').hint, HINTS.unreadable);
  assert.equal(readAnswer('xx').hint, HINTS.unreadable);
  assert.equal(readAnswer('2^2').hint, HINTS.unreadable);
  assert.equal(readAnswer('y^2+1').hint, HINTS.unreadable);
  assert.equal(readAnswer('x*x').hint, HINTS.unreadable);
});

test('a plain number and x on its own are read correctly', () => {
  assert.deepEqual(readAnswer('x−7').terms, [{ coef: 1, power: 1 }, { coef: -7, power: 0 }]);
  assert.deepEqual(readAnswer('-x³').terms, [{ coef: -1, power: 3 }]);
});

test('an extra term that cancels out is not collected, not wrong', () => {
  const answer = multiply(...Q1);
  assert.equal(classify(readAnswer('x^2-x-12+x^3-x^3').terms, answer), 'uncollected');
});

test('a missing top power is wrong', () => {
  assert.equal(classify(readAnswer('-55x+100+x^2').terms, multiply(...Q3)), 'wrong');
});

test('retry: wrong then right scores ½', () => {
  const answer = multiply(...Q1);
  let s = submitAnswer(newQuestionState(), 'x^2+x-12', answer);
  assert.equal(s.feedback.kind, 'retry');
  assert.equal(s.done, false);
  s = submitAnswer(s, '-x+x^2-12', answer);
  assert.deepEqual([s.done, s.marks, s.feedback.kind], [true, 0.5, 'second']);
});

test('retry: wrong then not collected scores ½', () => {
  const answer = multiply(...Q1);
  let s = submitAnswer(newQuestionState(), 'x^2+x-12', answer);
  s = submitAnswer(s, 'x^2+3x-4x-12', answer);
  assert.deepEqual([s.done, s.marks, s.feedback.kind], [true, 0.5, 'second-uncollected']);
});

test('retry: wrong twice scores 0 and shows the solution', () => {
  const answer = multiply(...Q1);
  let s = submitAnswer(newQuestionState(), 'x^2+x-12', answer);
  s = submitAnswer(s, 'x^2+x+12', answer);
  assert.deepEqual([s.done, s.marks, s.feedback.kind, s.finalAnswer], [true, 0, 'solution', 'x^2+x+12']);
});

test('a rejected entry does not use up an attempt', () => {
  const answer = multiply(...Q1);
  let s = submitAnswer(newQuestionState(), 'x^2+x-12', answer);
  s = submitAnswer(s, 'x^2-1x-12', answer);
  assert.equal(s.feedback.kind, 'rejected');
  assert.equal(s.attempt, 2);
  assert.equal(s.done, false);
  s = submitAnswer(newQuestionState(), 'x2-x-12', answer);
  assert.equal(s.attempt, 1);
  s = submitAnswer(s, 'x^2-x-12', answer);
  assert.deepEqual([s.marks, s.feedback.kind], [1, 'correct']);
});

test('preview shows what was read', () => {
  assert.equal(prettify('x^2-x-12'), 'x² − x − 12');
  assert.equal(prettify(' -x^3+2x'), '−x³ + 2x');
  assert.equal(prettify('x2+-3'), 'x2 + − 3');
});

test('worked solution uses the grid method', () => {
  const g = gridSolution(...Q1);
  assert.deepEqual(g.rowLabels, ['x', '+3']);
  assert.deepEqual(g.colLabels, ['x', '−4']);
  assert.deepEqual(g.cells, [['x²', '−4x'], ['3x', '−12']]);
  assert.equal(g.expanded, 'x² − 4x + 3x − 12');
  assert.equal(g.answer, 'x² − x − 12');
  assert.equal(gridSolution(...Q3).cells.flat().length, 6);
});

test('scores show halves', () => {
  assert.equal(formatScore(0), '0');
  assert.equal(formatScore(0.5), '½');
  assert.equal(formatScore(8.5), '8½');
  assert.equal(formatScore(10), '10');
});
