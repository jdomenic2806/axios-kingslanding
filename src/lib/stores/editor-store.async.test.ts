import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-section-products", () => ({
  loadSectionProducts: vi.fn(),
}));

import { useEditorStore } from "./editor-store";
import { loadSectionProducts } from "@/hooks/use-section-products";

const mockedLoadSectionProducts = vi.mocked(loadSectionProducts);

describe("EditorStore async section loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
  });

  it("ignores stale section responses when switching sections quickly", async () => {
    mockedLoadSectionProducts.mockImplementation(async (sectionId: string) => {
      if (sectionId === "activacion") {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          products: [{
            id: "act-api",
            offeringId: "1",
            nombre: "ACTIVACION API",
            grupo: "ACTIVACION",
            monto: 100,
            dias: 15,
            mb: 1024,
            mbAnterior: null,
            llamadas: 0,
            sms: 0,
            hotspot: false,
            redesSociales: false,
            observacion: "act",
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
          }],
          isFromApi: true,
          error: null,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 1));
      return {
        products: [{
          id: "port-api",
          offeringId: "2",
          nombre: "PORTABILIDAD API",
          grupo: "PORTABILIDAD",
          monto: 200,
          dias: 30,
          mb: 2048,
          mbAnterior: null,
          llamadas: 0,
          sms: 0,
          hotspot: false,
          redesSociales: false,
          observacion: "port",
          producto: "MOV",
          visualConfig: {
            template: "default",
            badgeText: "",
            badgeStyle: "none",
            badgeFlag: "red",
            primaryColor: "#333333",
            secondaryColor: "#444444",
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
        }],
        isFromApi: true,
        error: null,
      };
    });

    const first = useEditorStore.getState().loadSection("activacion");
    const second = useEditorStore.getState().loadSection("portabilidad");

    await Promise.all([first, second]);

    const state = useEditorStore.getState();
    expect(state.selectedSectionId).toBe("portabilidad");
    expect(state.products).toHaveLength(1);
    expect(state.products[0].nombre).toBe("PORTABILIDAD API");
    expect(state.sectionDataSource).toBe("api");
    expect(state.isLoadingSection).toBe(false);
  });
});
