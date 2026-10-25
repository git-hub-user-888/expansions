import { MAX_LEVEL, SET_SIZE } from './generator.js';

export const BADGES = [
  { id: 'first-steps', name: 'First steps', description: 'Finish your first set' },
  { id: 'perfect', name: 'Perfect', description: 'Score 10/10' },
  { id: 'level-2', name: 'Level 2', description: 'Unlock Level 2' },
  { id: 'level-3', name: 'Level 3', description: 'Unlock Level 3' },
  { id: 'streak-3', name: 'On a roll', description: '3-day streak' },
  { id: 'streak-7', name: 'Week strong', description: '7-day streak' },
  { id: 'streak-30', name: 'Unstoppable', description: '30-day streak' },
  { id: 'against-the-clock', name: 'Against the clock', description: 'Timed 10/10' },
  { id: 'century', name: 'Century', description: '100 questions right first time' },
];
const BADGE_IDS = new Set(BADGES.map((b) => b.id));

export function emptyProgress() {
  return { version: 1, unlockedLevel: 1, sets: [], badges: [] };
}

// Local calendar day as YYYY-MM-DD.
export function dayKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Whole-day index that ignores clock changes.
function dayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

export function streaks(sets, now = new Date()) {
  const days = [...new Set(sets.map((s) => dayNumber(new Date(s.finishedAt))))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && d === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  const today = dayNumber(now);
  const last = days.at(-1);
  const current = last === today || last === today - 1 ? run : 0;
  return { current, best };
}

// Fastest timed 10/10 per level, in seconds.
export function personalBests(sets) {
  const bests = {};
  for (const s of sets) {
    if (s.mode !== 'timed' || !s.perfect) continue;
    if (bests[s.level] === undefined || s.durationSeconds < bests[s.level]) bests[s.level] = s.durationSeconds;
  }
  return bests;
}

function earnedBadgeIds(progress, now) {
  const { sets, unlockedLevel } = progress;
  const best = streaks(sets, now).best;
  const firstTimeRight = sets.reduce((n, s) => n + s.firstTimeRight, 0);
  const earned = {
    'first-steps': sets.length >= 1,
    'perfect': sets.some((s) => s.perfect),
    'level-2': unlockedLevel >= 2,
    'level-3': unlockedLevel >= 3,
    'streak-3': best >= 3,
    'streak-7': best >= 7,
    'streak-30': best >= 30,
    'against-the-clock': sets.some((s) => s.mode === 'timed' && s.perfect),
    'century': firstTimeRight >= 100,
  };
  return BADGES.map((b) => b.id).filter((id) => earned[id]);
}

// Adds a finished set. Returns the new progress plus what changed, for the results screen.
export function recordSet(progress, set, now = new Date()) {
  const previousBest = personalBests(progress.sets)[set.level];
  const unlocks = set.mode === 'practice' && set.perfect
    && set.level === progress.unlockedLevel && progress.unlockedLevel < MAX_LEVEL;
  const next = {
    ...progress,
    unlockedLevel: unlocks ? progress.unlockedLevel + 1 : progress.unlockedLevel,
    sets: [...progress.sets, set],
  };
  const had = new Set(progress.badges.map((b) => b.id));
  const newBadges = earnedBadgeIds(next, now).filter((id) => !had.has(id));
  next.badges = [...progress.badges, ...newBadges.map((id) => ({ id, earnedAt: now.toISOString() }))];
  return {
    progress: next,
    unlockedLevel: unlocks ? next.unlockedLevel : null,
    newPersonalBest: set.mode === 'timed' && set.perfect
      && (previousBest === undefined || set.durationSeconds < previousBest),
    newBadges,
  };
}

const isDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

// Checks a loaded or restored file. Throws with a readable message if it isn't valid.
export function validateProgress(data) {
  if (!data || typeof data !== 'object') throw new Error('This file is not an Expansions backup.');
  if (data.version !== 1) throw new Error('This backup is from a version of Expansions this app does not know.');
  if (!Number.isInteger(data.unlockedLevel) || data.unlockedLevel < 1 || data.unlockedLevel > MAX_LEVEL) {
    throw new Error('The backup has an invalid level.');
  }
  if (!Array.isArray(data.sets) || !Array.isArray(data.badges)) throw new Error('The backup is missing its history.');
  const sets = data.sets.map((s) => {
    const ok = s && typeof s.id === 'string' && isDate(s.startedAt) && isDate(s.finishedAt)
      && Number.isInteger(s.level) && s.level >= 1 && s.level <= MAX_LEVEL
      && (s.mode === 'practice' || s.mode === 'timed')
      && isNumber(s.score) && s.score >= 0 && s.score <= SET_SIZE
      && isNumber(s.durationSeconds) && s.durationSeconds >= 0
      && typeof s.perfect === 'boolean'
      && Number.isInteger(s.firstTimeRight) && s.firstTimeRight >= 0 && s.firstTimeRight <= SET_SIZE;
    if (!ok) throw new Error('The backup has a set it cannot read.');
    const { id, startedAt, finishedAt, level, mode, score, durationSeconds, perfect, firstTimeRight } = s;
    return { id, startedAt, finishedAt, level, mode, score, durationSeconds, perfect, firstTimeRight };
  });
  const badges = data.badges
    .filter((b) => b && BADGE_IDS.has(b.id) && isDate(b.earnedAt))
    .map(({ id, earnedAt }) => ({ id, earnedAt }));
  return { version: 1, unlockedLevel: data.unlockedLevel, sets, badges };
}

export function formatDuration(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
