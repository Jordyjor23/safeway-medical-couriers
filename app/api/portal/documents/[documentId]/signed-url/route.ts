import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { loadManagedDocumentForAccess } from "@/lib/documents/operations";
import { issueDocumentSignedUrl } from "@/lib/documents/signed-url-issue";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAuth } from "@/lib/rbac";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { error, ctx } = await requireApiAuth();
  if (error || !ctx) {
    return withCors(request, error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { documentId } = await params;
  const document = await loadManagedDocumentForAccess(documentId);
  const issued = issueDocumentSignedUrl({ actor: ctx, document });
  if ("error" in issued) {
    return withCors(request, NextResponse.json({ error: issued.error }, { status: issued.status }));
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "document.signed_url.issued",
    targetType: "document",
    targetId: documentId,
  });

  return withCors(request, NextResponse.json(issued));
}
