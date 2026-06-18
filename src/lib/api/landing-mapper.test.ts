import { describe, expect, it } from "vitest";
import { buildItemPatchPayload, mapApiSectionFull, mapApiSectionToSection, mergeApiWithMockProducts } from "./landing-mapper";
import type { ApiSection } from "./landing-manager";
import { getProductsBySection } from "@/lib/mock-data";
import type { ApiMappedProduct } from "./landing-mapper";

describe("mapApiSectionToSection", () => {
  it("preserves useful mock metadata when the API omits it", () => {
    const apiSection: ApiSection = {
      key: "cliente-nuevo",
      name: "Cliente Nuevo API",
      order: 1,
      isActive: true,
      sectionStyles: {},
      cardStyles: {},
      imageStyles: {},
    };

    const mapped = mapApiSectionToSection(apiSection);

    expect(mapped.description).toBe("Planes para activacion de linea nueva");
    expect(mapped.productCount).toBe(7);
    expect(mapped.lastPublished).toBe("2026-05-30T14:30:00Z");
  });

  it("exposes cardStyles and backgroundImage from the API section", () => {
    const apiSection: ApiSection = {
      key: "cliente-nuevo",
      name: "Cliente Nuevo API",
      order: 1,
      isActive: true,
      sectionStyles: {},
      cardStyles: {
        primaryColor: "#7432e8",
        secondaryColor: "#411c82",
      },
      imageStyles: {},
      assets: {
        backgroundImage: {
          url: "https://cdn.example.com/background.png",
          alt: "Background",
        },
      },
    };

    const mapped = mapApiSectionToSection(apiSection);

    expect(mapped.cardStyles).toEqual({
      primaryColor: "#7432e8",
      secondaryColor: "#411c82",
    });
    expect(mapped.assets?.backgroundImage?.url).toBe("https://cdn.example.com/background.png");
  });
});

describe("mergeApiWithMockProducts", () => {
  it("uses the API item set as source of truth while enriching matches from mock", () => {
    const mockProducts = getProductsBySection("activacion");
    const apiProducts = [
      {
        ...mockProducts[1],
        id: "api-only-id",
        nombre: "Nombre API",
        observacion: "Descripcion API",
        active: true,
        sortOrder: 99,
        visualConfig: {
          ...mockProducts[1].visualConfig,
          badgeText: "BADGE API",
          badgeFlag: "https://cdn.example.com/badge.png",
          buttonText: "CTA API",
          primaryColor: "#111111",
          secondaryColor: "#222222",
        },
      },
    ];

    const merged = mergeApiWithMockProducts(mockProducts, apiProducts);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(mockProducts[1].id);
    expect(merged[0].monto).toBe(mockProducts[1].monto);
    expect(merged[0].nombre).toBe("Nombre API");
    expect(merged[0].visualConfig.badgeText).toBe("BADGE API");
    expect(merged[0].visualConfig.badgeFlag).toBe("https://cdn.example.com/badge.png");
    expect(merged[0].visualConfig.primaryColor).toBe("#111111");
  });

  it("preserves explicit empty strings from the API", () => {
    const mockProducts = getProductsBySection("activacion");
    const apiProducts = [
      {
        ...mockProducts[0],
        visualConfig: {
          ...mockProducts[0].visualConfig,
          badgeText: "",
          buttonText: "",
        },
        observacion: "",
      },
    ];

    const merged = mergeApiWithMockProducts(mockProducts, apiProducts);

    expect(merged[0].observacion).toBe("");
    expect(merged[0].visualConfig.badgeText).toBe("");
    expect(merged[0].visualConfig.buttonText).toBe("");
  });
});

describe("buildItemPatchPayload", () => {
  it("sends explicit clears for backend-supported text fields", () => {
    const [previousProduct] = getProductsBySection("activacion");
    const updatedProduct = {
      ...previousProduct,
      observacion: "",
      visualConfig: {
        ...previousProduct.visualConfig,
        badgeText: "",
        buttonText: "",
      },
    };

    expect(buildItemPatchPayload(updatedProduct, previousProduct)).toEqual({
      description: "",
      badgeText: "",
      ctaText: "",
    });
  });

  it("does not send color overrides when colors did not change", () => {
    const [previousProduct] = getProductsBySection("activacion");

    expect(buildItemPatchPayload(previousProduct, previousProduct)).toEqual({});
  });

  it("sends planName when it changes", () => {
    const [prev] = getProductsBySection("activacion");
    const next = {
      ...prev,
      visualConfig: { ...prev.visualConfig, planName: "Plan GOL" },
    };

    const payload = buildItemPatchPayload(next, prev);

    expect(payload).toMatchObject({ planName: "Plan GOL" });
  });

  it("sends showPlanName when it changes", () => {
    const [prev] = getProductsBySection("activacion");
    const next = {
      ...prev,
      visualConfig: { ...prev.visualConfig, showPlanName: true },
    };

    const payload = buildItemPatchPayload(next, prev);

    expect(payload).toMatchObject({ showPlanName: true });
  });

  it("sends planName: null when planName is cleared", () => {
    const [prev] = getProductsBySection("activacion");
    const base = {
      ...prev,
      visualConfig: { ...prev.visualConfig, planName: "Plan GOL" },
    };
    const next = {
      ...base,
      visualConfig: { ...base.visualConfig, planName: undefined },
    };

    const payload = buildItemPatchPayload(next, base);

    expect(payload).toMatchObject({ planName: null });
  });

  it("does not send planName / showPlanName when they are unchanged", () => {
    const [prev] = getProductsBySection("activacion");
    const base = {
      ...prev,
      visualConfig: { ...prev.visualConfig, planName: "Plan GOL", showPlanName: true },
    };

    const payload = buildItemPatchPayload(base, base);

    expect(payload).not.toHaveProperty("planName");
    expect(payload).not.toHaveProperty("showPlanName");
  });
});

describe("mergeApiWithMockProducts — telco sentinel (monto=0 is valid, not absent)", () => {
  it("uses API monto=0 and does NOT fall back to mock", () => {
    const mockProducts = getProductsBySection("activacion");
    const apiProduct: ApiMappedProduct = {
      ...mockProducts[0],
      monto: 0,    // 0 is a valid free plan price — NOT a sentinel for "absent"
      dias: 7,
      mb: 512,
      llamadas: 0,
      sms: 0,
    };

    const merged = mergeApiWithMockProducts(mockProducts, [apiProduct]);

    // Should keep API value of 0, NOT fall back to mock value (100)
    expect(merged[0].monto).toBe(0);
    expect(merged[0].dias).toBe(7);
  });

  it("falls back to mock when telco field is undefined (truly absent from backend)", () => {
    const mockProducts = getProductsBySection("activacion");
    const apiProduct: ApiMappedProduct = {
      ...mockProducts[0],
      monto: undefined,   // genuinely absent
      dias: undefined,
      mb: undefined,
      llamadas: undefined,
      sms: undefined,
    };

    const merged = mergeApiWithMockProducts(mockProducts, [apiProduct]);

    // Should fall back to mock value
    expect(merged[0].monto).toBe(mockProducts[0].monto);
    expect(merged[0].dias).toBe(mockProducts[0].dias);
  });

  it("uses API disponible=false when provided", () => {
    const mockProducts = getProductsBySection("activacion");
    const apiProduct: ApiMappedProduct = {
      ...mockProducts[0],
      disponible: false,
    };

    const merged = mergeApiWithMockProducts(mockProducts, [apiProduct]);
    expect(merged[0].disponible).toBe(false);
  });

  it("defaults disponible to true when absent from API", () => {
    const mockProducts = getProductsBySection("activacion");
    const apiProduct: ApiMappedProduct = {
      ...mockProducts[0],
      disponible: undefined,
    };

    const merged = mergeApiWithMockProducts(mockProducts, [apiProduct]);
    expect(merged[0].disponible).toBe(true);
  });
});

describe("mapApiItemToProduct — visualConfig priority", () => {
  it("uses item.visualConfig colors over section.cardStyles", () => {
    const mapped = mapApiSectionFull({
      section: {
        key: "cliente-nuevo",
        name: "Cliente Nuevo",
        order: 1,
        isActive: true,
        sectionStyles: {},
        cardStyles: { primaryColor: "#section-primary" },
        imageStyles: {},
      },
      items: [
        {
          sectionKey: "cliente-nuevo",
          itemType: "offer",
          offeringId: "1",
          title: "Test",
          order: 1,
          isActive: true,
          visualConfig: { primaryColor: "#visualconfig-wins" },
        },
      ],
    });

    expect(mapped.products[0]?.visualConfig.primaryColor).toBe("#visualconfig-wins");
  });

  it("falls back to section.cardStyles when item.visualConfig has no color", () => {
    const mapped = mapApiSectionFull({
      section: {
        key: "cliente-nuevo",
        name: "Cliente Nuevo",
        order: 1,
        isActive: true,
        sectionStyles: {},
        cardStyles: { primaryColor: "#section-color" },
        imageStyles: {},
      },
      items: [
        {
          sectionKey: "cliente-nuevo",
          itemType: "offer",
          offeringId: "1",
          title: "Test",
          order: 1,
          isActive: true,
          // visualConfig present but no colors
          visualConfig: { badgeText: "ONLY BADGE" },
        },
      ],
    });

    expect(mapped.products[0]?.visualConfig.primaryColor).toBe("#section-color");
  });

  it("falls back to createVisualConfig defaults when section colors are absent", () => {
    const mapped = mapApiSectionFull({
      section: {
        key: "cliente-nuevo",
        name: "Cliente Nuevo",
        order: 1,
        isActive: true,
        sectionStyles: {},
        cardStyles: {},
        imageStyles: {},
      },
      items: [
        {
          sectionKey: "cliente-nuevo",
          itemType: "offer",
          offeringId: "1",
          title: "Test",
          order: 1,
          isActive: true,
          // no visualConfig colors, no customCardStyles
        },
      ],
    });

    expect(mapped.products[0]?.visualConfig.primaryColor).toBe("#f97316");
    expect(mapped.products[0]?.visualConfig.secondaryColor).toBe("#ea580c");
  });

  it("reads planName and showPlanName from item.visualConfig", () => {
    const mapped = mapApiSectionFull({
      section: {
        key: "cliente-nuevo",
        name: "Cliente Nuevo",
        order: 1,
        isActive: true,
        sectionStyles: {},
        cardStyles: {},
        imageStyles: {},
      },
      items: [
        {
          sectionKey: "cliente-nuevo",
          itemType: "offer",
          offeringId: "1",
          title: "Test",
          order: 1,
          isActive: true,
          visualConfig: { planName: "Plan GOL", showPlanName: true },
        },
      ],
    });

    expect(mapped.products[0]?.visualConfig.planName).toBe("Plan GOL");
    expect(mapped.products[0]?.visualConfig.showPlanName).toBe(true);
  });
});

describe("social icons fallback from hotspot", () => {
  it("mapApiSectionFull: sets redesSociales=true when hotspot=true and redesSociales is absent", () => {
    const mapped = mapApiSectionFull({
      section: {
        key: "cliente-nuevo",
        name: "Cliente Nuevo",
        order: 1,
        isActive: true,
        sectionStyles: {},
        cardStyles: {},
        imageStyles: {},
      },
      items: [
        {
          sectionKey: "cliente-nuevo",
          itemType: "product",
          offeringId: "1709903032",
          title: "Axios linea nueva",
          order: 1,
          isActive: true,
          monto: 100,
          dias: 30,
          mb: 6144,
          hotspot: true,
          // redesSociales intentionally absent (as backend sends it)
          assets: { socialIcons: [] },
        },
      ],
    });

    expect(mapped.products[0]?.redesSociales).toBe(true);
    // Social networks should use defaults (all enabled) so icons render
    expect(mapped.products[0]?.visualConfig.socialNetworks.filter((s) => s.enabled).length).toBeGreaterThan(0);
  });

  it("mergeApiWithMockProducts: preserves redesSociales=true derived from hotspot through the merge", () => {
    const mockProducts = getProductsBySection("activacion");
    // Simulate backend item with hotspot=true but no explicit redesSociales
    const apiProducts = [
      {
        ...mockProducts[0],
        monto: 100, // apiHasTelco = true
        hotspot: true,
        redesSociales: false, // explicit false (mapper would have resolved it, but test the merge too)
      },
    ];

    const merged = mergeApiWithMockProducts(mockProducts, apiProducts);

    // With hotspot=true, redesSociales should be true even if apiProduct.redesSociales was false
    expect(merged[0]?.redesSociales).toBe(true);
  });
});

describe("mapApiSectionFull", () => {
  it("keeps inactive items available to the editor", () => {
    const fullSection = {
      section: {
        key: "cliente-nuevo",
        name: "Cliente Nuevo",
        order: 1,
        isActive: true,
        sectionStyles: {},
        cardStyles: {},
        imageStyles: {},
      },
      items: [
        {
          sectionKey: "cliente-nuevo",
          itemType: "offer",
          offeringId: "1",
          title: "Activo",
          order: 1,
          isActive: true,
        },
        {
          sectionKey: "cliente-nuevo",
          itemType: "offer",
          offeringId: "2",
          title: "Inactivo",
          order: 2,
          isActive: false,
        },
      ],
    };

    const mapped = mapApiSectionFull(fullSection);

    expect(mapped.products).toHaveLength(2);
    expect(mapped.products[1].active).toBe(false);
  });

  it("rehydrates uploaded badge assets from the backend", () => {
    const mapped = mapApiSectionFull({
      section: {
        key: "cliente-nuevo",
        name: "Cliente Nuevo",
        order: 1,
        isActive: true,
        sectionStyles: {},
        cardStyles: {},
        imageStyles: {},
      },
      items: [
        {
          sectionKey: "cliente-nuevo",
          itemType: "offer",
          offeringId: "1",
          title: "Activo",
          order: 1,
          isActive: true,
          assets: {
            badgeImage: { url: "https://cdn.example.com/badge.png", alt: "Badge" },
          },
        },
      ],
    });

    expect(mapped.products[0]?.visualConfig.badgeFlag).toBe("https://cdn.example.com/badge.png");
  });
});
