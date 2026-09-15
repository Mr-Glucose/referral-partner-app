import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY: isolated server-side Sentry verification endpoint.
// Remove after production Sentry verification succeeds.
export const Route = createFileRoute("/api/public/sentry-test")({
  server: {
    handlers: {
      GET: async () => {
        const { captureServerException } = await import("@/lib/sentry.server");

        captureServerException(
          new Error("Astoria Server Sentry Verification Error")
        );

        return new Response("Temporary Sentry verification captured", {
          status: 500,
        });
      },
    },
  },
});
