// Server-side Sentry initialization for Astoria Referrals.
//
// This module is server-only and must never be imported by client code.
//
// Privacy rules (intentional, do not loosen without review):
// - No Session Replay.
// - sendDefaultPii: false — Sentry must not collect IPs, cookies, headers,
//   request bodies, or any user-identifying information.
// - Prospect names, emails, referral notes, API keys, webhook URLs, and
//   email content must never reach Sentry.
// - The DSN comes from SENTRY_DSN; if it is unset, Sentry stays off.

import * as Sentry from "@sentry/tanstackstart-react";

let initialized = false;

function initServerSentry(): boolean {
  if (initialized) return true;
  // Presence check only — never log the DSN value itself.
  const dsn = process.env["SENTRY_DSN"];
  if (!dsn) {
    console.warn("[sentry] SENTRY_DSN not present at runtime; server Sentry disabled");
    return false;
  }
  initialized = true;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
  });
  return true;
}

// Serverless runtimes freeze the isolate as soon as the response is returned,
// which silently drops queued Sentry events. Always await flush before the
// route returns so events are actually delivered.
export async function captureServerException(error: unknown): Promise<string | undefined> {
  const active = initServerSentry();
  if (!active) return undefined;
  const eventId = Sentry.captureException(error);
  const flushed = await Sentry.flush(2000);
  console.log(
    `[sentry] capture: eventId=${eventId ?? "none"} flushed=${flushed}`
  );
  return eventId;
}
