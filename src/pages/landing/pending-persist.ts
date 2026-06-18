import type { WriteResult } from "@/hooks/use-item-writes";

export type TrackedWriteRunner = (requestInit?: RequestInit) => Promise<WriteResult>;

export interface TrackedWriteEntry {
  promise: Promise<WriteResult>;
  run: TrackedWriteRunner;
  activeController: AbortController | null;
  version: number;
}

function runTrackedWrite(
  entry: TrackedWriteEntry,
  run: TrackedWriteRunner,
  requestInit?: RequestInit
): Promise<WriteResult> {
  const controller = new AbortController();
  entry.activeController = controller;

  const nextRequestInit = requestInit?.signal
    ? requestInit
    : { ...requestInit, signal: controller.signal };

  return Promise.resolve()
    .then(() => run(nextRequestInit))
    .finally(() => {
      if (entry.activeController === controller) {
        entry.activeController = null;
      }
    });
}

export function enqueueTrackedWrite(
  pendingWrites: Map<string, TrackedWriteEntry>,
  key: string,
  run: TrackedWriteRunner
): Promise<WriteResult> {
  const existingEntry = pendingWrites.get(key);

  if (!existingEntry) {
    const entry: TrackedWriteEntry = {
      promise: Promise.resolve({ ok: true }),
      run,
      activeController: null,
      version: 1,
    };
    const nextPromise = runTrackedWrite(entry, run);

    entry.promise = nextPromise;
    pendingWrites.set(key, entry);

    void nextPromise.finally(() => {
      if (pendingWrites.get(key)?.promise === nextPromise) {
        pendingWrites.delete(key);
      }
    });

    return nextPromise;
  }

  existingEntry.run = run;
  const version = existingEntry.version + 1;
  existingEntry.version = version;

  const nextPromise = existingEntry.promise.then(() => {
    if (existingEntry.version !== version) {
      return { ok: true } satisfies WriteResult;
    }

    return runTrackedWrite(existingEntry, run);
  });

  existingEntry.promise = nextPromise;

  void nextPromise.finally(() => {
    if (pendingWrites.get(key)?.promise === nextPromise) {
      pendingWrites.delete(key);
    }
  });

  return nextPromise;
}

export function drainTrackedWritesBestEffort(
  pendingWrites: Map<string, TrackedWriteEntry>,
  requestInit?: RequestInit
): void {
  for (const [key, entry] of Array.from(pendingWrites.entries())) {
    entry.activeController?.abort();
    const version = entry.version + 1;
    entry.version = version;

    const nextPromise = Promise.resolve().then(() => {
      if (entry.version !== version) {
        return { ok: true } satisfies WriteResult;
      }

      return runTrackedWrite(entry, entry.run, requestInit);
    });

    entry.promise = nextPromise;

    void nextPromise.finally(() => {
      if (pendingWrites.get(key)?.promise === nextPromise) {
        pendingWrites.delete(key);
      }
    });
  }
}

export async function flushTrackedWrites(
  pendingWrites: Map<string, TrackedWriteEntry>
): Promise<WriteResult[]> {
  const failures: WriteResult[] = [];

  while (pendingWrites.size > 0) {
    const snapshot = Array.from(new Set(Array.from(pendingWrites.values(), (entry) => entry.promise)));
    const results = await Promise.all(snapshot);
    failures.push(...results.filter((result) => !result.ok));
  }

  return failures;
}
