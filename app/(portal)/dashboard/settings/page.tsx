import type { Metadata } from "next";
import {
  updateCareersSettings,
  updateLegalDocument,
  updateNotificationSettings,
} from "@/app/(portal)/dashboard/settings/actions";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { site } from "@/lib/site";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Settings" };

const fieldClass = "mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm";

type CareersSettings = {
  heroHeadline: string;
  heroBody: string;
  primaryCta: string;
  secondaryCta: string;
  accommodationEmail: string;
  voluntaryEeoEnabled: boolean;
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePermission("settings.manage");
  const params = await searchParams;
  const [legal, careers, notifications, retention] = await Promise.all([
    prisma.legalDocument.findMany({
      where: { isCurrent: true },
      orderBy: { slug: "asc" },
    }),
    getSetting<CareersSettings>("careers", {
      heroHeadline: "Deliver More Than Packages. Deliver With Purpose.",
      heroBody: "",
      primaryCta: "View Open Positions",
      secondaryCta: "Join Our Courier Network",
      accommodationEmail: site.email,
      voluntaryEeoEnabled: false,
    }),
    getSetting<{ contractExpirationDays: number[] }>("notifications", {
      contractExpirationDays: [90, 60, 30, 14, 7],
    }),
    getSetting<{ applicationRetentionDays: number }>("retention", {
      applicationRetentionDays: 730,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-navy">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Edit careers copy, alert windows, and legal notices. Counsel should review legal text
          before production hiring use. Software does not guarantee legal compliance.
        </p>
        {params.saved ? (
          <p className="mt-3 rounded-xl border border-medical/30 bg-white px-4 py-3 text-sm text-navy">
            Settings saved.
          </p>
        ) : null}
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-xl font-semibold text-navy">Careers page</h2>
        <form action={updateCareersSettings} className="mt-4 grid gap-3">
          <label className="text-sm font-semibold text-navy">
            Headline
            <input name="heroHeadline" defaultValue={careers.heroHeadline} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Intro
            <textarea name="heroBody" rows={4} defaultValue={careers.heroBody} className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              Primary button
              <input name="primaryCta" defaultValue={careers.primaryCta} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Secondary button
              <input name="secondaryCta" defaultValue={careers.secondaryCta} className={fieldClass} />
            </label>
          </div>
          <label className="text-sm font-semibold text-navy">
            Accommodation email
            <input
              name="accommodationEmail"
              type="email"
              defaultValue={careers.accommodationEmail}
              className={fieldClass}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              name="voluntaryEeoEnabled"
              type="checkbox"
              defaultChecked={careers.voluntaryEeoEnabled}
            />
            Show voluntary EEO self-identification (disabled by default)
          </label>
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
            Save careers settings
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-xl font-semibold text-navy">Alerts and retention</h2>
        <form action={updateNotificationSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-navy">
            Contract expiration reminder days
            <input
              name="contractExpirationDays"
              defaultValue={notifications.contractExpirationDays.join(", ")}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              Comma-separated, for example 90, 60, 30, 14, 7
            </span>
          </label>
          <label className="text-sm font-semibold text-navy">
            Application retention days
            <input
              name="applicationRetentionDays"
              type="number"
              min={1}
              defaultValue={retention.applicationRetentionDays}
              className={fieldClass}
            />
          </label>
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
            Save alert settings
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-navy">Legal notices</h2>
        <p className="mt-2 text-sm text-muted">
          Saving creates a new version. The public Careers pages use the current version.
        </p>
        <ul className="mt-4 space-y-4">
          {legal.map((doc) => (
            <li key={doc.id} className="rounded-2xl border border-line bg-paper p-5">
              <form action={updateLegalDocument} className="grid gap-3">
                <input type="hidden" name="slug" value={doc.slug} />
                <label className="text-sm font-semibold text-navy">
                  Title
                  <input name="title" defaultValue={doc.title} className={fieldClass} />
                </label>
                <p className="text-xs text-muted">
                  {doc.slug} · current version {doc.version}
                </p>
                <label className="text-sm font-semibold text-navy">
                  Body
                  <textarea name="body" rows={8} defaultValue={doc.body} className={fieldClass} />
                </label>
                <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
                  Save new version
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
