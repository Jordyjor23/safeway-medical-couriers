"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRolePermissions } from "@/app/(portal)/dashboard/roles/actions";

export function RolePermissionsForm({
  roleId,
  permissions,
  assigned,
}: {
  roleId: string;
  permissions: readonly string[];
  assigned: string[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const assignedSet = new Set(assigned);

  return (
    <form
      ref={formRef}
      className="mt-4"
      onChange={() => {
        setDirty(true);
        setMessage(null);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const form = formRef.current;
        if (!form || isPending) return;
        const formData = new FormData(form);
        setMessage(null);
        startTransition(async () => {
          try {
            const result = await saveRolePermissions(formData);
            if (result && "error" in result) {
              setMessage({ type: "error", text: result.error ?? "Permissions could not be saved." });
              return;
            }
            setDirty(false);
            setMessage({ type: "success", text: "Permissions saved successfully." });
            router.refresh();
          } catch {
            setMessage({
              type: "error",
              text: "Permissions could not be saved. No changes were applied.",
            });
          }
        });
      }}
    >
      <input type="hidden" name="roleId" value={roleId} />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {permissions.map((permission) => (
          <li key={permission}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="permission"
                value={permission}
                defaultChecked={assignedSet.has(permission)}
              />
              {permission}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !dirty}
          className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving…" : dirty ? "Save permissions" : "Saved"}
        </button>
        {message ? (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm font-medium ${message.type === "success" ? "text-green-700" : "text-red-700"}`}
          >
            {message.type === "success" ? "✓ " : ""}
            {message.text}
          </p>
        ) : dirty ? (
          <p className="text-sm text-muted">Unsaved changes</p>
        ) : null}
      </div>
    </form>
  );
}
