import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Container } from "@/components/Container";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Container className="py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-medical">
            404
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-navy">Page not found</h1>
          <p className="mt-4 text-muted">
            That address is not on this site. Return home or request a quote.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical"
            >
              Back to home
            </Link>
            <Link
              href="/quote"
              className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-navy"
            >
              Request a Quote
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
