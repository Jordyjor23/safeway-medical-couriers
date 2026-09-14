import type { Metadata } from "next";
import { ApplicantRegisterForm } from "@/components/auth/ApplicantRegisterForm";

export const metadata: Metadata = {
  title: "Create applicant account",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Careers</p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Create an applicant account</h1>
      <p className="mt-2 text-sm text-muted">
        Save and resume applications from any device, upload required documents, and check status.
        This is not an employee or staff login.
      </p>
      <ApplicantRegisterForm />
    </div>
  );
}
