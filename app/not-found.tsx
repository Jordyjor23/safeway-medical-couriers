import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal">
        404
      </p>
      <h1 className="display mt-3 text-4xl text-navy">That page is not on this route.</h1>
      <p className="mt-4 text-muted">
        The address may have changed. Return home or call dispatch if you need a courier now.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-teal"
      >
        Back to home
      </Link>
    </div>
  );
}
