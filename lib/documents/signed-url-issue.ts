import { canAccessManagedDocument, type DocumentActor } from "@/lib/documents/access";
import type { DocumentAccessRecord } from "@/lib/documents/access";
import { createDocumentAccessToken, documentSignedFilePath } from "@/lib/documents/signed-url";

export function issueDocumentSignedUrl(args: {
  actor: DocumentActor | null;
  document: DocumentAccessRecord | null;
}) {
  if (!args.actor) return { error: "Unauthorized" as const, status: 401 as const };
  if (!args.document || !canAccessManagedDocument(args.actor, args.document, "download")) {
    return { error: "Not found." as const, status: 404 as const };
  }
  const token = createDocumentAccessToken({
    documentId: args.document.id,
    userId: args.actor.user.id,
    action: "download",
  });
  if (!token) return { error: "Not found." as const, status: 404 as const };
  return { url: documentSignedFilePath(args.document.id, token), expiresIn: 60 };
}
