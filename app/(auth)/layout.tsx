import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-navy">
      <header className="border-b border-white/10 bg-navy-deep">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <Link href="/" className="inline-flex rounded-lg bg-white px-2 py-1.5">
            <Image
              src="/safeway-logo.png"
              alt="Safeway Couriers"
              width={180}
              height={60}
              className="h-auto w-[140px]"
            />
          </Link>
          <Link href="/" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to site
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
