"use client";

import { useState } from "react";
import {
  issueTemporaryPassword,
  resendActivation,
  sendPasswordReset,
  setAccountStatus,
  terminateUserAccess,
} from "@/app/(portal)/dashboard/users/actions";

export function UserAccountActions({
  userId,
  status,
  isSelf,
}: {
  userId: string;
  status: string;
  isSelf: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  if (isSelf) return <p className="text-sm text-muted">This is your account.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form
          action={async (formData) => {
            const result = await sendPasswordReset(formData);
            setMessage(result && "error" in result && result.error ? result.error : "Password reset email requested.");
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
            Send password reset
          </button>
        </form>
        <form
          action={async (formData) => {
            const result = await issueTemporaryPassword(formData);
            if (result && "temporaryPassword" in result) {
              setMessage(`Temporary password (copy now): ${result.temporaryPassword}`);
            } else if (result && "error" in result) {
              setMessage(result.error);
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
            New temporary password
          </button>
        </form>
        <form
          action={async (formData) => {
            const result = await resendActivation(formData);
            if (result && "error" in result && result.error) {
              setMessage(result.error);
            } else if (result && "emailSent" in result && result.emailSent) {
              setMessage("Activation email sent.");
            } else if (result && "warning" in result && result.warning) {
              setMessage(result.warning);
            } else {
              setMessage("Activation email could not be sent. Try again from User Management.");
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
            Resend activation email
          </button>
        </form>
        <form action={setAccountStatus}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value={status === "LOCKED" ? "ACTIVE" : "LOCKED"} />
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
            {status === "LOCKED" ? "Unlock" : "Lock"}
          </button>
        </form>
        <form action={setAccountStatus}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value={status === "SUSPENDED" || status === "INACTIVE" ? "ACTIVE" : "SUSPENDED"} />
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
            {status === "ACTIVE" || status === "PENDING_ACTIVATION" ? "Disable" : "Reactivate"}
          </button>
        </form>
        <form action={terminateUserAccess}>
          <input type="hidden" name="userId" value={userId} />
          <button className="rounded-full bg-red-800 px-3 py-1.5 text-xs font-semibold text-white">
            Terminate access
          </button>
        </form>
      </div>
      {message ? <p className="break-all text-sm text-navy">{message}</p> : null}
    </div>
  );
}
