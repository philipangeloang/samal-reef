import Link from "next/link";
import { currencySymbol, currencyCode } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, FileText, PenTool, Download } from "lucide-react";
import { api } from "@/trpc/server";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

interface PurchaseSuccessPageProps {
  searchParams: Promise<{ session_id?: string; tx_hash?: string }>;
}

export default async function PurchaseSuccessPage({
  searchParams,
}: PurchaseSuccessPageProps) {
  const session = await auth();
  const { session_id, tx_hash } = await searchParams;

  // Get the specific ownership based on payment method
  let latestOwnership;

  if (tx_hash) {
    // DePay crypto payment - get ownership by transaction hash
    // Works for both authenticated and guest users
    latestOwnership = await api.purchase.getOwnershipByTxHash({ txHash: tx_hash });
  } else if (session_id) {
    // Stripe fiat payment - get ownership by session ID
    // Works for both authenticated and guest users
    latestOwnership = await api.purchase.getOwnershipByStripeSession({ sessionId: session_id });
  } else {
    // No payment identifier - fallback to most recent (requires auth)
    if (!session) {
      redirect("/auth/signin");
    }
    const ownerships = await api.purchase.getMyOwnerships();
    latestOwnership = ownerships[0];
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <CardTitle className="text-2xl text-white">
            Purchase Successful!
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Purchase Details */}
          {latestOwnership && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 font-semibold text-white">
                Your Ownership Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Unit Assigned:</span>
                  <span className="font-semibold text-white">
                    {latestOwnership.unit.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ownership:</span>
                  <span className="font-semibold text-white">
                    {latestOwnership.pricingTier.displayLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount Paid:</span>
                  <span className="font-semibold text-white">
                    {latestOwnership.currency && latestOwnership.currency !== currencyCode
                      ? `${parseFloat(latestOwnership.purchasePrice).toFixed(4)} ${latestOwnership.currency}`
                      : `${currencySymbol}${parseFloat(latestOwnership.purchasePrice).toLocaleString()}`
                    }
                  </span>
                </div>
                {latestOwnership.paymentMethod === "CRYPTO" && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="font-semibold text-white">
                      Crypto ({latestOwnership.currency})
                    </span>
                  </div>
                )}
                {tx_hash && (
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400">Blockchain Transaction:</span>
                    <a
                      href={`https://arbiscan.io/tx/${tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs font-mono text-blue-400 hover:text-blue-300"
                    >
                      {tx_hash}
                    </a>
                  </div>
                )}
                {session_id && (
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400">Payment ID:</span>
                    <span className="truncate text-xs font-mono text-gray-400">
                      {session_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MOA Signing Prompt */}
          {latestOwnership && session && (
            <div className={`rounded-lg border p-4 ${
              latestOwnership.isSigned
                ? "border-green-400/30 bg-green-400/10"
                : "border-cyan-400/30 bg-cyan-400/10"
            }`}>
              <div className="flex items-start gap-3">
                {latestOwnership.isSigned ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                ) : (
                  <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" />
                )}
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-white">
                    {latestOwnership.isSigned
                      ? "✅ MOA Signed & Secured"
                      : "📄 Next Step: Sign Your MOA"}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {latestOwnership.isSigned
                      ? `Your Memorandum of Agreement was signed on ${
                          latestOwnership.moaSignedAt
                            ? new Date(latestOwnership.moaSignedAt).toLocaleDateString()
                            : "N/A"
                        }. You can download it anytime from your dashboard.`
                      : "Complete your ownership by signing the Memorandum of Agreement. This legally binding document confirms your fractional ownership."}
                  </p>
                  <div className="flex gap-2">
                    {latestOwnership.isSigned ? (
                      latestOwnership.moaUrl && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-green-400/50 text-green-400 hover:bg-green-400/20"
                        >
                          <a
                            href={latestOwnership.moaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download MOA
                          </a>
                        </Button>
                      )
                    ) : (
                      <>
                        <Button
                          asChild
                          size="sm"
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                        >
                          <Link href={`/moa/sign/${latestOwnership.id}`}>
                            <PenTool className="mr-2 h-4 w-4" />
                            Sign MOA Now
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          <Link href="/dashboard/investor">Sign Later</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 font-semibold text-white">What&apos;s Next?</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>✓ Check your email for purchase confirmation</li>
              {!session && (
                <li>✓ Click the magic link in your email to access your dashboard</li>
              )}
              {session && (
                <li>✓ View your ownership in the investor dashboard</li>
              )}
              <li>✓ Start earning proportional rental income</li>
              <li>✓ Explore more investment opportunities</li>
            </ul>
          </div>

          {!session ? (
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4">
              <p className="text-center text-sm text-cyan-100">
                📧 <strong>Check your email!</strong><br />
                We&apos;ve sent you a magic link to access your investor dashboard and view your ownership details.
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400">
              Your ownership certificate and payment receipt have been sent to your
              email.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex gap-4">
          {session ? (
            <>
              <Button
                asChild
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
              >
                <Link href="/dashboard/investor">View Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/collections">Browse More</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Back to Home</Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
