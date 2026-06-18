/**
 * lib/schemas/visibility.test.ts
 *
 * Unit tests for visibility evaluation and card validation (Phase 2).
 *
 * Covers:
 *  - evaluateVisibility: always / hidden / window (in, out, open-ended)
 *  - validateCard: price non-negative, visibility window to > from, required fields
 *
 * Note: alt-text warning rule was removed from validateCard (no UI for alt text).
 */

import { describe, it, expect } from "vitest";
import { evaluateVisibility, validateCard } from "./landing";

// ─── evaluateVisibility ───────────────────────────────────────────────────────

describe("evaluateVisibility", () => {
  describe("kind: always", () => {
    it("returns true for 'always' rule", () => {
      expect(evaluateVisibility({ kind: "always" })).toBe(true);
    });
  });

  describe("kind: hidden", () => {
    it("returns false for 'hidden' rule", () => {
      expect(evaluateVisibility({ kind: "hidden" })).toBe(false);
    });
  });

  describe("kind: window", () => {
    const PAST = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();   // 1 day ago
    const FUTURE = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day ahead

    it("returns true when now is inside the window [from, to]", () => {
      const rule = { kind: "window" as const, from: PAST, to: FUTURE };
      expect(evaluateVisibility(rule)).toBe(true);
    });

    it("returns false when now is before the window (from is in the future)", () => {
      const rule = {
        kind: "window" as const,
        from: FUTURE,
        to: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2 days ahead
      };
      expect(evaluateVisibility(rule)).toBe(false);
    });

    it("returns false when now is after the window (to is in the past)", () => {
      const rule = {
        kind: "window" as const,
        from: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        to: PAST,
      };
      expect(evaluateVisibility(rule)).toBe(false);
    });

    it("returns true when no 'from' (open start) and to is in the future", () => {
      const rule = { kind: "window" as const, to: FUTURE };
      expect(evaluateVisibility(rule)).toBe(true);
    });

    it("returns false when no 'from' (open start) and to is in the past", () => {
      const rule = { kind: "window" as const, to: PAST };
      expect(evaluateVisibility(rule)).toBe(false);
    });

    it("returns true when no 'to' (open end) and from is in the past", () => {
      const rule = { kind: "window" as const, from: PAST };
      expect(evaluateVisibility(rule)).toBe(true);
    });

    it("returns false when no 'to' (open end) and from is in the future", () => {
      const rule = { kind: "window" as const, from: FUTURE };
      expect(evaluateVisibility(rule)).toBe(false);
    });

    it("returns true for fully open window (no from, no to)", () => {
      const rule = { kind: "window" as const };
      expect(evaluateVisibility(rule)).toBe(true);
    });

    it("accepts a custom 'now' timestamp for testing", () => {
      const fixedNow = new Date("2024-06-15T12:00:00Z").getTime();
      const rule = {
        kind: "window" as const,
        from: "2024-06-01T00:00:00Z",
        to: "2024-07-01T00:00:00Z",
      };
      expect(evaluateVisibility(rule, fixedNow)).toBe(true);
    });

    it("returns false when custom 'now' is before the window", () => {
      const fixedNow = new Date("2024-05-31T23:59:59Z").getTime();
      const rule = {
        kind: "window" as const,
        from: "2024-06-01T00:00:00Z",
        to: "2024-07-01T00:00:00Z",
      };
      expect(evaluateVisibility(rule, fixedNow)).toBe(false);
    });
  });
});

// ─── validateCard ─────────────────────────────────────────────────────────────

describe("validateCard", () => {
  describe("price non-negative (trigger: save)", () => {
    it("blocks when monto is negative", () => {
      const result = validateCard({ monto: -1 }, "save");
      const isBlocked = result.blocking.some((v) => v.rule === "price_non_negative");
      expect(isBlocked).toBe(true);
    });

    it("does not block when monto is 0", () => {
      const result = validateCard({ monto: 0 }, "save");
      const isBlocked = result.blocking.some((v) => v.rule === "price_non_negative");
      expect(isBlocked).toBe(false);
    });

    it("does not block when monto is positive", () => {
      const result = validateCard({ monto: 100 }, "save");
      const isBlocked = result.blocking.some((v) => v.rule === "price_non_negative");
      expect(isBlocked).toBe(false);
    });
  });

  describe("visibility window to > from (trigger: save)", () => {
    it("blocks when to is equal to from", () => {
      const result = validateCard(
        {
          visibility: {
            kind: "window",
            from: "2024-06-01T00:00:00Z",
            to: "2024-06-01T00:00:00Z",
          },
        },
        "save"
      );
      const isBlocked = result.blocking.some((v) => v.rule === "visibility_window_valid");
      expect(isBlocked).toBe(true);
    });

    it("blocks when to is before from", () => {
      const result = validateCard(
        {
          visibility: {
            kind: "window",
            from: "2024-06-10T00:00:00Z",
            to: "2024-06-01T00:00:00Z",
          },
        },
        "save"
      );
      const isBlocked = result.blocking.some((v) => v.rule === "visibility_window_valid");
      expect(isBlocked).toBe(true);
    });

    it("does not block when to is after from", () => {
      const result = validateCard(
        {
          visibility: {
            kind: "window",
            from: "2024-06-01T00:00:00Z",
            to: "2024-06-10T00:00:00Z",
          },
        },
        "save"
      );
      const isBlocked = result.blocking.some((v) => v.rule === "visibility_window_valid");
      expect(isBlocked).toBe(false);
    });

    it("does not block when only 'from' is set (no 'to')", () => {
      const result = validateCard(
        { visibility: { kind: "window", from: "2024-06-01T00:00:00Z" } },
        "save"
      );
      const isBlocked = result.blocking.some((v) => v.rule === "visibility_window_valid");
      expect(isBlocked).toBe(false);
    });

    it("does not block for 'always' visibility", () => {
      const result = validateCard(
        { visibility: { kind: "always" } },
        "save"
      );
      const isBlocked = result.blocking.some((v) => v.rule === "visibility_window_valid");
      expect(isBlocked).toBe(false);
    });
  });

  describe("required copy fields (trigger: save AND publish — spec: blocking on save)", () => {
    it("blocks on empty title when trigger is 'save'", () => {
      // Spec: Required copy fields filled → Blocking → Save
      const result = validateCard({ title: "" }, "save");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_title");
      expect(isBlocked).toBe(true);
    });

    it("blocks on empty title when trigger is 'publish'", () => {
      const result = validateCard({ title: "" }, "publish");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_title");
      expect(isBlocked).toBe(true);
    });

    it("blocks on whitespace-only title when trigger is 'save'", () => {
      const result = validateCard({ title: "   " }, "save");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_title");
      expect(isBlocked).toBe(true);
    });

    it("blocks on whitespace-only title when trigger is 'publish'", () => {
      const result = validateCard({ title: "   " }, "publish");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_title");
      expect(isBlocked).toBe(true);
    });

    it("does not block when title is filled on save", () => {
      const result = validateCard({ title: "Mi Plan 10GB" }, "save");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_title");
      expect(isBlocked).toBe(false);
    });

    it("does not block when title is filled on publish", () => {
      const result = validateCard({ title: "Mi Plan 10GB" }, "publish");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_title");
      expect(isBlocked).toBe(false);
    });

    it("does NOT block on empty copy when trigger is 'save' (copy only required on publish)", () => {
      // Intentional behavior: saving a card mid-edit (e.g. after adding an image)
      // should not be blocked just because the copy text is empty.
      const result = validateCard({ copy: "" }, "save");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_copy");
      expect(isBlocked).toBe(false);
    });

    it("blocks on empty copy when trigger is 'publish'", () => {
      const result = validateCard({ copy: "" }, "publish");
      const isBlocked = result.blocking.some((v) => v.rule === "required_copy_copy");
      expect(isBlocked).toBe(true);
    });
  });

  describe("alt-text rule removed — no warnings ever fire from validateCard", () => {
    it("no warning fires on publish (alt-text rule removed)", () => {
      const result = validateCard({}, "publish");
      const hasWarning = result.warnings.some((v) => v.rule === "image_alt_text_recommended");
      expect(hasWarning).toBe(false);
    });

    it("no warning fires on save (alt-text rule removed)", () => {
      const result = validateCard({}, "save");
      const hasWarning = result.warnings.some((v) => v.rule === "image_alt_text_recommended");
      expect(hasWarning).toBe(false);
    });
  });

  describe("returns empty arrays for a valid complete card", () => {
    it("no violations on save for a valid card", () => {
      const result = validateCard(
        {
          monto: 99,
          title: "Plan básico",
          copy: "El mejor plan para ti",
          visibility: { kind: "always" },
        },
        "save"
      );
      expect(result.blocking).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("no violations on publish for a complete card", () => {
      const result = validateCard(
        {
          monto: 99,
          title: "Plan básico",
          copy: "El mejor plan para ti",
          visibility: { kind: "always" },
        },
        "publish"
      );
      expect(result.blocking).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
