import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitReferral, type ReferralInput } from "./referral.functions";

const baseInput: ReferralInput = {
  partner_code: "PARTNER001",
  prospect_name: "Nadia Okafor",
  prospect_email: "nadia.okafor@brightline.co",
  insurance_intent: "auto insurance",
  referral_notes: "",
};

let fetchMock: ReturnType<typeof vi.fn>;

function mockFetch(response: Response) {
  fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockFetchRejected(error: Error) {
  fetchMock = vi.fn<typeof fetch>(() => Promise.reject(error));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("submitReferral", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails validation when partner_code is empty and reports the partner_code field", async () => {
    const res = await submitReferral({ ...baseInput, partner_code: "" });

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.kind).toBe("validation");
    expect(res.ok === false && res.fieldErrors?.["partner_code"]).toBe(
      "Partner code is required",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails validation when prospect_email is invalid and reports the prospect_email field", async () => {
    const res = await submitReferral({ ...baseInput, prospect_email: "not-an-email" });

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.kind).toBe("validation");
    expect(res.ok === false && res.fieldErrors?.["prospect_email"]).toBe(
      "Enter a valid email address",
    );
  });

  it("maps a successful n8n response correctly", async () => {
    const payload = {
      referral_id: "REF-12345",
      processing_status: "ready",
      final_decision: {
        insurance_line: "auto",
        urgency: "high",
        priority: "high",
        route_to: "personal_lines",
        sla_hours: 4,
        next_action: "Route to auto underwriting desk",
      },
    };

    mockFetch(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await submitReferral(baseInput);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.referral_id).toBe("REF-12345");
    expect(res.data.processing_status).toBe("ready");
    expect(res.data.insurance_line).toBe("auto");
    expect(res.data.urgency).toBe("high");
    expect(res.data.priority).toBe("high");
    expect(res.data.route_to).toBe("personal_lines");
    expect(res.data.sla_hours).toBe(4);
    expect(res.data.next_action).toBe("Route to auto underwriting desk");
  });

  it("preserves manual_review_required status from n8n", async () => {
    const payload = {
      referral_id: "REF-MANUAL",
      processing_status: "manual_review_required",
      final_decision: {
        insurance_line: "commercial_lines",
        urgency: "standard",
        priority: "medium",
        route_to: "commercial_team",
        sla_hours: 24,
        next_action: "A specialist will review this referral.",
      },
    };

    mockFetch(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await submitReferral(baseInput);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.processing_status).toBe("manual_review_required");
  });

  it("returns a friendly connection error when fetch throws a network error", async () => {
    mockFetchRejected(new Error("Network request failed"));

    const res = await submitReferral(baseInput);

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.kind).toBe("connection");
    expect(res.ok === false && res.message).toContain(
      "We couldn't reach the routing service",
    );
  });
});
