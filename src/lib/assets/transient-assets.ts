import type { InternetDeviceInfo, Product } from "@/lib/mock-data";

export function isBlobUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("blob:");
}

function sanitizeSocialNetworks(product: Product): Product["visualConfig"]["socialNetworks"] {
  return product.visualConfig.socialNetworks.map((social) => {
    if (!isBlobUrl(social.customIcon)) {
      return social;
    }

    const { customIcon: _customIcon, ...rest } = social;
    return rest;
  });
}

export function sanitizeProductTransientAssets(product: Product): Product {
  return {
    ...product,
    visualConfig: {
      ...product.visualConfig,
      badgeFlag: isBlobUrl(product.visualConfig.badgeFlag) ? "red" : product.visualConfig.badgeFlag,
      cardBackgroundImageSrc: isBlobUrl(product.visualConfig.cardBackgroundImageSrc)
        ? undefined
        : product.visualConfig.cardBackgroundImageSrc,
      socialNetworks: sanitizeSocialNetworks(product),
      extraApps: product.visualConfig.extraApps?.filter((app) => !isBlobUrl(app.iconSrc)),
    },
  };
}

export function sanitizeDeviceTransientAssets(device: InternetDeviceInfo): InternetDeviceInfo {
  return {
    ...device,
    deviceImageSrc: isBlobUrl(device.deviceImageSrc) ? "" : device.deviceImageSrc,
    cardBackgroundImageSrc: isBlobUrl(device.cardBackgroundImageSrc)
      ? undefined
      : device.cardBackgroundImageSrc,
  };
}

export function hasTransientAssetUrls(products: Product[], deviceBlocks: InternetDeviceInfo[] = []): boolean {
  return products.some((product) => (
    isBlobUrl(product.visualConfig.badgeFlag)
    || isBlobUrl(product.visualConfig.cardBackgroundImageSrc)
    || product.visualConfig.socialNetworks.some((social) => isBlobUrl(social.customIcon))
  )) || deviceBlocks.some((device) => (
    isBlobUrl(device.cardBackgroundImageSrc)
  ));
}
