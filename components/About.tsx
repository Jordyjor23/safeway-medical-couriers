import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { site } from "@/lib/site";

export function About({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="about" className="section-anchor bg-ice py-20">
      <Container className={showHeading ? "grid items-start gap-12 lg:grid-cols-2" : ""}>
        {showHeading ? (
          <SectionHeading
            eyebrow="About"
            title="A Courier Partner Healthcare Organizations Can Depend On"
          />
        ) : null}
        <div className="space-y-5 text-base leading-relaxed text-muted">
          <p>
            {site.name} was built to give healthcare organizations in Columbus
            and Central Ohio a dependable, responsive, and professional
            transportation partner. We focus on the details that keep medical
            deliveries on schedule — clear handoffs, accountable drivers, and
            communication that does not disappear after pickup.
          </p>
          <p>
            Reliability, professionalism, and attention to detail sit at the
            center of every run. We treat time-sensitive healthcare logistics as
            a relationship, not a one-off drop: your routes, your receiving
            desks, and your urgency become part of how we work.
          </p>
          <p>
            Whether the need is a recurring laboratory circuit or an urgent
            same-day delivery, our team is organized to stay accountable from
            the moment a request is placed until the shipment is in the right
            hands.
          </p>
        </div>
      </Container>
    </section>
  );
}
