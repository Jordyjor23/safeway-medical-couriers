import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";

export const authConfigured = Boolean(
  process.env.BETTER_AUTH_SECRET && process.env.DATABASE_URL,
);

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  appName: "Safeway Couriers",
  secret: secret ?? "unconfigured-local-secret-not-for-production-use",
  baseURL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your Safeway Couriers portal password",
        html: `<p>We received a request to reset your Safeway Couriers portal password.</p>
<p><a href="${url}">Reset password</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 20,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/two-factor/verify": { window: 60, max: 8 },
    },
  },
  user: {
    additionalFields: {
      disabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    database: {
      generateId: "uuid",
    },
  },
  trustedOrigins: [baseURL],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const setupSecret = process.env.OWNER_SETUP_SECRET;
      const staffSecret = process.env.BETTER_AUTH_SECRET;
      const setupHeader = ctx.headers?.get("x-owner-setup");
      const staffHeader = ctx.headers?.get("x-staff-create");
      if (setupSecret && setupHeader && setupHeader === setupSecret) return;
      if (staffSecret && staffHeader && staffHeader === staffSecret) return;
      throw new APIError("FORBIDDEN", {
        message: "Public registration is disabled.",
      });
    }),
  },
  plugins: [
    twoFactor({
      issuer: "Safeway Couriers",
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
