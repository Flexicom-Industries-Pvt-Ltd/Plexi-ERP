/**
 * In-memory resource lock/mutex to serialize concurrent mutations
 * on identical resources (e.g., auto-saves on the exact same production sheet).
 */

const locks = new Map<string, Promise<any>>();

/**
 * Executes an async task while holding an exclusive lock for the given key.
 * Multiple requests with DIFFERENT keys run immediately in parallel.
 * Multiple requests with the SAME key are serialized safely without database lock contention.
 */
export async function withResourceLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = locks.get(key) || Promise.resolve();

  let releaseLock: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  // Chain behind current lock
  locks.set(
    key,
    currentLock.then(
      () => nextLock,
      () => nextLock
    )
  );

  try {
    await currentLock;
    return await fn();
  } finally {
    releaseLock();
    if (locks.get(key) === nextLock) {
      locks.delete(key);
    }
  }
}
