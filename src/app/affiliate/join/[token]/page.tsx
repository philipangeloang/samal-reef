"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Waves,
  CheckCircle2,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
} from "lucide-react";

export default function AffiliateJoinPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasAutoAccepted, setHasAutoAccepted] = useState(false);

  const token = params.token as string;

  // Check if user already has affiliate profile
  const { data: profiles } = api.user.getMyProfiles.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  // Redirect to dashboard if user is already an affiliate
  // Prevents stale callbackUrl redirects after invitation is already accepted
  useEffect(() => {
    if (status === "authenticated" && profiles?.hasAffiliateProfile) {
      router.replace("/dashboard/affiliate");
    }
  }, [profiles, status, router]);

  const acceptMutation = api.affiliate.acceptInvitation.useMutation({
    onSuccess: async () => {
      // Refresh the session to get updated role
      await update();
      // Redirect to affiliate dashboard
      router.push("/dashboard/affiliate");
    },
    onError: (error) => {
      alert(error.message);
      setIsAccepting(false);
      setHasAutoAccepted(false);
    },
  });

  // Destructure stable mutation states for useEffect dependencies
  // This prevents infinite loops by avoiding mutation object reference changes
  const { isPending, isSuccess, isError, mutate: acceptInvite } = acceptMutation;

  // Auto-accept invitation after sign-in (Option A flow)
  useEffect(() => {
    if (
      status === "authenticated" &&
      !profiles?.hasAffiliateProfile &&
      !hasAutoAccepted &&
      !isPending &&
      !isSuccess &&
      !isError  // Prevent retry attempts on error
    ) {
      setHasAutoAccepted(true);
      setIsAccepting(true);
      acceptInvite({ token });
    }
  }, [status, profiles, hasAutoAccepted, isPending, isSuccess, isError, acceptInvite, token]);

  const handleAccept = () => {
    if (!session?.user) {
      // Redirect to sign in with return URL
      window.location.href = `/auth/signin?callbackUrl=/affiliate/join/${token}`;
      return;
    }

    setIsAccepting(true);
    acceptMutation.mutate({ token });
  };

  if (status === "loading" || (status === "authenticated" && isAccepting)) {
    return (
      <main className="relative min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
        {/* Background Effects */}
        <div className="fixed inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,206,209,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(64,224,208,0.1),transparent_70%)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg">
            {/* Loading Card */}
            <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/95 to-[#0a1929]/95 p-12 shadow-2xl backdrop-blur-sm">
              {/* Animated Wave Icon */}
              <div className="mb-8 flex justify-center">
                <div className="relative">
                  {/* Pulsing Background Circles */}
                  <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                  <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/10" />

                  {/* Icon Container */}
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                    <Waves className="h-12 w-12 animate-pulse text-cyan-400" />
                  </div>
                </div>
              </div>

              {/* Status Text */}
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold text-cyan-100">
                  {status === "loading" ? "Loading Your Invitation" : "Processing Your Request"}
                </h2>

                <p className="text-lg text-cyan-100/70">
                  {status === "loading"
                    ? "Please wait while we verify your invitation..."
                    : "Accepting your affiliate invitation..."}
                </p>

                {/* Loading Spinner */}
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>

                {/* Progress Steps */}
                {status === "authenticated" && isAccepting && (
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3">
                      <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                      <span className="text-sm text-cyan-100">Verifying invitation token</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3">
                      <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                      <span className="text-sm text-cyan-100">Activating affiliate account</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 opacity-50">
                      <div className="h-5 w-5 rounded-full border-2 border-cyan-400/30" />
                      <span className="text-sm text-cyan-100/60">Redirecting to dashboard</span>
                    </div>
                  </div>
                )}

                {/* Loading Message */}
                <div className="mt-8 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
                  <p className="text-xs text-cyan-100/60">
                    {status === "loading"
                      ? "This will only take a moment..."
                      : "Setting up your affiliate account and preparing your dashboard..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-cyan-100/40">
                Please do not close this window
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,206,209,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(64,224,208,0.1),transparent_70%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Invitation Card */}
          <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/95 to-[#0a1929]/95 shadow-2xl backdrop-blur-sm">
            {/* Header */}
            <div className="border-b border-cyan-400/20 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-400/40 bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
                  <Waves className="h-8 w-8 text-cyan-400" />
                </div>
              </div>
              <h1 className="mb-2 text-3xl font-bold text-cyan-100">
                You&apos;re Invited!
              </h1>
              <p className="text-cyan-100/70">
                Join the Reef Resort Affiliate Program
              </p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Benefits Section */}
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-cyan-100">
                  <TrendingUp className="h-5 w-5 text-cyan-400" />
                  Program Benefits
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20">
                      <DollarSign className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium text-cyan-100">Earn Commissions</p>
                      <p className="text-xs text-cyan-100/60">On every referred sale</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20">
                      <Users className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium text-cyan-100">Unique Tracking</p>
                      <p className="text-xs text-cyan-100/60">Personal referral links</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20">
                      <TrendingUp className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium text-cyan-100">Real-time Analytics</p>
                      <p className="text-xs text-cyan-100/60">Track your earnings</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium text-cyan-100">Passive Income</p>
                      <p className="text-xs text-cyan-100/60">Earn while you sleep</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="rounded-lg border border-cyan-400/20 bg-[#0a1929]/50 p-4">
                <p className="text-center text-sm text-cyan-100/80">
                  {session ? (
                    <>
                      Click <strong className="text-cyan-300">Accept Invitation</strong> below to become an affiliate partner and start earning commissions.
                    </>
                  ) : (
                    <>
                      Click <strong className="text-cyan-300">Sign In to Accept</strong> below to automatically join the program after signing in.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-cyan-400/20 bg-[#0a1929]/30 p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting || acceptMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
                >
                  {!session ? "Sign In to Accept" : "Accept Invitation"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1 border-cyan-400/30 text-cyan-200/80 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-100"
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-cyan-100/50">
              By accepting, you agree to our affiliate program terms and conditions
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
