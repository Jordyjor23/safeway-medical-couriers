import { Resend } from "resend";
import { site } from "@/lib/site";

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${site.name} <noreply@${new URL(site.url).hostname}>`;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured.");
    }
    console.info(`[email:dev] to=${args.to} subject=${args.subject}`);
    return { id: "dev-email", skipped: true as const };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
