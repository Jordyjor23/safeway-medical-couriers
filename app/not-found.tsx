import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Container } from "@/components/Container";

export default function NotFound() {
  return (
    <div className="marketing-site flex min-h-screen flex-1 flex-col">
      <Navbar />
      <main className="flex-1">
        <Container className="py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">404</p>
          <h1 className="mt-3 text-4xl font-semibold text-mist">Page not found</h1>
          <p className="mt-4 text-mist-soft">
            That address is not on this site. Return home or request a quote.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/" className="mkt-btn mkt-btn-primary">
              Back to home
            </Link>
            <Link href="/quote" className="mkt-btn mkt-btn-secondary">
              Request a Quote
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
