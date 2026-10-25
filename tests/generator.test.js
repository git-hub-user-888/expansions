import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, formatPoly } from '../js/poly.js';
import { generateQuestion, generateSet, seededRandom, LEVELS, LARGE_NUMBERS, SET_SIZE } from '../js/generator.js';
import { readAnswer, classify } from '../js/marking.js';

const N = 1000;

function sample(level, seed) {
  const rng = seededRandom(seed);
  return Array.from({ length: N }, () => generateQuestion(level, rng));
}

for (const { level, degrees } of LEVELS) {
  const questions = sample(level, 1000 + level);

  test(`level ${level}: bracket shapes follow the spec`, () => {
    for (const q of questions) {
      q.brackets.forEach((b, i) => {
        assert.equal(b.length - 1, degrees[i], q.text);
        const lead = b.at(-1);
        assert.ok(Math.abs(lead) >= 1 && Math.abs(lead) <= 5, q.text);
        if (b.length === 2) assert.notEqual(b[0], 0, q.text);
        else assert.ok(b[0] !== 0 || b[1] !== 0, q.text);
        // x and x² coefficients stay within ±10; only the number term may be 12, 15 or 20.
        b.slice(1).forEach((c) => assert.ok(Math.abs(c) <= 10, q.text));
        assert.ok(Math.abs(b[0]) <= 10 || LARGE_NUMBERS.includes(Math.abs(b[0])), q.text);
      });
    }
  });

  test(`level ${level}: no 0 is ever shown`, () => {
    for (const q of questions) assert.doesNotMatch(q.text, /(?<!\d)0/, q.text);
  });

  test(`level ${level}: answers match multiplying out the brackets`, () => {
    for (const q of questions) {
      for (let x = -3; x <= 3; x++) {
        // `+ 0` turns −0 into 0, which strict equality would otherwise tell apart.
        assert.equal(evaluate(q.answer, x), evaluate(q.brackets[0], x) * evaluate(q.brackets[1], x) + 0, q.text);
      }
    }
  });

  test(`level ${level}: the formatted answer is marked correct`, () => {
    for (const q of questions) {
      const read = readAnswer(formatPoly(q.answer));
      assert.ok(read.ok, q.text);
      assert.equal(classify(read.terms, q.answer), 'correct', q.text);
    }
  });

  test(`level ${level}: 12, 15 or 20 appear in 15–25% of questions`, () => {
    const share = questions.filter((q) => q.brackets.some((b) => Math.abs(b[0]) > 10)).length / N;
    assert.ok(share >= 0.15 && share <= 0.25, `share was ${share}`);
  });

  test(`level ${level}: leading number is 1 about half the time and negative about 1 in 10`, () => {
    const leads = questions.flatMap((q) => q.brackets.map((b) => b.at(-1)));
    const ones = leads.filter((c) => Math.abs(c) === 1).length / leads.length;
    const negativeQuestions = questions.filter((q) => q.brackets.some((b) => b.at(-1) < 0)).length / N;
    assert.ok(ones >= 0.4 && ones <= 0.6, `ones share was ${ones}`);
    assert.ok(negativeQuestions >= 0.05 && negativeQuestions <= 0.15, `negative share was ${negativeQuestions}`);
  });

  test(`level ${level}: no question repeats within a set`, () => {
    const rng = seededRandom(level);
    for (let i = 0; i < 200; i++) {
      const set = generateSet(level, rng);
      assert.equal(set.length, SET_SIZE);
      assert.equal(new Set(set.map((q) => q.text)).size, SET_SIZE);
    }
  });
}
