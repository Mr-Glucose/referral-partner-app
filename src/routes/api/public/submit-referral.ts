import { createFileRoute } from "@tanstack/react-router";
import { logReferralEvent } from "@/lib/logger.server";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/submit-referral")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const { captureServerException } = await import("@/lib/sentry.server");

        const requestId = crypto.randomUUID();
        const startedAt = Date.now();
        const durationMs = () => Date.now() - startedAt;
        const fallbackCount = 0;

        logReferralEvent("referral.received", { request_id: requestId });

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ message: "We couldn't read that referral. Please try again." }, 400);
        }

        const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
        const partner_code = str(body["partner_code"]);
        const prospect_name = str(body["prospect_name"]);
        const prospect_email = str(body["prospect_email"]);
        const intent = str(body["intent"]);
        const referral_notes = str(body["referral_notes"]);

        const fieldErrors: Record<string, string> = {};
        if (!partner_code) fieldErrors["partner_code"] = "Partner code is required";
        if (!prospect_name) fieldErrors["prospect_name"] = "Prospect name is required";
        if (!prospect_email) fieldErrors["prospect_email"] = "Prospect email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prospect_email))
          fieldErrors["prospect_email"] = "Enter a valid email address";
        if (!intent) fieldErrors["insurance_intent"] = "Insurance intent is required";

        if (Object.keys(fieldErrors).length > 0) {
          return json(
            {
              message: "Some details need a quick fix before we can route this referral.",
              fieldErrors,
            },
            400,
          );
        }

        const webhookUrl = process.env["N8N_WEBHOOK_URL"];
        if (!webhookUrl) {
          console.error("N8N_WEBHOOK_URL is not configured");
          logReferralEvent("referral.upstream_failure", {
            request_id: requestId,
            http_status: 500,
            duration_ms: durationMs(),
            fallback_count: fallbackCount,
            error_type: "config_missing",
          });
          await captureServerException(new Error("N8N_WEBHOOK_URL is not configured"), {
            request_id: requestId,
            http_status: 500,
            duration_ms: durationMs(),
            error_type: "config_missing",
          });
          return json(
            { message: "The routing service isn't configured yet. Please try again later." },
            500,
          );
        }

        let res: Response;
        try {
          res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              partner_code,
              prospect_name,
              prospect_email,
              intent,
              referral_notes,
            }),
          });
        } catch {
          console.error("Failed to reach n8n webhook");
          logReferralEvent("referral.connection_failure", {
            request_id: requestId,
            http_status: 502,
            duration_ms: durationMs(),
            fallback_count: fallbackCount,
            error_type: "network_error",
          });
          await captureServerException(new Error("Failed to reach n8n webhook"), {
            request_id: requestId,
            http_status: 502,
            duration_ms: durationMs(),
            error_type: "network_error",
          });
          return json(
            {
              message:
                "We couldn't reach the routing service. Check your connection and try again.",
            },
            502,
          );
        }

        const text = await res.text();
        let payload: Record<string, unknown> | null = null;
        try {
          payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;
        } catch {
          payload = null;
        }

        if (!res.ok) {
          const upstream = payload ?? {};
          const message =
            (typeof upstream["message"] === "string" ? upstream["message"] : "") ||
            (typeof upstream["error"] === "string" ? upstream["error"] : "") ||
            (res.status >= 500
              ? "The routing service didn't respond as expected. Nothing was lost."
              : "The routing service couldn't accept this referral. Check the details and try again.");
          if (res.status >= 500) {
            logReferralEvent("referral.upstream_failure", {
              request_id: requestId,
              http_status: 502,
              duration_ms: durationMs(),
              fallback_count: fallbackCount,
              error_type: `upstream_http_${res.status}`,
            });
            await captureServerException(new Error(`n8n returned HTTP ${res.status}`), {
              request_id: requestId,
              http_status: 502,
              duration_ms: durationMs(),
              error_type: `upstream_http_${res.status}`,
            });
          }
          return json({ ...upstream, message }, res.status >= 500 ? 502 : res.status);
        }

        if (payload === null) {
          logReferralEvent("referral.upstream_failure", {
            request_id: requestId,
            http_status: 502,
            duration_ms: durationMs(),
            fallback_count: fallbackCount,
            error_type: "bad_upstream_response",
          });
          await captureServerException(new Error("n8n returned empty or non-JSON success response"), {
            request_id: requestId,
            http_status: 502,
            duration_ms: durationMs(),
            error_type: "bad_upstream_response",
          });
          return json(
            { message: "The routing service didn't respond as expected. Nothing was lost." },
            502,
          );
        }

        const referralId =
          typeof payload["referral_id"] === "string" ? payload["referral_id"] : undefined;
        const processingStatus =
          typeof payload["processing_status"] === "string"
            ? payload["processing_status"]
            : undefined;

        if (processingStatus === "manual_review_required") {
          logReferralEvent("referral.manual_review", {
            request_id: requestId,
            referral_id: referralId,
            processing_status: processingStatus,
            http_status: 200,
            duration_ms: durationMs(),
            fallback_count: fallbackCount,
          });
        } else {
          logReferralEvent("referral.completed", {
            request_id: requestId,
            referral_id: referralId,
            processing_status: processingStatus,
            http_status: 200,
            duration_ms: durationMs(),
            fallback_count: fallbackCount,
          });
        }

        return json(payload, 200);
      },

    },
  },
});
