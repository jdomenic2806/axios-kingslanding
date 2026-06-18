import { describe, expect, it, vi } from "vitest";

import {
  drainTrackedWritesBestEffort,
  enqueueTrackedWrite,
  flushTrackedWrites,
  type TrackedWriteEntry,
} from "./pending-persist";

describe("pending-persist", () => {
  it("waits for the latest tracked write on the same key during flush", async () => {
    const pendingWrites = new Map<string, TrackedWriteEntry>();
    const callOrder: string[] = [];

    const firstWrite = enqueueTrackedWrite(pendingWrites, "status:item-1", async () => {
      callOrder.push("first:start");
      await Promise.resolve();
      callOrder.push("first:end");
      return { ok: true };
    });

    const secondWrite = enqueueTrackedWrite(pendingWrites, "status:item-1", async () => {
      callOrder.push("second:start");
      callOrder.push("second:end");
      return { ok: true };
    });

    const failures = await flushTrackedWrites(pendingWrites);

    await Promise.all([firstWrite, secondWrite]);

    expect(failures).toEqual([]);
    expect(callOrder).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    expect(pendingWrites.size).toBe(0);
  });

  it("returns failures from tracked writes", async () => {
    const pendingWrites = new Map<string, TrackedWriteEntry>();
    const error = { ok: false as const, error: "network down" };

    enqueueTrackedWrite(pendingWrites, "reorder:activacion", async () => error);

    await expect(flushTrackedWrites(pendingWrites)).resolves.toEqual([error]);
  });

  it("keeps the in-flight promise result available to concurrent waiters", async () => {
    const pendingWrites = new Map<string, TrackedWriteEntry>();
    const deferred = Promise.withResolvers<{ ok: boolean; error?: string }>();
    const run = vi.fn(() => deferred.promise);

    const first = enqueueTrackedWrite(pendingWrites, "status:item-2", run);
    const second = pendingWrites.get("status:item-2")?.promise;

    deferred.resolve({ ok: true });

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("replays the latest tracked writes with keepalive during best-effort drain", async () => {
    const pendingWrites = new Map<string, TrackedWriteEntry>();
    const deferred = Promise.withResolvers<{ ok: boolean; error?: string }>();
    const replay = vi.fn().mockResolvedValue({ ok: true });

    enqueueTrackedWrite(pendingWrites, "reorder:activacion", () => deferred.promise);
    enqueueTrackedWrite(pendingWrites, "reorder:activacion", replay);

    drainTrackedWritesBestEffort(pendingWrites, { keepalive: true });

    await vi.waitFor(() => {
      expect(replay).toHaveBeenCalledWith(expect.objectContaining({ keepalive: true }));
    });

    deferred.resolve({ ok: true });
    await pendingWrites.get("reorder:activacion")?.promise;
  });

  it("skips superseded queued writes after an immediate keepalive drain", async () => {
    const pendingWrites = new Map<string, TrackedWriteEntry>();
    const firstDeferred = Promise.withResolvers<{ ok: boolean; error?: string }>();
    const callOrder: string[] = [];

    enqueueTrackedWrite(pendingWrites, "status:item-3", async () => {
      callOrder.push("first:start");
      const result = await firstDeferred.promise;
      callOrder.push("first:end");
      return result;
    });

    const secondWrite = vi.fn(async (requestInit?: RequestInit) => {
      callOrder.push(`second:start:${requestInit?.keepalive === true ? "keepalive" : "normal"}`);
      callOrder.push(`second:end:${requestInit?.keepalive === true ? "keepalive" : "normal"}`);
      return { ok: true };
    });

    enqueueTrackedWrite(pendingWrites, "status:item-3", secondWrite);

    drainTrackedWritesBestEffort(pendingWrites, { keepalive: true });

    await vi.waitFor(() => {
      expect(callOrder).toEqual(["first:start", "second:start:keepalive", "second:end:keepalive"]);
    });

    firstDeferred.resolve({ ok: true });
    await firstDeferred.promise;
    await vi.waitFor(() => {
      expect(secondWrite).toHaveBeenCalledTimes(1);
    });
  });

  it("aborts the in-flight request before replaying the latest keepalive write", async () => {
    const pendingWrites = new Map<string, TrackedWriteEntry>();
    const abortSignals: AbortSignal[] = [];
    const firstDeferred = Promise.withResolvers<{ ok: boolean; error?: string }>();

    enqueueTrackedWrite(pendingWrites, "status:item-4", (requestInit) => {
      if (requestInit?.signal) {
        abortSignals.push(requestInit.signal);
      }

      return firstDeferred.promise;
    });

    const replay = vi.fn().mockResolvedValue({ ok: true });
    enqueueTrackedWrite(pendingWrites, "status:item-4", replay);

    await vi.waitFor(() => {
      expect(abortSignals).toHaveLength(1);
    });

    drainTrackedWritesBestEffort(pendingWrites, { keepalive: true });

    expect(abortSignals[0]?.aborted).toBe(true);
    await vi.waitFor(() => {
      expect(replay).toHaveBeenCalledWith(expect.objectContaining({ keepalive: true }));
    });
  });
});
