"use client";

import Link from "next/link";

export default function ErrorPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-navy">Something went wrong</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted">
        The page could not be loaded. Try again, or return to the home page.
      </p>
      <Link href="/" className="mt-6 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white">
        Go home
      </Link>
    </main>
  );
}

