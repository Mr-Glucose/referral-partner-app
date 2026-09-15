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

function initServerSentry(): void {
  if (initialized) return;
  const dsn = process.env["SENTRY_DSN"];
  if (!dsn) return;
  initialized = true;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
  });
}

export function captureServerException(error: unknown): void {
  initServerSentry();
  Sentry.captureException(error);
}
