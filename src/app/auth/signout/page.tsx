"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Waves, LogOut, Loader2, ArrowLeft, Home } from "lucide-react";

export default function SignOutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({ redirect: false });
      setSignedOut(true);
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-20">
        <img
          src="https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
          alt="Background"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1929] via-[#0a1929]/90 to-[#0a1929]" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-cyan-300/80 transition-colors hover:text-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0d1f31]/60 p-8 backdrop-blur-sm">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
                <Waves className="h-8 w-8 text-white" />
              </div>

              {signedOut ? (
                <>
                  <h1 className="mb-2 text-3xl font-bold text-cyan-100">
                    See You Soon
                  </h1>
                  <p className="text-sm text-cyan-200/70">
                    You&apos;ve been successfully signed out
                  </p>
                </>
              ) : (
                <>
                  <h1 className="mb-2 text-3xl font-bold text-cyan-100">
                    Sign Out
                  </h1>
                  <p className="text-sm text-cyan-200/70">
                    Are you sure you want to sign out?
                  </p>
                </>
              )}
            </div>

            {/* Content */}
            {signedOut ? (
              <div className="space-y-6 text-center">
                {/* Success Message */}
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-6">
                  <p className="mb-2 text-sm font-medium text-cyan-100">
                    You&apos;ve been signed out successfully
                  </p>
                  <p className="text-xs text-cyan-200/60">
                    Thank you for being part of our community
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push("/")}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to Home
                  </Button>

                  <Button
                    onClick={() => router.push("/auth/signin")}
                    variant="outline"
                    className="w-full border-cyan-400/30 text-cyan-200/80 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-100"
                  >
                    Sign In Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Info */}
                {session?.user && (
                  <div className="rounded-lg border border-cyan-400/20 bg-[#0a1929]/50 p-4">
                    <p className="mb-1 text-sm text-cyan-200/70">
                      Signed in as:
                    </p>
                    <p className="font-medium text-cyan-100">
                      {session.user.email}
                    </p>
                  </div>
                )}

                {/* Info Box */}
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
                  <p className="text-xs text-cyan-200/70">
                    Signing out will end your current session. You&apos;ll need to sign in again to access your dashboard.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing Out...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Yes, Sign Me Out
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => router.back()}
                    variant="outline"
                    disabled={isLoading}
                    className="w-full border-cyan-400/30 text-cyan-200/80 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-100"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-cyan-200/50">
            Need help?{" "}
            <Link
              href="https://www.facebook.com/reefresortofficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400/70 hover:text-cyan-400"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
