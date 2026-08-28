import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { bearer, twoFactor, username } from "better-auth/plugins";
import { accountAllowsLogin, accountAllowsPasswordReset, nextFailedLoginState } from "@/lib/account-status";
import { allowedOrigins, appOrigin } from "@/lib/app-url";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { buildPasswordResetUrl } from "@/lib/password-reset";

export const authConfigured = Boolean(
  process.env.BETTER_AUTH_SECRET && process.env.DATABASE_URL,
);

if (process.env.VERCEL === "1" && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required on Vercel.");
}

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = appOrigin();
const trustedOrigins = allowedOrigins();

async function findUserForAuth(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (!value) return null;
  if (value.includes("@")) {
    return prisma.user.findUnique({ where: { email: value } });
  }
  return prisma.user.findFirst({
    where: { username: { equals: value, mode: "insensitive" } },
  });
}

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
    resetPasswordTokenExpiresIn: 60 * 60 * 24,
    sendResetPassword: async ({ user, token }) => {
      const record = await prisma.user.findUnique({ where: { id: user.id } });
      if (!record || !accountAllowsPasswordReset(record)) return;
      const url = buildPasswordResetUrl(token, baseURL);
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your Safeway Couriers portal password",
        html: `<p>We received a request to reset your Safeway Couriers portal password.</p>
<p><a href="${url}">Reset password</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
      });
    },
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: async ({ user }) => {
      const record = await prisma.user.findUnique({ where: { id: user.id } });
      if (!record || record.accountStatus === "TERMINATED") return;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountStatus: "ACTIVE",
          disabled: false,
          mustChangePassword: false,
          lockedUntil: null,
          failedLoginCount: 0,
          passwordChangedAt: new Date(),
        },
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
      "/sign-in/username": { window: 60, max: 5 },
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
      accountStatus: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  advanced: {
    useSecureCookies: baseURL.startsWith("https://"),
    database: {
      generateId: false,
    },
  },
  trustedOrigins,
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { accountStatus: true },
          });
          await prisma.user.update({
            where: { id: session.userId },
            data: {
              lastLoginAt: new Date(),
              failedLoginCount: 0,
              lockedUntil: null,
              ...(user?.accountStatus === "LOCKED" ? { accountStatus: "ACTIVE" } : {}),
            },
          });
          await writeAuditLog({
            actorId: session.userId,
            action: "auth.login",
            targetType: "user",
            targetId: session.userId,
          });
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const setupSecret = process.env.OWNER_SETUP_SECRET;
        const staffSecret = process.env.BETTER_AUTH_SECRET;
        const setupHeader = ctx.headers?.get("x-owner-setup");
        const staffHeader = ctx.headers?.get("x-staff-create");
        if (setupSecret && setupHeader && setupHeader === setupSecret) return;
        if (staffSecret && staffHeader && staffHeader === staffSecret) return;
        throw new APIError("FORBIDDEN", {
          message: "Public registration is disabled.",
        });
      }

      if (ctx.path === "/sign-in/email" || ctx.path === "/sign-in/username") {
        const body = ctx.body as { email?: string; username?: string } | undefined;
        const identifier = body?.email || body?.username || "";
        const user = await findUserForAuth(identifier);
        if (user && !accountAllowsLogin(user)) {
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid email or password",
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email" && ctx.path !== "/sign-in/username") return;
      const returned = ctx.context.returned as { status?: string; statusCode?: number } | Error | undefined;
      const failed =
        returned instanceof Error ||
        (returned &&
          typeof returned === "object" &&
          ("statusCode" in returned
            ? Number(returned.statusCode) === 401
            : "status" in returned && returned.status === "UNAUTHORIZED"));
      if (!failed) return;
      const body = ctx.body as { email?: string; username?: string } | undefined;
      const identifier = body?.email || body?.username || "";
      const user = await findUserForAuth(identifier);
      await writeAuditLog({
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        action: "auth.login.failed",
        targetType: "user",
        targetId: user?.id ?? null,
      });
      if (!user) return;
      await prisma.user.update({
        where: { id: user.id },
        data: nextFailedLoginState(user.failedLoginCount, user.accountStatus),
      });
    }),
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      displayUsername: false,
    }),
    bearer(),
    twoFactor({
      issuer: "Safeway Couriers",
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
