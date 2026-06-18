/**
 * lib/schemas/landing.test.ts
 *
 * Unit tests for Zod schemas in landing.ts.
 *
 * NOTE: No test runner is installed yet (strict_tdd: false).
 * These tests are written in a vitest-compatible syntax so they run
 * immediately when `pnpm add -D vitest` is added in a later phase.
 *
 * For now, this file serves as living documentation of:
 *  - Valid schema shapes
 *  - Invalid shapes and their expected errors
 *
 * Run when vitest is available: pnpm exec vitest run lib/schemas/landing.test.ts
 */

// @ts-nocheck — vitest is not yet installed; test file excluded from strict type-checking.

import { describe, it, expect } from "vitest";
import {
  TargetSchema,
  DraftSchema,
  CreateDraftSchema,
  UpdateDraftSchema,
  PublishDraftSchema,
  AuditRecordSchema,
  PresetSchema,
  CreatePresetSchema,
  DraftContentSchema,
  runDraftValidations,
} from "./landing";

// ─── Target ───────────────────────────────────────────────────────────────────

describe("TargetSchema", () => {
  it("accepts valid card target", () => {
    const result = TargetSchema.safeParse({ kind: "card", id: "act-1" });
    expect(result.success).toBe(true);
  });

  it("accepts section and device_block kinds", () => {
    expect(TargetSchema.safeParse({ kind: "section", id: "s1" }).success).toBe(true);
    expect(TargetSchema.safeParse({ kind: "device_block", id: "d1" }).success).toBe(true);
  });

  it("rejects unknown kind", () => {
    const result = TargetSchema.safeParse({ kind: "unknown", id: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = TargetSchema.safeParse({ kind: "card", id: "" });
    expect(result.success).toBe(false);
  });
});

// ─── Draft ────────────────────────────────────────────────────────────────────

describe("DraftSchema", () => {
  const validDraft = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    target: { kind: "card", id: "act-1" },
    content: { monto: 100, nombre: "Plan A" },
    version: 1,
    authorId: "user-abc",
    updatedAt: "2026-06-01T10:00:00.000Z",
  };

  it("parses a valid draft", () => {
    const result = DraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it("rejects version 0 (must be positive)", () => {
    const result = DraftSchema.safeParse({ ...validDraft, version: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid uuid", () => {
    const result = DraftSchema.safeParse({ ...validDraft, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

// ─── CreateDraftSchema ────────────────────────────────────────────────────────

describe("CreateDraftSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateDraftSchema.safeParse({
      target: { kind: "card", id: "act-1" },
      content: { monto: 100 },
      authorId: "user-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing authorId", () => {
    const result = CreateDraftSchema.safeParse({
      target: { kind: "card", id: "act-1" },
      content: {},
    });
    expect(result.success).toBe(false);
  });
});

// ─── UpdateDraftSchema ────────────────────────────────────────────────────────

describe("UpdateDraftSchema", () => {
  it("accepts valid update input", () => {
    const result = UpdateDraftSchema.safeParse({
      target: { kind: "card", id: "act-1" },
      content: { monto: 150 },
      authorId: "user-1",
      version: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects version 0", () => {
    const result = UpdateDraftSchema.safeParse({
      target: { kind: "card", id: "act-1" },
      content: {},
      authorId: "user-1",
      version: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ─── PublishDraftSchema ───────────────────────────────────────────────────────

describe("PublishDraftSchema", () => {
  it("accepts valid publish input", () => {
    const result = PublishDraftSchema.safeParse({
      target: { kind: "card", id: "act-1" },
      publishedBy: "user-1",
    });
    expect(result.success).toBe(true);
    // diffSummary should default to ""
    if (result.success) {
      expect(result.data.diffSummary).toBe("");
    }
  });

  it("rejects empty publishedBy", () => {
    const result = PublishDraftSchema.safeParse({
      target: { kind: "card", id: "act-1" },
      publishedBy: "",
    });
    expect(result.success).toBe(false);
  });
});

// ─── AuditRecordSchema ────────────────────────────────────────────────────────

describe("AuditRecordSchema", () => {
  const validRecord = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    actor: "user-1",
    action: "publish",
    target: { kind: "card", id: "act-1" },
    snapshotId: "550e8400-e29b-41d4-a716-446655440002",
    occurredAt: "2026-06-01T10:00:00.000Z",
  };

  it("parses valid audit record", () => {
    const result = AuditRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it("accepts null snapshotId", () => {
    const result = AuditRecordSchema.safeParse({ ...validRecord, snapshotId: null });
    expect(result.success).toBe(true);
  });

  it("rejects unknown action", () => {
    const result = AuditRecordSchema.safeParse({ ...validRecord, action: "delete" });
    expect(result.success).toBe(false);
  });
});

// ─── Phase 2: DraftContentSchema ─────────────────────────────────────────────

describe("DraftContentSchema (Phase 2)", () => {
  it("accepts a valid content object with known fields", () => {
    const result = DraftContentSchema.safeParse({
      nombre: "Plan Promo",
      monto: 199,
      observacion: "Incluye datos",
      imageAltText: "Imagen promo verano",
    });
    expect(result.success).toBe(true);
  });

  it("accepts unknown extra fields (passthrough)", () => {
    const result = DraftContentSchema.safeParse({
      nombre: "Plan A",
      customField: "extra",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(DraftContentSchema.safeParse({}).success).toBe(true);
  });
});

// ─── Phase 2: runDraftValidations ─────────────────────────────────────────────

describe("runDraftValidations (Phase 2)", () => {
  // ── Blocking: price non-negative ────────────────────────────────────────────

  it("blocks when monto is negative (save trigger)", () => {
    const { blocking, warnings } = runDraftValidations({ monto: -1 }, "save");
    expect(blocking).toHaveLength(1);
    expect(blocking[0].rule).toBe("price_non_negative");
    expect(warnings).toHaveLength(0);
  });

  it("passes when monto is 0 (free plan)", () => {
    const { blocking } = runDraftValidations({ monto: 0, nombre: "Free" }, "save");
    expect(blocking).toHaveLength(0);
  });

  it("passes when monto is positive", () => {
    const { blocking } = runDraftValidations({ monto: 100, nombre: "Plan" }, "save");
    expect(blocking).toHaveLength(0);
  });

  // ── Blocking: promo dates (publish only) ────────────────────────────────────

  it("blocks publish when promoEndDate <= promoStartDate", () => {
    const { blocking } = runDraftValidations(
      {
        nombre: "Promo",
        promoStartDate: "2026-07-10T00:00:00.000Z",
        promoEndDate: "2026-07-09T00:00:00.000Z",
      },
      "publish"
    );
    expect(blocking.some((v) => v.rule === "promo_dates_valid")).toBe(true);
  });

  it("passes when promoEndDate > promoStartDate", () => {
    const { blocking } = runDraftValidations(
      {
        nombre: "Promo",
        promoStartDate: "2026-07-01T00:00:00.000Z",
        promoEndDate: "2026-07-15T00:00:00.000Z",
        imageAltText: "alt",
      },
      "publish"
    );
    expect(blocking.filter((v) => v.rule === "promo_dates_valid")).toHaveLength(0);
  });

  it("does NOT check promo dates on save trigger", () => {
    const { blocking } = runDraftValidations(
      {
        promoStartDate: "2026-07-10T00:00:00.000Z",
        promoEndDate: "2026-07-09T00:00:00.000Z",
      },
      "save"
    );
    // Only price rule may fire; promo dates are publish-only
    expect(blocking.filter((v) => v.rule === "promo_dates_valid")).toHaveLength(0);
  });

  // ── Blocking: required copy (publish only) ──────────────────────────────────

  it("blocks publish when nombre is missing", () => {
    const { blocking } = runDraftValidations({ monto: 100 }, "publish");
    expect(blocking.some((v) => v.rule === "required_copy_nombre")).toBe(true);
  });

  it("blocks publish when nombre is empty string", () => {
    const { blocking } = runDraftValidations({ nombre: "   " }, "publish");
    // trim() → empty
    expect(blocking.some((v) => v.rule === "required_copy_nombre")).toBe(true);
  });

  it("does NOT block publish when nombre is filled", () => {
    const { blocking } = runDraftValidations(
      { nombre: "Plan Verano", imageAltText: "alt" },
      "publish"
    );
    expect(blocking.filter((v) => v.rule === "required_copy_nombre")).toHaveLength(0);
  });

  it("does NOT check nombre on save trigger", () => {
    const { blocking } = runDraftValidations({}, "save");
    expect(blocking.filter((v) => v.rule === "required_copy_nombre")).toHaveLength(0);
  });

  // ── Note: alt-text warning rule removed ────────────────────────────────────
  // The image_alt_text_recommended warning was removed from runDraftValidations
  // because there is no alt text input in the UI, making the warning unconditional
  // noise on every publish. No tests needed for a removed rule.

  it("no alt-text warning fires on publish (rule removed)", () => {
    const { warnings } = runDraftValidations({ nombre: "Plan A" }, "publish");
    expect(warnings.filter((v) => v.rule === "image_alt_text_recommended")).toHaveLength(0);
  });

  it("no warnings fire on save", () => {
    const { blocking, warnings } = runDraftValidations({}, "save");
    expect(warnings).toHaveLength(0);
    expect(blocking).toHaveLength(0);
  });
});

// ─── Phase 2: PresetSchema ────────────────────────────────────────────────────

describe("PresetSchema (Phase 2)", () => {
  const validPreset = {
    id: "550e8400-e29b-41d4-a716-446655440010",
    name: "Summer Sale",
    styles: {
      template: "promo",
      primaryColor: "#ff6b00",
      badgeText: "¡Oferta!",
      badgeStyle: "ribbon",
    },
    copyTemplate: {
      buttonText: "¡Lo quiero ya!",
    },
    version: 1,
    createdBy: "user-1",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  };

  it("parses a valid preset", () => {
    expect(PresetSchema.safeParse(validPreset).success).toBe(true);
  });

  it("accepts preset with empty styles and copyTemplate", () => {
    const result = PresetSchema.safeParse({
      ...validPreset,
      styles: {},
      copyTemplate: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown style fields (strict)", () => {
    const result = PresetSchema.safeParse({
      ...validPreset,
      styles: { unknownField: "value" },
    });
    expect(result.success).toBe(false);
  });
});

describe("CreatePresetSchema (Phase 2)", () => {
  it("accepts valid create preset input", () => {
    const result = CreatePresetSchema.safeParse({
      name: "Hot Sale",
      styles: { primaryColor: "#e00" },
      copyTemplate: { buttonText: "Comprar" },
      createdBy: "user-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty preset name", () => {
    const result = CreatePresetSchema.safeParse({
      name: "",
      styles: {},
      copyTemplate: {},
      createdBy: "user-1",
    });
    expect(result.success).toBe(false);
  });
});
