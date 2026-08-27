"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

export function MfaSetup({ enabled }: { enabled: boolean }) {
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (enabled && !totpURI) {
    return (
      <p className="mt-4 text-sm text-muted">
        Multi-factor authentication is enabled on this account. Keep backup codes in a secure place.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {!totpURI ? (
        <form
          className="max-w-md space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            const { data, error: enableError } = await authClient.twoFactor.enable({
              password,
            });
            if (enableError || !data || data.method !== "totp") {
              setError("Could not start MFA setup. Confirm your password and try again.");
              return;
            }
            setTotpURI(data.totpURI);
            setBackupCodes(data.backupCodes ?? []);
          }}
        >
          <label className="block text-sm font-semibold text-navy">
            Confirm password to enable MFA
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-medical"
          >
            Generate authenticator setup
          </button>
        </form>
      ) : (
        <div className="max-w-lg space-y-4">
          <p className="text-sm text-muted">
            Add this account in your authenticator app using the URI below, then enter a 6-digit
            code to finish setup.
          </p>
          <code className="block break-all rounded-lg bg-ice p-3 text-xs text-navy">{totpURI}</code>
          {backupCodes.length ? (
            <div>
              <p className="text-sm font-semibold text-navy">Backup codes</p>
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {backupCodes.map((item) => (
                  <li key={item} className="rounded bg-ice px-2 py-1 font-mono">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code });
              if (verifyError) {
                setError("That code was not accepted.");
                return;
              }
              setMessage("MFA is now enabled.");
            }}
          >
            <label className="block text-sm font-semibold text-navy">
              Authenticator code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className={fieldClass}
                required
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-medical px-5 py-2.5 text-sm font-semibold text-white hover:bg-medical-bright"
            >
              Verify and enable
            </button>
          </form>
        </div>
      )}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-medical">{message}</p> : null}
    </div>
  );
}
