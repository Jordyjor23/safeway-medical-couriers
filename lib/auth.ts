import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { bearer, twoFactor, username } from "better-auth/plugins";
import { accountAllowsLogin, accountAllowsPasswordReset, nextFailedLoginState } from "@/lib/account-status";
import { allowedOrigins, appOrigin } from "@/lib/app-url";
import { writeAuditLog } from "@/lib/audit";
import { assertRuntimeAuthSecret, resolveBetterAuthSecret } from "@/lib/auth-secret";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { allowOwnerBootstrapSignup } from "@/lib/owner-bootstrap";
import { buildPasswordResetUrl } from "@/lib/password-reset";
import { readServerEnv } from "@/lib/secrets";

assertRuntimeAuthSecret();

export const authConfigured = Boolean(readServerEnv("BETTER_AUTH_SECRET") && readServerEnv("DATABASE_URL"));

const secret = resolveBetterAuthSecret();
const baseURL = appOrigin();
const trustedOrigins = allowedOrigins();
const useSecureCookies = baseURL.startsWith("https://");

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

async function ownerCount() {
  return prisma.userRole.count({ where: { role: { key: "OWNER" } } });
}

async function userIsOwner(userId: string) {
  const assignment = await prisma.userRole.findFirst({
    where: { userId, role: { key: "OWNER" } },
    select: { id: true },
  });
  return Boolean(assignment);
}

function sessionUserId(session: { user?: { id?: string }; session?: { userId?: string } } | null | undefined) {
  return session?.user?.id || session?.session?.userId || "";
}

export const auth = betterAuth({
  appName: "Safeway Couriers",
  secret,
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
      await prisma.verification.create({
        data: {
          identifier: `password-reset:${token}`,
          value: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const url = buildPasswordResetUrl(token, baseURL);
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your Safeway Couriers portal password",
        html: `<p>We received a request to reset your Safeway Couriers portal password.</p>
<p><a href="${url}">Reset password</a></p>
<p>This link expires in 24 hours. If you did not request this, you can ignore this email.</p>`,
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
      enabled: false,
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
    useSecureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: useSecureCookies,
      path: "/",
    },
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
        const decision = allowOwnerBootstrapSignup({
          setupSecret: readServerEnv("OWNER_SETUP_SECRET"),
          setupHeader: ctx.headers?.get("x-owner-setup") ?? "",
          ownerCount: await ownerCount(),
        });
        if (!decision.ok) {
          throw new APIError("FORBIDDEN", { message: decision.message });
        }
        return;
      }

      if (ctx.path === "/two-factor/disable") {
        const session = await getSessionFromCtx(ctx);
        const userId = sessionUserId(session);
        if (!userId) {
          throw new APIError("UNAUTHORIZED", { message: "Sign in required." });
        }
        if (await userIsOwner(userId)) {
          throw new APIError("FORBIDDEN", {
            message: "Owner accounts cannot disable multi-factor authentication.",
          });
        }
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
