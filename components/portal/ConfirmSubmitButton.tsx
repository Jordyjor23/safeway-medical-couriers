"use client";

export function ConfirmSubmitButton({
  label,
  confirmText,
  className = "rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-700",
}: {
  label: string;
  confirmText: string;
  className?: string;
}) {
  return <button type="submit" className={className} onClick={(event) => { if (!window.confirm(confirmText)) event.preventDefault(); }}>{label}</button>;
}
