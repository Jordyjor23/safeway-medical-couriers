import { Clock3, Lock, MessageSquareText, ShieldCheck } from "lucide-react";
import { Container } from "@/components/Container";
import { trustItems } from "@/lib/site";

const icons = {
  reliable: ShieldCheck,
  secure: Lock,
  timely: Clock3,
  communication: MessageSquareText,
};

export function TrustBar() {
  return (
    <section className="border-b border-line bg-paper">
      <Container className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((item) => {
          const Icon = icons[item.key];
          return (
            <div key={item.key} className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ice text-medical">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-navy">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </div>
            </div>
          );
        })}
      </Container>
    </section>
  );
}
