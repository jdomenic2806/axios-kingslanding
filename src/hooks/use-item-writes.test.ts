import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/landing-manager", () => ({
  patchItem: vi.fn(),
  patchItemStatus: vi.fn(),
  patchItemsReorder: vi.fn(),
}));

import { persistItemEdit, persistItemReorder, persistItemStatus } from "./use-item-writes";
import { patchItem, patchItemsReorder, patchItemStatus } from "@/lib/api/landing-manager";
import type { Product } from "@/lib/mock-data";

const mockedPatchItem = vi.mocked(patchItem);
const mockedPatchItemStatus = vi.mocked(patchItemStatus);
const mockedPatchItemsReorder = vi.mocked(patchItemsReorder);

const baseProduct: Product = {
  id: "act-1",
  offeringId: "123",
  mongoId: "mongo-abc-123",
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

describe("persistItemEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPatchItem.mockResolvedValue({
      sectionKey: "cliente-nuevo",
      itemType: "plan",
      offeringId: "123",
      title: "Plan 5GB editado",
      order: 1,
      isActive: true,
    });
    mockedPatchItemStatus.mockResolvedValue({
      sectionKey: "cliente-nuevo",
      itemType: "plan",
      offeringId: "123",
      title: "Plan 5GB",
      order: 1,
      isActive: false,
    });
    mockedPatchItemsReorder.mockResolvedValue(undefined);
  });

  it("passes custom request init to patchItem", async () => {
    const updatedProduct: Product = {
      ...baseProduct,
      nombre: "Plan 5GB editado",
    };

    await persistItemEdit("activacion", updatedProduct, baseProduct, {
      requestInit: { keepalive: true },
    });

    expect(mockedPatchItem).toHaveBeenCalledWith(
      "cliente-nuevo",
      "mongo-abc-123",
      expect.objectContaining({ title: "Plan 5GB editado" }),
      expect.objectContaining({ keepalive: true })
    );
  });

  it("uses mongoId as itemId in patchItem when available", async () => {
    const updatedProduct: Product = { ...baseProduct, nombre: "Plan editado" };
    await persistItemEdit("activacion", updatedProduct, baseProduct);
    expect(mockedPatchItem).toHaveBeenCalledWith(
      "cliente-nuevo",
      "mongo-abc-123",
      expect.any(Object),
      undefined
    );
  });

  it("falls back to offeringId when mongoId is absent", async () => {
    const productNoMongo: Product = { ...baseProduct, mongoId: undefined, nombre: "Fallback" };
    await persistItemEdit("activacion", productNoMongo, { ...productNoMongo, nombre: "Old" });
    expect(mockedPatchItem).toHaveBeenCalledWith(
      "cliente-nuevo",
      "123",
      expect.any(Object),
      undefined
    );
  });

  it("includes telco fields in patch payload when changed", async () => {
    const updated: Product = { ...baseProduct, monto: 200, mb: 10240 };
    await persistItemEdit("activacion", updated, baseProduct);
    expect(mockedPatchItem).toHaveBeenCalledWith(
      "cliente-nuevo",
      "mongo-abc-123",
      expect.objectContaining({ monto: 200, mb: 10240 }),
      undefined
    );
  });

  it("does not include unchanged telco fields in patch payload", async () => {
    const updated: Product = { ...baseProduct, nombre: "Nuevo nombre" };
    await persistItemEdit("activacion", updated, baseProduct);
    const callArgs = mockedPatchItem.mock.calls[0][2];
    expect(callArgs).not.toHaveProperty("monto");
    expect(callArgs).not.toHaveProperty("mb");
  });

  it("passes custom request init to patchItemStatus", async () => {
    await persistItemStatus("activacion", { ...baseProduct, active: false }, {
      requestInit: { keepalive: true },
    });

    expect(mockedPatchItemStatus).toHaveBeenCalledWith(
      "cliente-nuevo",
      "mongo-abc-123",
      false,
      expect.objectContaining({ keepalive: true })
    );
  });

  it("uses mongoId as itemId in patchItemStatus when available", async () => {
    await persistItemStatus("activacion", { ...baseProduct, active: false });
    expect(mockedPatchItemStatus).toHaveBeenCalledWith(
      "cliente-nuevo",
      "mongo-abc-123",
      false,
      undefined
    );
  });

  it("passes custom request init to patchItemsReorder", async () => {
    await persistItemReorder("activacion", [baseProduct], {
      requestInit: { keepalive: true },
    });

    expect(mockedPatchItemsReorder).toHaveBeenCalledWith(
      "cliente-nuevo",
      expect.any(Array),
      expect.objectContaining({ keepalive: true })
    );
  });

  it("uses mongoId in reorder payload when available", async () => {
    await persistItemReorder("activacion", [baseProduct]);
    expect(mockedPatchItemsReorder).toHaveBeenCalledWith(
      "cliente-nuevo",
      expect.arrayContaining([expect.objectContaining({ itemId: "mongo-abc-123" })]),
      undefined
    );
  });
});
