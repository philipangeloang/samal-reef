import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { MoaSigningForm } from "./_components/moa-signing-form";

interface MoaSigningPageProps {
  params: Promise<{
    ownershipId: string;
  }>;
}

export default async function MoaSigningPage({ params }: MoaSigningPageProps) {
  const session = await auth();

  // Require authentication
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { ownershipId: ownershipIdParam } = await params;
  const ownershipId = parseInt(ownershipIdParam, 10);

  if (isNaN(ownershipId)) {
    redirect("/dashboard/investor");
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,206,209,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(64,224,208,0.1),transparent_70%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="mb-2 bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
            Sign Your Memorandum of Agreement
          </h1>
          <p className="text-cyan-100/70">
            Please review and sign your ownership agreement to complete your purchase.
          </p>
        </div>

        <MoaSigningForm ownershipId={ownershipId} />
      </div>
    </main>
  );
}
