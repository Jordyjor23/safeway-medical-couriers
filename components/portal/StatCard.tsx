import Link from "next/link";

export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block transition hover:border-medical">
      {content}
    </Link>
  );
}
