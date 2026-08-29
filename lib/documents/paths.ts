export function documentBasePath(portal: "staff" | "operations") {
  return portal === "operations" ? "/operations/documents" : "/dashboard/documents";
}

export function documentDetailHref(portal: "staff" | "operations", documentId: string) {
  return `${documentBasePath(portal)}/${documentId}`;
}

export function documentReviewHref(portal: "staff" | "operations") {
  return `${documentBasePath(portal)}/review`;
}
