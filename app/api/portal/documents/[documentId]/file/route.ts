import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { canAccessManagedDocument } from "@/lib/documents/access";
import { loadManagedDocumentForAccess } from "@/lib/documents/operations";
import { verifyDocumentAccessToken } from "@/lib/documents/signed-url";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { DocumentStorageError, readPrivateFile } from "@/lib/storage";
import { requireApiAuth } from "@/lib/rbac";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const verified = verifyDocumentAccessToken(token);
  let ctx = null as Awaited<ReturnType<typeof requireApiAuth>>["ctx"];
  if (verified) {
    if (verified.documentId !== documentId) {
      return withCors(request, NextResponse.json({ error: "Not found." }, { status: 404 }));
    }
    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      include: {
        employee: { select: { id: true } },
        applicant: { select: { id: true } },
        customerUser: { select: { customerId: true } },
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user) {
      return withCors(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    ctx = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employee?.id ?? null,
        applicantId: user.applicant?.id ?? null,
        customerId: user.customerUser?.customerId ?? null,
      },
      roles: user.roles.map((assignment) => assignment.role.key),
      permissions: new Set(user.roles.flatMap((assignment) => assignment.role.permissions.map((link) => link.permission.key))),
    };
  } else {
    const auth = await requireApiAuth();
    if (auth.error || !auth.ctx) {
      return withCors(request, auth.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    ctx = auth.ctx;
  }

  const document = await loadManagedDocumentForAccess(documentId);
  if (!document) {
    return withCors(request, NextResponse.json({ error: "Not found." }, { status: 404 }));
  }
  if (!canAccessManagedDocument(ctx, document, "download")) {
    return withCors(request, NextResponse.json({ error: "Not found." }, { status: 404 }));
  }

  try {
    const stored = await readPrivateFile(document.blobKey);
    await writeAuditLog({
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: "document.downloaded",
      targetType: "document",
      targetId: document.id,
    });
    const filename = document.originalFileName || document.name;
    const headers = new Headers();
    headers.set("Content-Type", stored.blob.contentType || document.mimeType || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename="${filename.replaceAll('"', "")}"`);
    headers.set("Cache-Control", "private, no-store");
    return withCors(request, new NextResponse(stored.stream, { status: 200, headers }));
  } catch (caught) {
    if (caught instanceof DocumentStorageError) {
      return withCors(request, NextResponse.json({ error: caught.message }, { status: 404 }));
    }
    throw caught;
  }
}
