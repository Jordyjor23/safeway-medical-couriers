export function isDocumentAccessError(error: unknown) {
  return error instanceof Error && error.name === "DocumentAccessError";
}

export function notFoundResult() {
  return { error: "Not found." as const };
}
