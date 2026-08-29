import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { canAccessManagedDocument } from "@/lib/documents/access";
import { loadManagedDocumentForAccess } from "@/lib/documents/operations";
import { writeAuditLog } from "@/lib/audit";
import { DocumentStorageError, readPrivateFile } from "@/lib/storage";
import { requireApiAuth } from "@/lib/rbac";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { error, ctx } = await requireApiAuth();
  if (error || !ctx) {
    return withCors(request, error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { documentId } = await params;
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
