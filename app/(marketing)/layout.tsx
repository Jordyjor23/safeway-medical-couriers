import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-site flex min-h-screen flex-1 flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
