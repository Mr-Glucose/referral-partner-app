import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  submitReferral,
  type ReferralInput,
  type ReferralResult,
} from "@/lib/referral.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Astoria Referrals — Partner Routing Console" },
      {
        name: "description",
        content:
          "Submit an insurance referral and get instant routing: coverage line, priority, SLA and the next action for your prospect.",
      },
      { property: "og:title", content: "Astoria Referrals — Partner Routing Console" },
      {
        property: "og:description",
        content:
          "Submit an insurance referral and get instant routing: coverage line, priority, SLA and the next action for your prospect.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReferralPage,
});

type FormState = ReferralInput;

const EMPTY: FormState = {
  partner_code: "",
  prospect_name: "",
  prospect_email: "",
  insurance_intent: "",
  referral_notes: "",
};

const fieldClass =
  "mt-1.5 w-full rounded-2xl border-0 bg-canvas px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-inset ring-black/5 placeholder:text-soft/70 focus:ring-2 focus:ring-brand";

const priorityStyles: Record<ReferralResult["priority"], string> = {
  high: "bg-peach-soft text-peach",
  medium: "bg-amber-soft text-amber",
  low: "bg-mint-soft text-mint",
};

function humanize(value: string): string {
  const map: Record<string, string> = {
    personal_lines: "Personal Lines",
    commercial_lines: "Commercial Lines",
    general_review: "General Review",
    life_team: "Life Team",
    health_team: "Health Team",
  };
  const normalized = value.trim().toLowerCase();
  if (map[normalized]) return map[normalized];
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

function ReferralPage() {
  const [form, setForm] = useState<FormState>(EMPTY);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReferralResult | null>(null);
  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<{ kind: "validation" | "connection"; message: string } | null>(
    null,
  );

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function localValidate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.partner_code.trim()) errs['partner_code'] = "Partner code is required";
    if (!form.prospect_name.trim()) errs['prospect_name'] = "Prospect name is required";
    if (!form.prospect_email.trim()) errs['prospect_email'] = "Prospect email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.prospect_email.trim()))
      errs['prospect_email'] = "Enter a valid email address";
    if (!form.insurance_intent.trim())
      errs['insurance_intent'] = "Tell us what coverage they're after";
    return errs;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = localValidate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError({ kind: "validation", message: "A few details need attention before we can route." });
      return;
    }
    setFieldErrors({});
    setError(null);
    setLoading(true);
    setStep(2);
    try {
      const res = await submitReferral(form);
      if (res.ok) {
        setResult(res.data);
        setStep(3);
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        setError({ kind: res.kind, message: res.message });
        setStep(1);
      }
    } catch {
      setError({
        kind: "connection",
        message: "We couldn't reach the routing service. Your details are still here — try again.",
      });
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setStep(1);
    setError(null);
    setFieldErrors({});
  }

  return (
    <main className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col px-5 pb-7 pt-5">
        <header className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-2xl bg-brand text-base font-bold text-primary-foreground">
            A
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight">Astoria Referrals</p>
            <p className="text-[11px] font-medium text-soft">Partner routing console</p>
          </div>
          <span className="ml-auto rounded-full bg-mint-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mint">
            System Online
          </span>
        </header>

        <div className="mt-6 mb-4 flex gap-1.5">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-brand" : "bg-black/10"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-brand" : "bg-black/10"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-brand" : "bg-black/10"}`} />
        </div>

        <div className="flex-1">
          {result ? (
            <ResultCard result={result} onReset={() => { setForm(EMPTY); reset(); }} />
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="rounded-[28px] bg-card p-5 ring-1 ring-black/5">
                <div className="flex items-center justify-between">
                  <h1 className="font-display text-[22px] font-semibold leading-tight">
                    New referral
                  </h1>
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-soft">
                    Step 1 of 3
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-soft">
                  Route a client to the right underwriting desk.
                </p>

                <div className="mt-5 space-y-4">
                  <Field
                    id="partner_code"
                    label="Partner code"
                    value={form.partner_code}
                    onChange={set("partner_code")}
                    placeholder="e.g. PARTNER001"
                    error={fieldErrors['partner_code']}
                  />
                  <Field
                    id="prospect_name"
                    label="Prospect name"
                    value={form.prospect_name}
                    onChange={set("prospect_name")}
                    placeholder="Nadia Okafor"
                    error={fieldErrors['prospect_name']}
                  />
                  <Field
                    id="prospect_email"
                    label="Prospect email"
                    type="email"
                    value={form.prospect_email}
                    onChange={set("prospect_email")}
                    placeholder="nadia.okafor@brightline.co"
                    error={fieldErrors['prospect_email']}
                  />
                  <Field
                    id="insurance_intent"
                    label="Insurance intent"
                    value={form.insurance_intent}
                    onChange={set("insurance_intent")}
                    placeholder="e.g. auto insurance, life insurance"
                    error={fieldErrors['insurance_intent']}
                  />
                  <div>
                    <label htmlFor="referral_notes" className="text-[12px] font-semibold text-ink">
                      Referral notes <span className="font-medium text-soft">(optional)</span>
                    </label>
                    <textarea
                      id="referral_notes"
                      rows={3}
                      value={form.referral_notes}
                      onChange={(e) => set("referral_notes")(e.target.value)}
                      placeholder="Any additional details about what the prospect needs"
                      className={fieldClass}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className={`mt-5 flex items-start gap-3 rounded-2xl px-4 py-3 ${
                      error.kind === "validation" ? "bg-amber-soft" : "bg-peach-soft"
                    }`}
                  >
                    <span className="text-lg leading-none">!</span>
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{error.message}</p>
                      {error.kind === "connection" && (
                        <button
                          type="submit"
                          className="mt-2 rounded-xl bg-card px-3 py-1.5 text-[12px] font-bold text-ink ring-1 ring-inset ring-black/5"
                        >
                          Try again
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm(EMPTY);
                    reset();
                  }}
                  className="h-[52px] rounded-2xl bg-card text-[14px] font-semibold text-ink ring-1 ring-inset ring-black/5"
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-[52px] rounded-2xl bg-brand text-[14px] font-semibold text-primary-foreground ring-1 ring-inset ring-brand-deep/40 disabled:opacity-70"
                >
                  {loading ? "Routing…" : "Submit Referral"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <span className={`size-2 rounded-full ${step === 1 ? "bg-brand" : "bg-black/15"}`} />
          <span className={`size-2 rounded-full ${step === 2 ? "bg-brand" : "bg-black/15"}`} />
          <span className={`size-2 rounded-full ${step === 3 ? "bg-brand" : "bg-black/15"}`} />
        </div>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string | undefined;
  type?: string | undefined;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} ${error ? "ring-2 ring-peach" : ""}`}
      />
      {error && <p className="mt-1 text-[12px] font-semibold text-peach">{error}</p>}
    </div>
  );
}

function ResultCard({ result, onReset }: { result: ReferralResult; onReset: () => void }) {
  const ready = result.processing_status === "ready";
  return (
    <div>
      <div className="rounded-[28px] bg-card p-5 ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Referral received
            </h1>
            <p className="mt-1.5 text-[13px] text-soft">{result.referral_id}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${priorityStyles[result.priority]}`}
          >
            {humanize(result.priority)} priority
          </span>
        </div>

        <div
          className={`mt-4 rounded-2xl px-4 py-3 ${ready ? "bg-mint-soft" : "bg-amber-soft"}`}
        >
          <p className="text-[13px] font-bold text-ink">
            {ready ? "Ready — routed automatically" : "Manual review required"}
          </p>
          <p className="mt-1 text-[12px] font-medium text-ink/80">
            {ready
              ? "This referral was processed and routed successfully."
              : "This referral needs a team member to review the details before it moves forward. No additional action is needed from you right now."}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <Cell label="Insurance line" value={humanize(result.insurance_line)} />
          <Cell label="Urgency" value={humanize(result.urgency)} />
          <Cell label="Route to" value={humanize(result.route_to)} />
          <Cell label="Response SLA" value={`${result.sla_hours} hours`} />
        </dl>

        <div className="mt-3 rounded-2xl bg-canvas px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-soft">Next action</dt>
          <dd className="mt-1 text-[14px] font-semibold text-ink">{result.next_action}</dd>
        </div>
      </div>

      <button
        onClick={onReset}
        className="mt-5 h-[52px] w-full rounded-2xl bg-brand text-[14px] font-semibold text-primary-foreground ring-1 ring-inset ring-brand-deep/40"
      >
        Submit another referral
      </button>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-soft">{label}</dt>
      <dd className="mt-1 text-[14px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
