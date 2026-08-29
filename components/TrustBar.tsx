import { Clock3, Lock, MessageSquareText, ShieldCheck } from "lucide-react";
import { Container } from "@/components/Container";
import { Reveal } from "@/components/marketing/Reveal";
import { trustItems } from "@/lib/site";

const icons = {
  reliable: ShieldCheck,
  secure: Lock,
  timely: Clock3,
  communication: MessageSquareText,
};

export function TrustBar() {
  return (
    <section className="border-b border-white/10 bg-graphite">
      <Container className="grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((item, index) => {
          const Icon = icons[item.key];
          return (
            <Reveal key={item.key} delay={index * 70}>
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-medical/30 bg-medical/10 text-medical-bright">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-mist">{item.title}</p>
                  <p className="mt-1 text-sm text-mist-soft">{item.body}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </Container>
    </section>
  );
}
