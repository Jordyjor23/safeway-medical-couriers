export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{body}</p>
    </div>
  );
}
