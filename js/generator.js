import { multiply, formatPoly, MINUS } from './poly.js';

export const LEVELS = [
  { level: 1, name: 'Linear × linear', degrees: [1, 1], example: `(x + 3)(x ${MINUS} 4)` },
  { level: 2, name: 'Linear × quadratic', degrees: [1, 2], example: `(2x ${MINUS} 5)(x² + 3x ${MINUS} 20)` },
  { level: 3, name: 'Quadratic × quadratic', degrees: [2, 2], example: '(x² + 3x + 2)(x² + 3x + 2)' },
];
export const MAX_LEVEL = LEVELS.length;
export const SET_SIZE = 10;

export const LARGE_NUMBERS = [12, 15, 20];
const LARGE_CHANCE = 0.2;
const NEGATIVE_LEADING_CHANCE = 0.1;
const LEADING_ONE_CHANCE = 0.5;

// Small seedable generator (mulberry32) so tests are repeatable.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

function nonZero(rng) {
  let n;
  do n = int(rng, -10, 10); while (n === 0);
  return n;
}

function leading(rng) {
  return rng() < LEADING_ONE_CHANCE ? 1 : int(rng, 2, 5);
}

// A bracket as coefficients. `constant` overrides the number term (used for 12, 15, 20).
function bracket(rng, degree, constant) {
  const p = new Array(degree + 1).fill(0);
  p[degree] = leading(rng);
  if (degree === 1) {
    p[0] = constant ?? nonZero(rng);
  } else {
    // x² is always there, plus at least one other term; a 0 coefficient just isn't shown.
    do {
      p[1] = int(rng, -10, 10);
      p[0] = constant ?? int(rng, -10, 10);
    } while (p[1] === 0 && p[0] === 0);
  }
  return p;
}

export function generateQuestion(level, rng = Math.random) {
  const { degrees } = LEVELS[level - 1];
  const largeIn = rng() < LARGE_CHANCE ? int(rng, 0, degrees.length - 1) : -1;
  const negativeIn = rng() < NEGATIVE_LEADING_CHANCE ? int(rng, 0, degrees.length - 1) : -1;
  const brackets = degrees.map((degree, i) => {
    const constant = i === largeIn ? pick(rng, LARGE_NUMBERS) * (rng() < 0.5 ? -1 : 1) : undefined;
    const b = bracket(rng, degree, constant);
    if (i === negativeIn) b[degree] = -b[degree];
    return b;
  });
  return {
    level,
    brackets,
    answer: multiply(brackets[0], brackets[1]),
    text: brackets.map((b) => `(${formatPoly(b)})`).join(''),
  };
}

export function generateSet(level, rng = Math.random, size = SET_SIZE) {
  const seen = new Set();
  const questions = [];
  while (questions.length < size) {
    const q = generateQuestion(level, rng);
    if (!seen.has(q.text)) {
      seen.add(q.text);
      questions.push(q);
    }
  }
  return questions;
}
