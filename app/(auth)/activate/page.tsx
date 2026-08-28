import { redirect } from "next/navigation";

export default async function ActivateRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  redirect(`/activate-account${query}`);
}
