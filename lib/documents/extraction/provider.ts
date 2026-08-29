import { AzureDocumentExtractionService, azureExtractionReady } from "@/lib/documents/extraction/azure";
import { NoopDocumentExtractionService } from "@/lib/documents/extraction/noop";
import { TestDocumentExtractionService } from "@/lib/documents/extraction/test-provider";
import type { DocumentExtractionProvider, DocumentExtractionService } from "@/lib/documents/extraction/types";

export function configuredExtractionProviderId() {
  return (process.env.DOCUMENT_EXTRACTION_PROVIDER ?? "").trim().toLowerCase();
}

export function isExtractionEnabled() {
  const id = configuredExtractionProviderId();
  if (!id || id === "noop" || id === "disabled") return false;
  if (id === "test") return process.env.NODE_ENV !== "production";
  if (id === "azure") return azureExtractionReady();
  return false;
}

export function documentExtractionService(): DocumentExtractionService {
  return resolveExtractionProvider();
}

export function resolveExtractionProvider(): DocumentExtractionProvider {
  const id = configuredExtractionProviderId();
  if (id === "test" && process.env.NODE_ENV !== "production") {
    return new TestDocumentExtractionService();
  }
  if (id === "azure" && azureExtractionReady()) {
    return new AzureDocumentExtractionService();
  }
  return new NoopDocumentExtractionService();
}
