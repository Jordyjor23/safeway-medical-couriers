import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const next = new URLSearchParams();
  if (token) next.set("token", token);
  redirect(`/reset-password?${next.toString()}`);
}
