import { secretsEqual } from "@/lib/secrets";

export const OWNER_BOOTSTRAP_DISABLED_MESSAGE = "Public registration is disabled.";
export const OWNER_BOOTSTRAP_ALREADY_PROVISIONED_MESSAGE =
  "Owner bootstrap is disabled because an owner account already exists.";

export function ownerSetupIsAvailable(args: {
  ownerCount: number;
  setupSecretConfigured: boolean;
}) {
  return args.ownerCount === 0 && args.setupSecretConfigured;
}

export function allowOwnerBootstrapSignup(args: {
  setupSecret: string;
  setupHeader: string;
  ownerCount: number;
}): { ok: true } | { ok: false; message: string } {
  if (args.ownerCount > 0) {
    return { ok: false, message: OWNER_BOOTSTRAP_ALREADY_PROVISIONED_MESSAGE };
  }
  if (!args.setupSecret || !secretsEqual(args.setupSecret, args.setupHeader)) {
    return { ok: false, message: OWNER_BOOTSTRAP_DISABLED_MESSAGE };
  }
  return { ok: true };
}
