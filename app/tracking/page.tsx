import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { TrackingLookup } from "@/components/TrackingLookup";

export const metadata: Metadata = {
  title: "Tracking",
  description: "Track a Safeway Couriers medical shipment by ID.",
};

export default function TrackingPage() {
  return (
    <>
      <PageHero
        eyebrow="Tracking"
        title="See where the cooler is — not just that it left."
        description="Enter a Safeway tracking ID for pickup, transit, and delivery status. Demo IDs are included until this is wired to live dispatch."
      />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <TrackingLookup />
      </div>
    </>
  );
}
