import { describe, expect, it } from "vitest";

import type { Product } from "@/lib/mock-data";
import { resolveQueuedItemPersistOutcome, waitForInFlightQueuedItemPersist } from "./queued-item-edit";

const baseProduct: Product = {
  id: "act-1",
  offeringId: "123",
  nombre: "Plan 5GB",
  grupo: "ACTIVACION",
  monto: 100,
  dias: 15,
  mb: 5120,
  mbAnterior: null,
  llamadas: 0,
  sms: 0,
  hotspot: false,
  redesSociales: false,
  observacion: "Descripción inicial",
  producto: "MOV",
  visualConfig: {
    template: "default",
    badgeText: "",
    badgeStyle: "none",
    badgeFlag: "red",
    primaryColor: "#111111",
    secondaryColor: "#222222",
    buttonText: "CTA",
    buttonColor: "#ffffff",
    buttonTextColor: "#000000",
    showHotspot: false,
    hotspotText: "Comparte Datos",
    showPreviousData: false,
    previousDataText: "",
    socialNetworks: [],
    durationDisplayMode: "days",
  },
  sortOrder: 1,
  active: true,
};

describe("resolveQueuedItemPersistOutcome", () => {
  it("returns the settled result for a captured in-flight promise", async () => {
    const deferred = Promise.withResolvers<{ ok: boolean; error?: string }>();

    const resultPromise = waitForInFlightQueuedItemPersist(deferred.promise);

    deferred.resolve({ ok: false, error: "network down" });

    await expect(resultPromise).resolves.toEqual({ ok: false, error: "network down" });
  });

  it("keeps the previous base product when the persist fails", () => {
    const editedProduct: Product = {
      ...baseProduct,
      nombre: "Plan 5GB editado",
    };

    const outcome = resolveQueuedItemPersistOutcome({
      result: { ok: false, error: "network down" },
      baseProduct,
      persistedProduct: editedProduct,
      latestProduct: editedProduct,
    });

    expect(outcome.keepQueued).toBe(true);
    expect(outcome.nextBaseProduct).toBe(baseProduct);
  });

  it("advances the base product only after a successful persist", () => {
    const persistedProduct: Product = {
      ...baseProduct,
      nombre: "Plan 5GB editado",
    };
    const latestProduct: Product = {
      ...persistedProduct,
      observacion: "Descripción nueva",
    };

    const outcome = resolveQueuedItemPersistOutcome({
      result: { ok: true },
      baseProduct,
      persistedProduct,
      latestProduct,
    });

    expect(outcome.keepQueued).toBe(true);
    expect(outcome.nextBaseProduct).toBe(persistedProduct);
  });
});
