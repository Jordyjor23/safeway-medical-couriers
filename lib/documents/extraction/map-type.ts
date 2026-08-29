import type { DocumentTypeKey } from "@/lib/documents/types";
import { isDocumentType } from "@/lib/documents/catalog";

const PROVIDER_TYPE_MAP: Record<string, DocumentTypeKey> = {
  drivers_license: "DRIVERS_LICENSE",
  driver_license: "DRIVERS_LICENSE",
  driverlicense: "DRIVERS_LICENSE",
  idDocument: "DRIVERS_LICENSE",
  us_driver_license: "DRIVERS_LICENSE",
  state_id: "STATE_ID",
  auto_insurance: "AUTO_INSURANCE",
  vehicle_registration: "VEHICLE_REGISTRATION",
  registration: "VEHICLE_REGISTRATION",
  hipaa: "HIPAA_TRAINING",
  bloodborne: "BLOODBORNE_PATHOGENS",
  hazmat: "HAZMAT_HMR_TRAINING",
  hmr: "HAZMAT_HMR_TRAINING",
  certificate_of_liability_insurance: "BUSINESS_INSURANCE_COI",
  certificate_of_insurance: "BUSINESS_INSURANCE_COI",
  coi: "BUSINESS_INSURANCE_COI",
  general_liability: "GENERAL_LIABILITY",
  customer_contract: "CUSTOMER_CONTRACT",
  business_associate_agreement: "BAA",
  baa: "BAA",
  rate_sheet: "RATE_SHEET",
  statement_of_work: "STATEMENT_OF_WORK",
  sow: "STATEMENT_OF_WORK",
  proof_of_delivery: "PROOF_OF_DELIVERY",
  pod: "PROOF_OF_DELIVERY",
  chain_of_custody: "CHAIN_OF_CUSTODY",
  temperature_log: "TEMPERATURE_LOG",
  commercial_auto: "COMMERCIAL_AUTO_INSURANCE",
};

export function mapProviderDocumentType(raw: string | null | undefined): DocumentTypeKey | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (isDocumentType(trimmed)) return trimmed;
  const key = trimmed.replace(/[\s-]+/g, "_").toLowerCase();
  if (PROVIDER_TYPE_MAP[key]) return PROVIDER_TYPE_MAP[key];
  for (const [pattern, type] of Object.entries(PROVIDER_TYPE_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return type;
  }
  return null;
}
