/**
 * lib/schemas/landing.ts
 *
 * Shared Zod schemas for the commercial landing manager.
 * Used by both client (form validation) and server (route handlers).
 *
 * Simulated Scope v2 (NEW at top):
 *   VisibilityRule, VisualPresetId, DeviceImageRef — used by editor-store
 *
 * Legacy schemas (Phases 1–4 backend stubs) kept below for contract preservation.
 * They are used by the stub API handlers in app/api/landing/* only.
 * They are NOT on the critical path for the simulated scope.
 */

import { z } from "zod";

// ─── Simulated Scope v2 — Core Editor Types ──────────────────────────────────

/**
 * VisibilityRule: per-card visibility evaluated at render time.
 * No server-side cron is required — the renderer filters at render.
 */
export const VisibilityRuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("always") }),
  z.object({ kind: z.literal("hidden") }),
  z.object({
    kind: z.literal("window"),
    /** ISO-8601 datetime — start of visibility window (optional) */
    from: z.string().datetime().optional(),
    /** ISO-8601 datetime — end of visibility window (optional) */
    to: z.string().datetime().optional(),
  }),
]);
export type VisibilityRule = z.infer<typeof VisibilityRuleSchema>;

/**
 * VisualPresetId: closed catalog of visual treatments for a card.
 * Presets affect ONLY layout/style — never commercial data (price, copy).
 */
export const VisualPresetIdSchema = z.enum([
  "default",
  "highlight-blue",
  "compact",
  "feature",
]);
export type VisualPresetId = z.infer<typeof VisualPresetIdSchema>;

/**
 * DeviceImageRef: reference to a device image in the store.
 * Curated images come from lib/device-gallery.ts (Phase 3).
 * Local uploads use Object URLs (no S3).
 */
export const DeviceImageRefSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("curated"),
    /** ID from lib/device-gallery.ts curated catalog */
    id: z.string().min(1),
  }),
  z.object({
    kind: z.literal("local"),
    /** URL.createObjectURL() result — session-scoped */
    objectUrl: z.string().min(1),
    name: z.string().min(1),
    /** File size in bytes — validated ≤ 5 MB client-side */
    size: z.number().int().positive(),
  }),
]);
export type DeviceImageRef = z.infer<typeof DeviceImageRefSchema>;

/**
 * Evaluate whether a VisibilityRule is active at a given time.
 *
 * @param rule   the card's visibility rule
 * @param now    the reference time (default: Date.now())
 * @returns      true if the card should be rendered
 */
export function evaluateVisibility(
  rule: VisibilityRule,
  now: number = Date.now()
): boolean {
  if (rule.kind === "always") return true;
  if (rule.kind === "hidden") return false;
  // window: must satisfy from <= now <= to (open-ended edges are inclusive)
  const from = rule.from ? new Date(rule.from).getTime() : -Infinity;
  const to = rule.to ? new Date(rule.to).getTime() : Infinity;
  return now >= from && now <= to;
}

// ─── Simulated Scope v2 — Card Validations ───────────────────────────────────

/**
 * validateCard: client-side validation matching spec rules.
 * Returns { blocking, warnings } — same shape as server-side runDraftValidations.
 */
export interface CardValidationResult {
  blocking: { field: string; rule: string; message: string }[];
  warnings: { field: string; rule: string; message: string }[];
}

export function validateCard(
  card: { monto?: number; title?: string; copy?: string; visibility?: VisibilityRule },
  trigger: "save" | "publish"
): CardValidationResult {
  const blocking: CardValidationResult["blocking"] = [];
  const warnings: CardValidationResult["warnings"] = [];

  // Rule 1: price non-negative
  if (typeof card.monto === "number" && card.monto < 0) {
    blocking.push({
      field: "monto",
      rule: "price_non_negative",
      message: "El precio no puede ser negativo.",
    });
  }

  // Rule 2: visibility window to > from (if both set)
  if (card.visibility?.kind === "window") {
    const { from, to } = card.visibility;
    if (from && to) {
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      if (toMs <= fromMs) {
        blocking.push({
          field: "visibility.to",
          rule: "visibility_window_valid",
          message: "La fecha de fin de visibilidad debe ser posterior a la de inicio.",
        });
      }
    }
  }

  // Rule 3: required copy fields
  // - title is always required (save + publish)
  // - copy (observacion) is only required on publish, not on save
  //   Rationale: users often add images / reorder cards before filling copy.
  //   Blocking save on empty copy was causing false errors during normal editing.
  if (!card.title || card.title.trim() === "") {
    blocking.push({
      field: "title",
      rule: "required_copy_title",
      message: "El título de la card es obligatorio.",
    });
  }
  if (trigger === "publish" && (!card.copy || card.copy.trim() === "")) {
    blocking.push({
      field: "copy",
      rule: "required_copy_copy",
      message: "El texto de la card es obligatorio para publicar.",
    });
  }

  // Note: alt-text rule removed — no alt text editor exists in the UI,
  // so unconditional warnings on every publish were noise.

  return { blocking, warnings };
}

// ─── Legacy: Target ───────────────────────────────────────────────────────────

export const TargetKindSchema = z.enum(["card", "section", "device_block"]);
export type TargetKind = z.infer<typeof TargetKindSchema>;

export const TargetSchema = z.object({
  kind: TargetKindSchema,
  id: z.string().min(1, "Target id is required"),
});
export type Target = z.infer<typeof TargetSchema>;

// ─── Legacy: Draft ────────────────────────────────────────────────────────────

export const DraftSchema = z.object({
  id: z.string().uuid(),
  target: TargetSchema,
  /** Arbitrary JSON content — the editor stores its full product/section state here */
  content: z.unknown(),
  /** Optimistic concurrency version — incremented on each save */
  version: z.number().int().positive(),
  authorId: z.string().min(1),
  updatedAt: z.string().datetime(),
});
export type Draft = z.infer<typeof DraftSchema>;

/** Payload accepted by POST /api/landing/drafts */
export const CreateDraftSchema = z.object({
  target: TargetSchema,
  content: z.unknown(),
  authorId: z.string().min(1),
});
export type CreateDraftInput = z.infer<typeof CreateDraftSchema>;

/** Payload accepted by PUT /api/landing/drafts */
export const UpdateDraftSchema = z.object({
  target: TargetSchema,
  content: z.unknown(),
  authorId: z.string().min(1),
  /**
   * Client must send the version it last read.
   * If it doesn't match the DB version, the server returns 409.
   */
  version: z.number().int().positive(),
});
export type UpdateDraftInput = z.infer<typeof UpdateDraftSchema>;

// ─── Legacy: Snapshot ─────────────────────────────────────────────────────────

export const SnapshotSchema = z.object({
  id: z.string().uuid(),
  target: TargetSchema,
  content: z.unknown(),
  publishedAt: z.string().datetime(),
  publishedBy: z.string().min(1),
  diffSummary: z.string(),
  parentSnapshotId: z.string().uuid().nullable(),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

/** Payload accepted by POST /api/landing/publish */
export const PublishDraftSchema = z.object({
  target: TargetSchema,
  publishedBy: z.string().min(1),
  /** Optional human-readable summary of what changed */
  diffSummary: z.string().optional().default(""),
});
export type PublishDraftInput = z.infer<typeof PublishDraftSchema>;

// ─── Legacy: Audit ────────────────────────────────────────────────────────────

export const AuditActionSchema = z.enum([
  "publish",
  "rollback",
  "schedule",
  "cancel",
  "draft_save",
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditRecordSchema = z.object({
  id: z.string().uuid(),
  actor: z.string().min(1),
  action: AuditActionSchema,
  target: TargetSchema,
  snapshotId: z.string().uuid().nullable(),
  occurredAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional().default({}),
});
export type AuditRecord = z.infer<typeof AuditRecordSchema>;

// ─── API response envelope ────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ─── Conflict error (409) ─────────────────────────────────────────────────────

export const ConflictErrorSchema = z.object({
  error: z.literal("version_conflict"),
  currentVersion: z.number().int(),
  currentAuthorId: z.string(),
  message: z.string(),
});
export type ConflictError = z.infer<typeof ConflictErrorSchema>;

// ─── Legacy: Preset (Phase 2) ─────────────────────────────────────────────────

/**
 * PresetStylesSchema: visual overrides that a preset can apply to a card.
 * All fields optional so a preset can override only what it cares about.
 */
export const PresetStylesSchema = z.object({
  template: z.enum(["default", "promo", "hotsale", "minimal", "premium", "internet"]).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  badgeText: z.string().optional(),
  badgeStyle: z.enum(["ribbon", "corner", "fire", "promo", "none"]).optional(),
  badgeFlag: z.enum(["red", "orange", "purple", "black"]).optional(),
}).strict();
export type PresetStyles = z.infer<typeof PresetStylesSchema>;

/**
 * PresetCopyTemplateSchema: text fields that a preset can apply to a card.
 */
export const PresetCopyTemplateSchema = z.object({
  buttonText: z.string().optional(),
  observacion: z.string().optional(),
}).strict();
export type PresetCopyTemplate = z.infer<typeof PresetCopyTemplateSchema>;

export const PresetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Preset name is required"),
  styles: PresetStylesSchema,
  copyTemplate: PresetCopyTemplateSchema,
  version: z.number().int().positive(),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Preset = z.infer<typeof PresetSchema>;

/** Payload accepted by POST /api/landing/presets */
export const CreatePresetSchema = z.object({
  name: z.string().min(1, "Preset name is required"),
  styles: PresetStylesSchema,
  copyTemplate: PresetCopyTemplateSchema,
  createdBy: z.string().min(1),
});
export type CreatePresetInput = z.infer<typeof CreatePresetSchema>;

/** Payload accepted by PUT /api/landing/presets/:id */
export const UpdatePresetSchema = z.object({
  name: z.string().min(1).optional(),
  styles: PresetStylesSchema.optional(),
  copyTemplate: PresetCopyTemplateSchema.optional(),
  updatedBy: z.string().min(1),
});
export type UpdatePresetInput = z.infer<typeof UpdatePresetSchema>;

// ─── Legacy: Commercial Validations (Phase 2) ─────────────────────────────────

/**
 * ValidationLevel:
 *   - "blocking": prevents save/publish from completing
 *   - "warning":  surfaced in the response body but does NOT block the action
 */
export const ValidationLevelSchema = z.enum(["blocking", "warning"]);
export type ValidationLevel = z.infer<typeof ValidationLevelSchema>;

export const ValidationViolationSchema = z.object({
  field: z.string(),
  rule: z.string(),
  message: z.string(),
  level: ValidationLevelSchema,
});
export type ValidationViolation = z.infer<typeof ValidationViolationSchema>;

/** Shape returned by POST /api/landing/publish when blocking rules fail (422) */
export const ValidationErrorResponseSchema = z.object({
  error: z.literal("validation_failed"),
  violations: z.array(ValidationViolationSchema),
});
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;

/**
 * DraftContentSchema: the structured content object stored inside a Draft.
 *
 * Phase 2 adds commercial validation rules against these fields:
 *  - monto >= 0          (blocking: price non-negative)
 *  - promoEndDate > promoStartDate (blocking: promo dates valid)
 *  - nombre filled       (blocking: required copy field on publish)
 *  - altText present     (warning: image accessibility)
 */
export const DraftContentSchema = z.object({
  /** Required copy fields */
  nombre: z.string().optional(),
  observacion: z.string().optional(),
  /** Price — must be >= 0 */
  monto: z.number().optional(),
  /** Promo dates */
  promoStartDate: z.string().datetime().optional(),
  promoEndDate: z.string().datetime().optional(),
  /** Image alt text — warning if missing */
  imageAltText: z.string().optional(),
}).passthrough(); // allow extra fields from editors

export type DraftContent = z.infer<typeof DraftContentSchema>;

// ─── Legacy: Scheduled Jobs (Phase 3) ────────────────────────────────────────

/**
 * ScheduledJobStatus enum — mirrors the DB ENUM in migration 005.
 *
 *  pending   → awaiting activation
 *  running   → currently executing publish flow
 *  done      → published successfully
 *  failed    → publish failed (see failureReason)
 *  cancelled → cancelled by user before activation
 */
export const ScheduledJobStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
  "cancelled",
]);
export type ScheduledJobStatus = z.infer<typeof ScheduledJobStatusSchema>;

export const ScheduledJobSchema = z.object({
  id: z.string().uuid(),
  /** The draft that will be published when this job fires */
  draftId: z.string().uuid(),
  target: TargetSchema,
  /** ISO-8601 datetime — when the job should fire (UTC) */
  runAt: z.string().datetime(),
  status: ScheduledJobStatusSchema,
  /** Optional human label (e.g. "Summer Sale launch") */
  label: z.string().optional(),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Populated when status === 'failed' */
  failureReason: z.string().optional(),
  /** Snapshot id created on success — for audit traceability */
  snapshotId: z.string().uuid().optional(),
});
export type ScheduledJob = z.infer<typeof ScheduledJobSchema>;

/** Payload accepted by POST /api/landing/schedule */
export const CreateScheduledJobSchema = z.object({
  target: TargetSchema,
  /** ISO-8601 datetime — must be in the future */
  runAt: z.string().datetime(),
  createdBy: z.string().min(1),
  label: z.string().optional(),
});
export type CreateScheduledJobInput = z.infer<typeof CreateScheduledJobSchema>;

/** Response shape for schedule list */
export const ScheduledJobListSchema = z.object({
  jobs: z.array(ScheduledJobSchema),
  total: z.number().int().nonnegative(),
});
export type ScheduledJobList = z.infer<typeof ScheduledJobListSchema>;

// ─── Legacy: Asset Library (Phase 4) ─────────────────────────────────────────

/** Accepted MIME types for image uploads */
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME_TYPES)[number];

/** Max upload size: 5 MB */
export const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024;

export const AssetSchema = z.object({
  id: z.string().uuid(),
  /** S3 object key — format: assets/{project}/{uuid}.{ext} */
  key: z.string().min(1),
  /** Public CDN or presigned URL */
  url: z.string().url(),
  mime: z.enum(ACCEPTED_MIME_TYPES),
  /** File size in bytes */
  size: z.number().int().positive().max(MAX_ASSET_SIZE_BYTES),
  uploaderId: z.string().min(1),
  altText: z.string().optional(),
  tags: z.array(z.string()).default([]),
  uploadedAt: z.string().datetime(),
});
export type Asset = z.infer<typeof AssetSchema>;

/** Payload sent by the client to request a presigned S3 PUT URL */
export const PresignRequestSchema = z.object({
  filename: z.string().min(1),
  mime: z.enum(ACCEPTED_MIME_TYPES, {
    errorMap: () => ({ message: "Tipo de archivo no permitido. Usá JPEG, PNG o WebP." }),
  }),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_ASSET_SIZE_BYTES, "El archivo supera el límite de 5 MB."),
  uploaderId: z.string().min(1),
  altText: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});
export type PresignRequest = z.infer<typeof PresignRequestSchema>;

/** Response from POST /api/landing/assets/presign */
export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string().min(1),
  expiresAt: z.string().datetime(),
});
export type PresignResponse = z.infer<typeof PresignResponseSchema>;

/** Payload sent after the S3 PUT completes to record asset metadata */
export const ConfirmAssetSchema = z.object({
  key: z.string().min(1),
  url: z.string().url(),
  mime: z.enum(ACCEPTED_MIME_TYPES),
  size: z.number().int().positive(),
  uploaderId: z.string().min(1),
  altText: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});
export type ConfirmAssetInput = z.infer<typeof ConfirmAssetSchema>;

// ─── Legacy: Validation rule runner ──────────────────────────────────────────

/**
 * runDraftValidations
 *
 * Evaluates a draft's content against all commercial validation rules.
 * Returns two arrays: blocking violations and warning violations.
 *
 * Rules:
 *  | Rule                           | Level    | Trigger              |
 *  |--------------------------------|----------|----------------------|
 *  | Price non-negative             | blocking | save / publish       |
 *  | Promo dates: end > start       | blocking | publish only         |
 *  | Required copy: nombre filled   | blocking | publish only         |
 *  | Image alt-text present         | warning  | publish only         |
 *
 * @param content   the draft.content object (unknown is safe — we parse it)
 * @param trigger   "save" | "publish" | "schedule"
 */
export function runDraftValidations(
  content: unknown,
  trigger: "save" | "publish" | "schedule"
): { blocking: ValidationViolation[]; warnings: ValidationViolation[] } {
  const parsed = DraftContentSchema.safeParse(content);
  const data = parsed.success ? parsed.data : {};

  const blocking: ValidationViolation[] = [];
  const warnings: ValidationViolation[] = [];

  // Rule 1: price non-negative (blocking — save + publish)
  if (typeof data.monto === "number" && data.monto < 0) {
    blocking.push({
      field: "monto",
      rule: "price_non_negative",
      message: "El precio no puede ser negativo.",
      level: "blocking",
    });
  }

  if (trigger === "publish" || trigger === "schedule") {
    // Rule 2: promo dates: end > start (blocking — publish only)
    if (data.promoStartDate && data.promoEndDate) {
      const start = new Date(data.promoStartDate).getTime();
      const end = new Date(data.promoEndDate).getTime();
      if (end <= start) {
        blocking.push({
          field: "promoEndDate",
          rule: "promo_dates_valid",
          message: "La fecha de fin de promo debe ser posterior a la de inicio.",
          level: "blocking",
        });
      }
    }

    // Rule 3: nombre required (blocking — publish only)
    if (!data.nombre || data.nombre.trim() === "") {
      blocking.push({
        field: "nombre",
        rule: "required_copy_nombre",
        message: "El campo 'nombre' es obligatorio para publicar.",
        level: "blocking",
      });
    }

    // Rule 4 (alt-text warning) removed — no alt text editor in UI.
  }

  return { blocking, warnings };
}
