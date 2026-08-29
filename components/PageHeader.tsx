import { Container } from "@/components/Container";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden bg-void text-mist">
      <div className="mkt-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(26,111,181,0.2),transparent_42%)]" />
      <Container className="relative py-16 sm:py-20 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-300">{eyebrow}</p>
        <h1 className="mt-4 max-w-[18ch] text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-mist-soft sm:text-lg">{description}</p>
      </Container>
    </section>
  );
}
