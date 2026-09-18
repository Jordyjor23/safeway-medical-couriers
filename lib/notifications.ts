import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import type { NotificationType } from "@prisma/client";

type NotifyArgs = {
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey?: string | null;
  email?: {
    to: string;
    subject?: string;
    html?: string;
  } | null;
};

export async function notifyUser(args: NotifyArgs) {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        type: args.type ?? "SYSTEM",
        title: args.title,
        body: args.body,
        href: args.href ?? null,
        dedupeKey: args.dedupeKey ?? null,
      },
    });
  } catch (error) {
    if (!args.dedupeKey) throw error;
  }

  if (args.email?.to) {
    try {
      await sendTransactionalEmail({
        to: args.email.to,
        subject: args.email.subject ?? args.title,
        html:
          args.email.html ??
          `<p><strong>${args.title}</strong></p><p>${args.body}</p>`,
      });
    } catch {
      // In-app notification must not fail because email delivery failed.
    }
  }
}

export async function notifyEmployee(args: Omit<NotifyArgs, "userId" | "email"> & { employeeId: string; emailSubject?: string }) {
  const employee = await prisma.employee.findUnique({
    where: { id: args.employeeId },
    select: { userId: true, email: true, legalFirstName: true },
  });
  if (!employee?.userId) return;

  await notifyUser({
    userId: employee.userId,
    type: args.type,
    title: args.title,
    body: args.body,
    href: args.href,
    dedupeKey: args.dedupeKey,
    email: employee.email
      ? {
          to: employee.email,
          subject: args.emailSubject ?? args.title,
          html: `<p>Hello ${employee.legalFirstName},</p><p>${args.body}</p>`,
        }
      : null,
  });
}

export async function notifyRoles(args: {
  roles: string[];
  title: string;
  body: string;
  href?: string | null;
  type?: NotificationType;
  dedupeKeyPrefix?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      disabled: false,
      accountStatus: "ACTIVE",
      roles: { some: { role: { key: { in: args.roles } } } },
    },
    select: { id: true },
  });

  await Promise.all(
    users.map((user) =>
      notifyUser({
        userId: user.id,
        type: args.type,
        title: args.title,
        body: args.body,
        href: args.href,
        dedupeKey: args.dedupeKeyPrefix ? `${args.dedupeKeyPrefix}:${user.id}` : null,
      }),
    ),
  );
}
