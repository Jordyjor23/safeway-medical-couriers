import { MANUAL_EXTRACTION_MESSAGE, isExtractionUnsupportedFormat } from "@/lib/documents/extraction/unsupported";
import { mapProviderDocumentType } from "@/lib/documents/extraction/map-type";
import { sanitizeExtractedText } from "@/lib/documents/extraction/privacy";
import type {
  DocumentExtractionInput,
  DocumentExtractionProvider,
  DocumentExtractionResult,
  ExtractedFieldDraft,
} from "@/lib/documents/extraction/types";

const AZURE_SUPPORTED = new Set(["application/pdf", "image/jpeg", "image/png", "image/tiff", "image/bmp"]);

function azureConfigured() {
  return Boolean(
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.trim() && process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.trim(),
  );
}

export function azureExtractionReady() {
  return azureConfigured();
}

/**
 * Azure AI Document Intelligence (formerly Form Recognizer).
 * Called only when DOCUMENT_EXTRACTION_PROVIDER=azure and both endpoint + key are set.
 * Documents are sent to Azure for analysis; do not enable until the customer accepts that transfer.
 */
export class AzureDocumentExtractionService implements DocumentExtractionProvider {
  readonly id = "azure";

  async extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult> {
    if (!azureConfigured()) {
      return {
        status: "OCR_DISABLED",
        provider: "noop",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
      };
    }
    const mime = (input.mimeType ?? "").toLowerCase();
    if (isExtractionUnsupportedFormat(input.mimeType, input.filename) || !AZURE_SUPPORTED.has(mime)) {
      return {
        status: "NOT_APPLICABLE",
        provider: "azure",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
        error: MANUAL_EXTRACTION_MESSAGE,
      };
    }
    if (!input.bytes?.length) {
      return {
        status: "FAILED",
        provider: "azure",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
        error: "The stored file could not be read for extraction.",
      };
    }

    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!.replace(/\/$/, "");
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!;
    const version = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION?.trim() || "2024-11-30";
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${version}`;
    const started = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": mime,
      },
      body: Buffer.from(input.bytes),
    });
    if (!started.ok) {
      return {
        status: "FAILED",
        provider: "azure",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
        error: "The extraction provider rejected this file.",
      };
    }
    const operation = started.headers.get("operation-location");
    if (!operation) {
      return {
        status: "FAILED",
        provider: "azure",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
        error: "The extraction provider did not return a result location.",
      };
    }

    const payload = await pollAzure(operation, key);
    if (!payload) {
      return {
        status: "FAILED",
        provider: "azure",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
        error: "The extraction provider timed out.",
      };
    }

    const text = sanitizeExtractedText(collectAzureText(payload));
    const detected = mapProviderDocumentType(guessTypeFromText(text));
    const fields = collectAzureFields(payload);
    return {
      status: fields.length ? (fields.length < 2 ? "PARTIAL" : "COMPLETED") : text ? "PARTIAL" : "FAILED",
      provider: "azure",
      extractedText: text,
      detectedDocumentType: detected,
      typeConfidence: detected ? 0.6 : 0,
      fields,
      extractedAt: new Date(),
    };
  }
}

async function pollAzure(url: string, key: string) {
  for (let i = 0; i < 12; i += 1) {
    const response = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": key } });
    if (!response.ok) return null;
    const body = (await response.json()) as { status?: string; analyzeResult?: unknown };
    if (body.status === "succeeded") return body.analyzeResult;
    if (body.status === "failed") return null;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

function collectAzureText(result: unknown) {
  const record = result as { content?: string; content?: string };
  if (typeof (result as { content?: string }).content === "string") return (result as { content: string }).content;
  return JSON.stringify(record).slice(0, 4000);
}

function guessTypeFromText(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("driver") && lower.includes("license")) return "drivers_license";
  if (lower.includes("certificate of liability") || lower.includes("certificate of insurance")) return "coi";
  if (lower.includes("business associate")) return "baa";
  if (lower.includes("proof of delivery")) return "proof_of_delivery";
  if (lower.includes("chain of custody")) return "chain_of_custody";
  return null;
}

function collectAzureFields(result: unknown): ExtractedFieldDraft[] {
  const keyValue = (result as { keyValuePairs?: { key?: { content?: string }; value?: { content?: string }; confidence?: number }[] })
    .keyValuePairs;
  if (!Array.isArray(keyValue)) return [];
  const out: ExtractedFieldDraft[] = [];
  for (const pair of keyValue) {
    const key = mapAzureKey(pair.key?.content ?? "");
    if (!key || !pair.value?.content) continue;
    const field = prepareExtractedField({
      key,
      rawValue: pair.value.content,
      confidence: typeof pair.confidence === "number" ? pair.confidence : 0.5,
    });
    if (field) out.push(field);
  }
  return out;
}

function mapAzureKey(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("expir")) return "expirationDate";
  if (lower.includes("effective")) return "effectiveDate";
  if (lower.includes("policy")) return "policyNumber";
  if (lower.includes("license") && lower.includes("number")) return "licenseNumber";
  if (lower.includes("name") && !lower.includes("file")) return "fullName";
  if (lower.includes("vin")) return "vin";
  if (lower.includes("carrier")) return "carrier";
  return null;
}
