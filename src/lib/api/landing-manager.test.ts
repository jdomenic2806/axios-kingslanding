import { afterEach, describe, expect, it, vi } from "vitest";

describe("landing-manager config guard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses same-origin API paths when VITE_API_URL is empty", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchSections } = await import("./landing-manager");

    await expect(fetchSections()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/v1/landing-manager/sections", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("tolerates 204 responses in PATCH writes", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { patchItemStatus } = await import("./landing-manager");

    await expect(patchItemStatus("cliente-nuevo", "123", false)).resolves.toBeUndefined();
  });

  it("forwards custom fetch init when patching item edits", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ itemId: "123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { patchItem } = await import("./landing-manager");

    await patchItem("cliente-nuevo", "123", { title: "Nuevo título" }, { keepalive: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/landing-manager/sections/cliente-nuevo/items/123",
      expect.objectContaining({
        method: "PATCH",
        keepalive: true,
      })
    );
  });

  it("forwards custom fetch init when patching status and reorder", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { patchItemStatus, patchItemsReorder } = await import("./landing-manager");

    await patchItemStatus("cliente-nuevo", "123", false, { keepalive: true });
    await patchItemsReorder("cliente-nuevo", [{ itemId: "123", order: 1 }], { keepalive: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/v1/landing-manager/sections/cliente-nuevo/items/123/status",
      expect.objectContaining({ method: "PATCH", keepalive: true })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/v1/landing-manager/sections/cliente-nuevo/items/reorder",
      expect.objectContaining({ method: "PATCH", keepalive: true })
    );
  });

  it("uses PATCH for advertising full image uploads", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ _id: "ad-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { uploadAdvertisingImage } = await import("./landing-manager");

    await uploadAdvertisingImage("ad-1", new File(["img"], "full.png", { type: "image/png" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/landing-manager/advertising/ad-1/image",
      expect.objectContaining({
        method: "PATCH",
        body: expect.any(FormData),
      })
    );
  });
});
