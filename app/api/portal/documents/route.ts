import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { processDocumentUpload } from "@/lib/documents/upload";
import { requireApiPermission } from "@/lib/rbac";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  const { error, ctx } = await requireApiPermission("documents.upload");
  if (error || !ctx) {
    if (error?.status === 401) return withCors(request, error);
    return withCors(request, NextResponse.json({ error: "Not found." }, { status: 404 }));
  }
  const formData = await request.formData();
  const result = await processDocumentUpload(ctx, formData);
  if ("duplicate" in result && result.duplicate) {
    return withCors(request, NextResponse.json(result, { status: 409 }));
  }
  if ("error" in result && result.error) {
    const status = result.error === "Not found." ? 404 : 400;
    return withCors(request, NextResponse.json({ error: result.error }, { status }));
  }
  return withCors(request, NextResponse.json(result, { status: 201 }));
}
