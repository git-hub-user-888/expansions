import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, recordSet, streaks, personalBests, validateProgress, formatDuration, dayKey } from '../js/progress.js';

// A date `daysAgo` local days before today, at the given local time.
function daysAgo(n, hour = 12, minute = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, hour, minute);
}

let nextId = 0;
function makeSet({ finishedAt = new Date(), level = 1, mode = 'practice', score = 7, durationSeconds = 300, firstTimeRight } = {}) {
  return {
    id: `set-${nextId++}`,
    startedAt: new Date(finishedAt.getTime() - durationSeconds * 1000).toISOString(),
    finishedAt: finishedAt.toISOString(),
    level, mode, score, durationSeconds,
    perfect: score === 10,
    firstTimeRight: firstTimeRight ?? Math.floor(score),
  };
}

test('streak counts consecutive days with a finished set', () => {
  const sets = [daysAgo(0), daysAgo(1), daysAgo(1, 18), daysAgo(2)].map((d) => makeSet({ finishedAt: d }));
  assert.deepEqual(streaks(sets), { current: 3, best: 3 });
});

test('streak is not broken until a whole day is missed', () => {
  const sets = [daysAgo(1), daysAgo(2)].map((d) => makeSet({ finishedAt: d }));
  assert.equal(streaks(sets).current, 2);
  const stale = [daysAgo(2), daysAgo(3)].map((d) => makeSet({ finishedAt: d }));
  assert.equal(streaks(stale).current, 0);
  assert.equal(streaks(stale).best, 2);
});

test('best streak survives a gap', () => {
  const sets = [daysAgo(0), daysAgo(5), daysAgo(6), daysAgo(7), daysAgo(8)].map((d) => makeSet({ finishedAt: d }));
  assert.deepEqual(streaks(sets), { current: 1, best: 4 });
  assert.deepEqual(streaks([]), { current: 0, best: 0 });
});

test('streak counts correctly across a clock change', (t) => {
  // Find the next spring-forward or fall-back day in the local time zone (tests run as Europe/London).
  const start = new Date();
  let change = null;
  for (let i = 0; i < 400 && !change; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const nextDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if (d.getTimezoneOffset() !== nextDay.getTimezoneOffset()) change = d;
  }
  if (!change) return t.skip('no clock change in this time zone');
  const day = (offset, hour, minute) =>
    new Date(change.getFullYear(), change.getMonth(), change.getDate() + offset, hour, minute);
  // Sets just after midnight and just before midnight either side of the change.
  const sets = [day(-1, 0, 30), day(0, 23, 30), day(1, 0, 30), day(2, 23, 30)].map((d) => makeSet({ finishedAt: d }));
  assert.equal(streaks(sets, day(2, 23, 45)).current, 4);
  assert.equal(new Set(sets.map((s) => dayKey(new Date(s.finishedAt)))).size, 4);
});

test('practice 10/10 unlocks the next level; 9½ does not', () => {
  let r = recordSet(emptyProgress(), makeSet({ score: 9.5, firstTimeRight: 9 }));
  assert.equal(r.progress.unlockedLevel, 1);
  assert.equal(r.unlockedLevel, null);
  r = recordSet(r.progress, makeSet({ score: 10 }));
  assert.equal(r.progress.unlockedLevel, 2);
  assert.equal(r.unlockedLevel, 2);
});

test('timed 10/10 does not unlock a level', () => {
  const r = recordSet(emptyProgress(), makeSet({ mode: 'timed', score: 10 }));
  assert.equal(r.progress.unlockedLevel, 1);
});

test('10/10 on an earlier level or the top level changes nothing', () => {
  const p = { ...emptyProgress(), unlockedLevel: 2 };
  assert.equal(recordSet(p, makeSet({ level: 1, score: 10 })).progress.unlockedLevel, 2);
  const top = { ...emptyProgress(), unlockedLevel: 3 };
  assert.equal(recordSet(top, makeSet({ level: 3, score: 10 })).progress.unlockedLevel, 3);
});

test('personal best is the fastest timed 10/10 per level', () => {
  let p = emptyProgress();
  let r = recordSet(p, makeSet({ mode: 'timed', score: 10, durationSeconds: 400 }));
  assert.equal(r.newPersonalBest, true);
  r = recordSet(r.progress, makeSet({ mode: 'timed', score: 9, durationSeconds: 100 }));
  assert.equal(r.newPersonalBest, false);
  r = recordSet(r.progress, makeSet({ mode: 'timed', score: 10, durationSeconds: 450 }));
  assert.equal(r.newPersonalBest, false);
  r = recordSet(r.progress, makeSet({ mode: 'timed', score: 10, durationSeconds: 350 }));
  assert.equal(r.newPersonalBest, true);
  r = recordSet(r.progress, makeSet({ mode: 'practice', score: 10, durationSeconds: 50 }));
  assert.deepEqual(personalBests(r.progress.sets), { 1: 350 });
});

test('badges are awarded once', () => {
  let r = recordSet(emptyProgress(), makeSet({ score: 10 }));
  assert.deepEqual(r.newBadges, ['first-steps', 'perfect', 'level-2']);
  r = recordSet(r.progress, makeSet({ mode: 'timed', score: 10 }));
  assert.deepEqual(r.newBadges, ['against-the-clock']);
  r = recordSet(r.progress, makeSet({ score: 10 }));
  assert.deepEqual(r.newBadges, []);
  assert.equal(r.progress.badges.length, 4);
});

test('streak badges follow the best streak', () => {
  let p = emptyProgress();
  let earned = [];
  for (let n = 6; n >= 0; n--) {
    const r = recordSet(p, makeSet({ finishedAt: daysAgo(n) }), daysAgo(n));
    p = r.progress;
    earned.push(...r.newBadges);
  }
  assert.ok(earned.includes('streak-3'));
  assert.ok(earned.includes('streak-7'));
  assert.ok(!earned.includes('streak-30'));
});

test('Century needs 100 questions right first time', () => {
  let p = emptyProgress();
  for (let i = 0; i < 11; i++) p = recordSet(p, makeSet({ score: 9.5, firstTimeRight: 9 })).progress;
  assert.ok(!p.badges.some((b) => b.id === 'century'));
  const r = recordSet(p, makeSet({ score: 1, firstTimeRight: 1 }));
  assert.deepEqual(r.newBadges, ['century']);
});

test('a backup round-trips and junk is refused', () => {
  const p = recordSet(emptyProgress(), makeSet({ score: 10 })).progress;
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(p))), p);
  assert.throws(() => validateProgress(null));
  assert.throws(() => validateProgress({ version: 2 }));
  assert.throws(() => validateProgress({ ...p, unlockedLevel: 9 }));
  assert.throws(() => validateProgress({ ...p, sets: [{ id: 'x' }] }));
  const withUnknownBadge = { ...p, badges: [...p.badges, { id: 'made-up', earnedAt: new Date().toISOString() }] };
  assert.equal(validateProgress(withUnknownBadge).badges.length, p.badges.length);
});

test('durations show as m:ss', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(65.7), '1:05');
  assert.equal(formatDuration(3600), '60:00');
});
