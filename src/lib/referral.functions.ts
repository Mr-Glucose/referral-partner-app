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
  fieldErrors?: Record<string, string>;
};

function mapN8n(payload: N8nResponse): ReferralResult {
  const d = payload.final_decision ?? {};
  const priority = (d.priority ?? "").toLowerCase();
  return {
    referral_id: payload.referral_id ?? "—",
    insurance_line: d.insurance_line ?? "General Intake",
    urgency: d.urgency ?? "Standard turnaround",
    priority:
      priority === "high" || priority === "medium" || priority === "low"
        ? (priority as ReferralResult["priority"])
        : "medium",
    route_to: d.route_to ?? "Referral triage desk",
    sla_hours: typeof d.sla_hours === "number" ? d.sla_hours : 24,
    next_action: d.next_action ?? "A referral specialist will follow up with the next step.",
    processing_status:
      payload.processing_status === "manual_review_required"
        ? "manual_review_required"
        : "ready",
  };
}

/**
 * Submits a referral to the backend endpoint that holds the n8n webhook URL.
 * The webhook URL is never present in browser code.
 */
export async function submitReferral(input: ReferralInput): Promise<ReferralResponse> {
  const parsed = referralInputSchema.safeParse(input);
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

  const data = parsed.data;

  let res: Response;
  try {
    res = await fetch("/api/public/submit-referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_code: data.partner_code,
        prospect_name: data.prospect_name,
        prospect_email: data.prospect_email,
        intent: data.insurance_intent,
        referral_notes: data.referral_notes,
      }),
    });
  } catch {
    return {
      ok: false,
      kind: "connection",
      message: "We couldn't reach the routing service. Check your connection and try again.",
    };
  }

  const text = await res.text();
  let payload: N8nResponse | null = null;
  try {
    payload = text ? (JSON.parse(text) as N8nResponse) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) {
      return {
        ok: false,
        kind: "validation",
        message:
          payload?.message ??
          payload?.error ??
          "The routing service couldn't accept this referral. Check the details and try again.",
        ...(payload?.fieldErrors
          ? { fieldErrors: payload.fieldErrors }
          : res.status === 401 || res.status === 403
            ? { fieldErrors: { partner_code: "This partner code wasn't accepted." } }
            : {}),
      };
    }
    return {
      ok: false,
      kind: "connection",
      message:
        payload?.message ??
        "We couldn't reach the routing service. Check your connection and try again.",
    };
  }

  if (!payload) {
    return {
      ok: false,
      kind: "connection",
      message: "The routing service didn't respond as expected. Nothing was lost.",
    };
  }

  return { ok: true, data: mapN8n(payload) };
}
