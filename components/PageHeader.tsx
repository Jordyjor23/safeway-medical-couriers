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
    <section className="bg-navy text-white">
      <Container className="py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
          {description}
        </p>
      </Container>
    </section>
  );
}
