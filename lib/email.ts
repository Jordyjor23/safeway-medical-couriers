import { Resend } from "resend";

export class EmailDeliveryError extends Error {
  constructor() {
    super("Email delivery failed.");
    this.name = "EmailDeliveryError";
  }
}

export function emailFromAddress() {
  return (process.env.EMAIL_FROM ?? "").trim();
}

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const to = args.to.trim();
  const apiKey = process.env.RESEND_API_KEY;
  const from = emailFromAddress();

  console.info("[email] send attempted", { to, subject: args.subject });

  if (!to) {
    console.error("[email] send failed", { reason: "missing_recipient" });
    throw new EmailDeliveryError();
  }

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] send failed", { to, reason: "missing_api_key" });
      throw new EmailDeliveryError();
    }
    console.info("[email] send skipped", { to, subject: args.subject, reason: "dev_no_api_key" });
    return { id: "dev-email", skipped: true as const };
  }

  if (!from) {
    console.error("[email] send failed", { to, reason: "missing_from" });
    throw new EmailDeliveryError();
  }

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: args.subject,
      html: args.html,
    });

    if (result.error) {
      console.error("[email] send failed", { to, reason: "provider_error" });
      throw new EmailDeliveryError();
    }

    console.info("[email] send successfully queued", { to, id: result.data?.id ?? null });
    return result.data;
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    console.error("[email] send failed", { to, reason: "provider_exception" });
    throw new EmailDeliveryError();
  }
}
