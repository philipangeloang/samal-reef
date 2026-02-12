import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Home, Mail, CheckCircle, MessageCircle } from "lucide-react";
import { siteConfig } from "@/site.config";

export default function ManualPaymentSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <Card className="w-full max-w-md border-cyan-500/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20">
            <Clock className="h-10 w-10 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl text-white">
            Payment Under Review
          </CardTitle>
          <CardDescription className="text-cyan-100/70">
            Your proof of payment has been submitted successfully
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Info */}
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" />
              <div>
                <p className="font-medium text-cyan-100">
                  Check your email
                </p>
                <p className="mt-1 text-sm text-cyan-100/70">
                  We&apos;ve sent you a confirmation email with your submission details.
                </p>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">What happens next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                  1
                </div>
                <div>
                  <p className="text-sm text-cyan-100">Our team reviews your payment</p>
                  <p className="text-xs text-gray-400">Usually within 24-48 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                  2
                </div>
                <div>
                  <p className="text-sm text-cyan-100">You receive an approval email</p>
                  <p className="text-xs text-gray-400">With your unit assignment details</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                  3
                </div>
                <div>
                  <p className="text-sm text-cyan-100">Sign your Memorandum of Agreement</p>
                  <p className="text-xs text-gray-400">Complete your investment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Success Note */}
          <div className="flex items-start gap-3 rounded-lg bg-green-500/10 p-4 border border-green-500/20">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
            <p className="text-sm text-green-100">
              Your reference code and submission have been recorded. You don&apos;t need to take any further action.
            </p>
          </div>

          {/* Contact Us */}
          <div className="flex items-start gap-3 rounded-lg bg-cyan-500/10 p-4 border border-cyan-500/20">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-cyan-100">Need help?</p>
              <p className="text-xs text-cyan-100/70">
                For queries or follow-ups,{" "}
                <a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 underline hover:text-cyan-300"
                >
                  contact us on Facebook
                </a>
                .
              </p>
            </div>
          </div>

          {/* Back to Home Button */}
          <Link href="/" className="block">
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
