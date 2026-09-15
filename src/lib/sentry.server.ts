// Server-side Sentry capture for Astoria Referrals (edge-compatible).
//
// This module is server-only and must never be imported by client code.
//
// Why not the Sentry Node/TanStack SDK here:
// @sentry/tanstackstart-react resolves to the Node SDK on the server, whose
// transport/queue relies on Node timer APIs (setInterval(...).unref()) that do
// not exist in this Worker-style runtime, so Sentry.init() fails and events are
// never delivered. Instead we POST a minimal Sentry envelope directly with
// fetch — the only primitive guaranteed available in this runtime — and await
// the HTTP result so nothing is dropped when the isolate freezes.
//
// Privacy rules (intentional, do not loosen without review):
// - No Session Replay, no structured logging.
// - No PII: no prospect names, emails, referral notes, request bodies,
//   headers, cookies, webhook URLs, API keys, or email content.
// - The DSN comes from SENTRY_DSN; if unset, capture is a no-op.
// - The DSN value is never logged.

type ParsedDsn = {
  ingestUrl: string;
  publicKey: string;
};

function parseDsn(dsn: string): ParsedDsn | undefined {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return undefined;
    return {
      ingestUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey,
    };
  } catch {
    return undefined;
  }
}

function newEventId(): string {
  // 32 hex chars, no dashes — Sentry event_id format.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function errorShape(error: unknown): { type: string; value: string } {
  if (error instanceof Error) {
    return { type: error.name || "Error", value: error.message || "" };
  }
  return { type: "Error", value: typeof error === "string" ? error : "Unknown server error" };
}

export type CaptureResult = {
  sent: boolean;
  status?: number;
  eventId?: string;
};

/**
 * Safe operational context that may be attached to an error event.
 * Only non-PII operational fields are allowed here.
 */
export type SafeErrorContext = {
  request_id?: string | undefined;
  referral_id?: string | undefined;
  processing_status?: string | undefined;
  http_status?: number | undefined;
  duration_ms?: number | undefined;
  fallback_count?: number | undefined;
  error_type?: string | undefined;
};

/**
 * Capture an unexpected server/upstream failure. Never throws: telemetry
 * problems must not affect the referral API.
 */
export async function captureServerException(
  error: unknown,
  context?: SafeErrorContext
): Promise<string | undefined> {
  const result = await captureServerExceptionDetailed(error, context);
  return result.eventId;
}

export async function captureServerExceptionDetailed(
  error: unknown,
  context?: SafeErrorContext
): Promise<CaptureResult> {
  try {
    const dsn = process.env["SENTRY_DSN"];
    if (!dsn) {
      console.warn("[sentry] SENTRY_DSN not present at runtime; server capture disabled");
      return { sent: false };
    }
    const parsed = parseDsn(dsn);
    if (!parsed) {
      console.warn("[sentry] SENTRY_DSN could not be parsed; server capture disabled");
      return { sent: false };
    }

    const eventId = newEventId();
    const sentAt = new Date().toISOString();
    const { type, value } = errorShape(error);

    const tags: Record<string, string> = { runtime: "edge", surface: "server" };
    const extra: Record<string, unknown> = {};
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (value === undefined) continue;
        extra[key] = value;
        if (typeof value === "string" || typeof value === "number") {
          tags[key] = String(value);
        }
      }
    }

    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      environment: process.env["NODE_ENV"] ?? "production",
      server_name: undefined,
      tags,
      extra,
      exception: { values: [{ type, value }] },
    };

    const envelope =
      JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event) +
      "\n";

    const response = await fetch(parsed.ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": [
          "Sentry sentry_version=7",
          "sentry_client=astoria-edge/1.0",
          `sentry_key=${parsed.publicKey}`,
        ].join(", "),
      },
      body: envelope,
    });

    const sent = response.ok;
    console.log(`[sentry] capture: eventId=${eventId} status=${response.status} sent=${sent}`);
    return { sent, status: response.status, eventId };
  } catch (telemetryError) {
    console.warn(
      `[sentry] capture failed: ${
        telemetryError instanceof Error ? telemetryError.message : "unknown error"
      }`
    );
    return { sent: false };
  }
}
