export class EmailDeliveryError extends Error {
  constructor() {
    super("Email delivery failed.");
    this.name = "EmailDeliveryError";
  }
}

export function emailFromAddress() {
  return (process.env.EMAIL_FROM ?? "").trim();
}

function providerErrorName(payload: unknown) {
  if (!payload || typeof payload !== "object") return "provider_error";
  const name = "name" in payload ? payload.name : null;
  return typeof name === "string" && name ? name : "provider_error";
}

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const to = args.to.trim();
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  const from = emailFromAddress();

  console.info("[email] send attempted", { to, subject: args.subject });

  if (!to) {
    console.error("[email] send failed", { reason: "missing_recipient" });
    throw new EmailDeliveryError();
  }

  if (!apiKey) {
    console.error("[email] send failed", { to, reason: "missing_api_key" });
    throw new EmailDeliveryError();
  }

  if (!from) {
    console.error("[email] send failed", { to, reason: "missing_from" });
    throw new EmailDeliveryError();
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: args.subject,
        html: args.html,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; name?: string; statusCode?: number }
      | null;

    if (!response.ok || !payload?.id) {
      console.error("[email] send failed", {
        to,
        reason: providerErrorName(payload),
        status: response.status,
      });
      throw new EmailDeliveryError();
    }

    console.info("[email] send successfully queued", { to, id: payload.id });
    return { id: payload.id };
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    console.error("[email] send failed", { to, reason: "provider_exception" });
    throw new EmailDeliveryError();
  }
}
