import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const referralInputSchema = z.object({
  partner_code: z.string().trim().min(1, "Partner code is required"),
  prospect_name: z.string().trim().min(1, "Prospect name is required"),
  prospect_email: z.string().trim().email("Enter a valid email address"),
  insurance_intent: z.string().trim().min(1, "Insurance intent is required"),
  referral_notes: z.string().trim().optional().default(""),
});

export type ReferralInput = z.infer<typeof referralInputSchema>;

export type ReferralResult = {
  referral_id: string;
  insurance_line: string;
  urgency: string;
  priority: "high" | "medium" | "low";
  route_to: string;
  sla_hours: number;
  next_action: string;
  processing_status: "ready" | "manual_review_required";
};

export type ReferralResponse =
  | { ok: true; data: ReferralResult }
  | {
      ok: false;
      kind: "validation" | "connection";
      message: string;
      fieldErrors?: Record<string, string>;
    };

function classify(input: ReferralInput): ReferralResult {
  const intent = input.insurance_intent.toLowerCase();
  const notes = input.referral_notes.toLowerCase();
  const line = intent.includes("life")
    ? "Life & Protection"
    : intent.includes("health")
      ? "Health & Benefits"
      : intent.includes("home") || intent.includes("property")
        ? "Property"
        : intent.includes("auto") || intent.includes("fleet")
          ? "Auto & Fleet"
          : intent.includes("liability") || intent.includes("business")
            ? "Commercial Lines"
            : "General Intake";

  const urgent = /urgent|asap|today|deadline|expir|lapse|tomorrow/.test(`${intent} ${notes}`);
  const soon = /week|renew|soon|quote/.test(`${intent} ${notes}`);
  const priority: ReferralResult["priority"] = urgent ? "high" : soon ? "medium" : "low";
  const needsReview = line === "General Intake" || input.referral_notes.length > 400;

  return {
    referral_id: `REF-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
    insurance_line: line,
    urgency: urgent ? "Time sensitive" : soon ? "Standard turnaround" : "No fixed deadline",
    priority,
    route_to:
      line === "General Intake" ? "Referral triage desk" : `${line} underwriting team`,
    sla_hours: priority === "high" ? 4 : priority === "medium" ? 24 : 72,
    next_action: needsReview
      ? "A referral specialist will confirm the coverage line before assignment"
      : `An advisor will contact ${input.prospect_name.split(" ")[0]} to confirm details`,
    processing_status: needsReview ? "manual_review_required" : "ready",
  };
}

type N8nResponse = {
  referral_id?: string;
  processing_status?: string;
  final_decision?: {
    insurance_line?: string;
    urgency?: string;
    priority?: string;
    route_to?: string;
    sla_hours?: number;
    next_action?: string;
  };
  message?: string;
  error?: string;
};

function mapN8n(payload: N8nResponse, fallback: ReferralResult): ReferralResult {
  const d = payload.final_decision ?? {};
  const priority = (d.priority ?? "").toLowerCase();
  return {
    referral_id: payload.referral_id ?? fallback.referral_id,
    insurance_line: d.insurance_line ?? fallback.insurance_line,
    urgency: d.urgency ?? fallback.urgency,
    priority:
      priority === "high" || priority === "medium" || priority === "low"
        ? (priority as ReferralResult["priority"])
        : fallback.priority,
    route_to: d.route_to ?? fallback.route_to,
    sla_hours: typeof d.sla_hours === "number" ? d.sla_hours : fallback.sla_hours,
    next_action: d.next_action ?? fallback.next_action,
    processing_status:
      payload.processing_status === "manual_review_required"
        ? "manual_review_required"
        : payload.processing_status === "ready"
          ? "ready"
          : fallback.processing_status,
  };
}

/**
 * Server-side referral proxy. Validates the payload, then forwards it to the
 * n8n workflow. The webhook URL stays server-side only (N8N_WEBHOOK_URL).
 */
export const submitReferral = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data)
  .handler(async ({ data }): Promise<ReferralResponse> => {
    const parsed = referralInputSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return {
        ok: false,
        kind: "validation",
        message: "Some details need a quick fix before we can route this referral.",
        fieldErrors,
      };
    }

    const input = parsed.data;

    if (!/^[A-Za-z]{2,}-?\d{3,}$/.test(input.partner_code.replace(/\s/g, ""))) {
      return {
        ok: false,
        kind: "validation",
        message: "We couldn't recognise that partner code.",
        fieldErrors: {
          partner_code: "Use the code from your partner agreement, e.g. AST-48210",
        },
      };
    }

    const webhookUrl = process.env["N8N_REFERRAL_WEBHOOK_URL"];
    if (!webhookUrl) {
      return { ok: true, data: classify(input) };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        return {
          ok: false,
          kind: "connection",
          message: "The routing service didn't respond as expected. Nothing was lost.",
        };
      }
      return { ok: true, data: (await res.json()) as ReferralResult };
    } catch {
      return {
        ok: false,
        kind: "connection",
        message: "We couldn't reach the routing service. Check your connection and try again.",
      };
    }
  });
