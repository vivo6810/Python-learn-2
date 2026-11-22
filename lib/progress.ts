export type Progress = {
  /** Lesson keys, `track/slug`, in the order they were first opened. */
  read: string[];
  /** The most recently opened lesson key. */
  last: string | null;
};

export const EMPTY_PROGRESS: Progress = { read: [], last: null };

const READ_KEY = "pyflow:read";
const LAST_KEY = "pyflow:last";
const EVENT = "pyflow:progress";

export function lessonKey(track: string, slug: string): string {
  return `${track}/${slug}`;
}

export function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const read = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
    const last = localStorage.getItem(LAST_KEY);
    return { read, last };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function markRead(key: string): void {
  try {
    const { read } = readProgress();
    if (read.includes(key) && localStorage.getItem(LAST_KEY) === key) return;

    const next = read.includes(key) ? read : [...read, key];
    localStorage.setItem(READ_KEY, JSON.stringify(next));
    localStorage.setItem(LAST_KEY, key);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage can be full or blocked; reading the course still works.
  }
}

// Cached snapshot for useSyncExternalStore: must return a stable reference
// between invalidations, so reading localStorage on every call is not OK.
let snapshot: Progress | null = null;

export function subscribeProgress(listener: () => void): () => void {
  const notify = () => {
    // The snapshot cache must not outlive the event that invalidates it.
    snapshot = null;
    listener();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === READ_KEY || event.key === LAST_KEY) notify();
  };

  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
}

export function getProgressSnapshot(): Progress {
  if (snapshot === null) snapshot = readProgress();
  return snapshot;
}

export function getProgressServerSnapshot(): Progress {
  return EMPTY_PROGRESS;
}
