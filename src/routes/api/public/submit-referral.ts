import { createFileRoute } from "@tanstack/react-router";

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
        } catch (err) {
          console.error("Failed to reach n8n webhook", err);
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
          return json({ ...upstream, message }, res.status >= 500 ? 502 : res.status);
        }

        if (payload === null) {
          return json(
            { message: "The routing service didn't respond as expected. Nothing was lost." },
            502,
          );
        }

        return json(payload, 200);
      },
    },
  },
});
