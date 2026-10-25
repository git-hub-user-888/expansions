import { emptyProgress, validateProgress, dayKey } from './progress.js';

const KEY = 'expansions.progress';

export function loadProgress() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    return raw ? validateProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    // Keep unreadable data aside rather than overwrite it on the next save.
    try { if (raw) localStorage.setItem(`${KEY}.unreadable-${Date.now()}`, raw); } catch { /* storage unavailable */ }
    return emptyProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

// Asks the browser not to clear this app's storage under pressure.
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

// Opens the share sheet (Save to Files → iCloud Drive), or downloads where sharing files isn't supported.
// Returns 'shared', 'downloaded' or 'cancelled'.
export async function shareBackup(progress, now = new Date()) {
  const name = `expansions-backup-${dayKey(now)}.json`;
  const file = new File([JSON.stringify(progress, null, 2)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Expansions backup' });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      throw e;
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

export async function readBackupFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('This file is not an Expansions backup.');
  }
  return validateProgress(data);
}
