import { describe, expect, it } from "vitest";

import { getProductsBySection, internetDeviceInfoDefaults } from "@/lib/mock-data";

import {
  hasTransientAssetUrls,
  sanitizeDeviceTransientAssets,
  sanitizeProductTransientAssets,
} from "./transient-assets";

describe("transient-assets", () => {
  it("strips blob-backed product assets before persistence", () => {
    const [product] = getProductsBySection("activacion");

    const sanitized = sanitizeProductTransientAssets({
      ...product,
      visualConfig: {
        ...product.visualConfig,
        badgeFlag: "blob:badge-preview",
        cardBackgroundImageSrc: "blob:bg-preview",
        socialNetworks: product.visualConfig.socialNetworks.map((social, index) => (
          index === 0 ? { ...social, customIcon: "blob:social-preview" } : social
        )),
      },
    });

    expect(sanitized.visualConfig.badgeFlag).toBe("red");
    expect(sanitized.visualConfig.cardBackgroundImageSrc).toBeUndefined();
    expect(sanitized.visualConfig.socialNetworks[0]?.customIcon).toBeUndefined();
  });

  it("detects transient product and device asset urls", () => {
    const [product] = getProductsBySection("activacion");
    const device = {
      ...internetDeviceInfoDefaults[0],
      deviceImageSrc: "blob:device-preview",
    };

    expect(hasTransientAssetUrls([
      {
        ...product,
        visualConfig: {
          ...product.visualConfig,
          badgeFlag: "blob:badge-preview",
        },
      },
    ])).toBe(true);

    expect(hasTransientAssetUrls([product], [device])).toBe(false);
    expect(sanitizeDeviceTransientAssets(device).deviceImageSrc).toBe("");
  });

  it("ignores unsupported blob-only assets when deciding final publish blocks", () => {
    const [product] = getProductsBySection("activacion");

    expect(hasTransientAssetUrls([
      {
        ...product,
        visualConfig: {
          ...product.visualConfig,
          extraApps: [{ id: "extra-1", iconSrc: "blob:extra-preview", label: "Extra" }],
        },
      },
    ])).toBe(false);

    expect(hasTransientAssetUrls([
      {
        ...product,
        visualConfig: {
          ...product.visualConfig,
          socialNetworks: product.visualConfig.socialNetworks.map((social, index) => (
            index === 0 ? { ...social, customIcon: "blob:social-preview" } : social
          )),
        },
      },
    ])).toBe(true);
  });
});
