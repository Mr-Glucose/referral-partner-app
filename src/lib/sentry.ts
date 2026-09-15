// Browser-side Sentry initialization for Astoria Referrals.
//
// Privacy rules (intentional, do not loosen without review):
// - No Session Replay.
// - sendDefaultPii: false — Sentry must not collect IPs, cookies, headers,
//   or any user-identifying information.
// - No request-body capture. Prospect names, emails, referral notes, API
//   keys, webhook URLs, and email content must never reach Sentry.
// - The DSN comes from VITE_SENTRY_DSN; if it is unset, Sentry stays off.
// - Server-side Sentry is intentionally disabled for now.

import { createIsomorphicFn } from "@tanstack/react-start";
import * as Sentry from "@sentry/tanstackstart-react";
import type { AnyRouter } from "@tanstack/react-router";

let initialized = false;

// Isomorphic export: initializes Sentry in the browser; no-ops on the server.
export const initSentry = createIsomorphicFn()
  .client((router: AnyRouter): void => {
    if (initialized) return;

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
  })
  .server((_router: AnyRouter): void => {
    // Server-side Sentry is intentionally disabled for now.
  });

// Temporary verification helper. Sends a harmless, named test error.
// No PII, request bodies, partner data, API keys, webhook URLs, or
// credentials are attached. Will be removed after Sentry verification.
export const sendSentryVerificationError = createIsomorphicFn()
  .client((): void => {
    Sentry.captureException(new Error("Astoria Sentry Verification Error"));
  })
  .server((): void => {
    // No-op on server.
  });
