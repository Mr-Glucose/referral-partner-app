// Browser-side Sentry initialization for Astoria Referrals.
//
// Privacy rules (intentional, do not loosen without review):
// - No Session Replay.
// - sendDefaultPii: false — Sentry must not collect IPs, cookies, headers,
//   or any user-identifying information.
// - No request-body capture. Prospect names, emails, referral notes, API
//   keys, webhook URLs, and email content must never reach Sentry.
// - The DSN comes from VITE_SENTRY_DSN; if it is unset, Sentry stays off.

import * as Sentry from "@sentry/tanstackstart-react";
import type { AnyRouter } from "@tanstack/react-router";

let initialized = false;

export function initSentry(router: AnyRouter): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const dsn = import.meta.env["VITE_SENTRY_DSN"];
  if (!dsn) return; // No DSN configured — leave Sentry disabled.

  initialized = true;

  Sentry.init({
    dsn,
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    tracesSampleRate: 1.0,
    // Explicitly off:
    sendDefaultPii: false,
    enableLogs: false,
  });
}
