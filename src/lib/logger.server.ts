// Server-only structured logging.
// Emits single-line JSON via console.log so events appear in the Lovable
// backend logs. NEVER log PII (prospect name/email/notes), request bodies,
// headers, cookies, webhook URLs, API keys, or email content.

export type ReferralLogEvent =
  | "referral.received"
  | "referral.completed"
  | "referral.manual_review"
  | "referral.upstream_failure"
  | "referral.connection_failure";

export interface SafeLogFields {
  request_id?: string | undefined;
  referral_id?: string | undefined;
  processing_status?: string | undefined;
  http_status?: number | undefined;
  duration_ms?: number | undefined;
  fallback_count?: number | undefined;
  error_type?: string | undefined;
}

export function logReferralEvent(event: ReferralLogEvent, fields: SafeLogFields): void {
  const record: Record<string, unknown> = {
    event,
    timestamp: new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) record[key] = value;
  }
  try {
    console.log(JSON.stringify(record));
  } catch {
    // Logging must never break the referral flow.
  }
}
