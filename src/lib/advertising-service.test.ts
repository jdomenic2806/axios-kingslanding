import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdvertising: vi.fn(),
  updateAdvertising: vi.fn(),
  deleteAdvertising: vi.fn(),
  uploadAdvertisingImage: vi.fn(),
  uploadAdvertisingThumbnail: vi.fn(),
  fetchAdvertising: vi.fn(),
}));

vi.mock("@/lib/api/landing-manager", () => ({
  createAdvertising: mocks.createAdvertising,
  updateAdvertising: mocks.updateAdvertising,
  deleteAdvertising: mocks.deleteAdvertising,
  uploadAdvertisingImage: mocks.uploadAdvertisingImage,
  uploadAdvertisingThumbnail: mocks.uploadAdvertisingThumbnail,
  fetchAdvertising: mocks.fetchAdvertising,
}));

import { createAsset, listAssets } from "@/lib/advertising-service";

describe("advertising-service createAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rolls back and rejects when thumbnail upload fails", async () => {
    const thumbnailError = new Error("thumbnail failed");
    mocks.createAdvertising.mockResolvedValue({ _id: "ad-1" });
    mocks.uploadAdvertisingThumbnail.mockRejectedValue(thumbnailError);
    mocks.deleteAdvertising.mockResolvedValue(undefined);

    const input = {
      category: "publicidad" as const,
      title: "Promo",
      description: "Desc",
      thumbnailFile: new File(["thumb"], "thumb.png", { type: "image/png" }),
      fullFile: new File(["full"], "full.png", { type: "image/png" }),
    };

    await expect(createAsset(input)).rejects.toThrow("thumbnail failed");
    expect(mocks.deleteAdvertising).toHaveBeenCalledWith("ad-1");
    expect(mocks.uploadAdvertisingImage).not.toHaveBeenCalled();
  });

  it("rolls back and rejects when full image upload fails", async () => {
    const fullError = new Error("full failed");
    mocks.createAdvertising.mockResolvedValue({ _id: "ad-2" });
    mocks.uploadAdvertisingThumbnail.mockResolvedValue({ _id: "ad-2" });
    mocks.uploadAdvertisingImage.mockRejectedValue(fullError);
    mocks.deleteAdvertising.mockResolvedValue(undefined);

    const input = {
      category: "publicidad" as const,
      title: "Promo",
      description: "Desc",
      thumbnailFile: new File(["thumb"], "thumb.png", { type: "image/png" }),
      fullFile: new File(["full"], "full.png", { type: "image/png" }),
    };

    await expect(createAsset(input)).rejects.toThrow("full failed");
    expect(mocks.deleteAdvertising).toHaveBeenCalledWith("ad-2");
  });

  it("normalizes object responses when advertising list is empty", async () => {
    mocks.fetchAdvertising.mockResolvedValue({ advertising: [] });

    await expect(listAssets()).resolves.toEqual([]);
  });

  it("normalizes paginated docs responses from advertising list", async () => {
    const docs = [{ _id: "ad-1", title: "Promo" }];
    mocks.fetchAdvertising.mockResolvedValue({ docs, totalDocs: 1, page: 1 });

    await expect(listAssets()).resolves.toEqual(docs);
  });
});
