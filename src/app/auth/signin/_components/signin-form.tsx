"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Waves, Mail, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("resend", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error("Failed to send magic link. Please try again.");
        setIsLoading(false);
      } else {
        setEmailSent(true);
        toast.success("Check your email for a magic link!");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
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
              <h1 className="mb-2 text-3xl font-bold text-cyan-100">
                Welcome Back
              </h1>
              <p className="text-sm text-cyan-200/70">
                Sign in to access your ocean living investment
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                {error === "Configuration" && "There is a problem with the server configuration."}
                {error === "AccessDenied" && "You do not have permission to sign in."}
                {error === "Verification" && "The sign in link is no longer valid. Please request a new one."}
                {!["Configuration", "AccessDenied", "Verification"].includes(error) && "An error occurred during sign in."}
              </div>
            )}

            {/* Email Sent Success */}
            {emailSent ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20">
                  <Mail className="h-8 w-8 text-cyan-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-cyan-100">
                  Check Your Email
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-cyan-200/70">
                  We&apos;ve sent a magic link to <strong className="text-cyan-100">{email}</strong>.
                  Click the link in the email to sign in.
                </p>
                <p className="mb-6 text-xs text-cyan-200/60">
                  Didn&apos;t receive the email? Check your spam folder or try again.
                </p>
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  variant="outline"
                  className="border-cyan-400/30 text-cyan-200/80 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-100"
                >
                  Try Different Email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-cyan-100">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-cyan-50 placeholder:text-cyan-200/40 focus:border-cyan-400/60 focus:ring-cyan-400/20"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Magic Link...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Magic Link
                    </>
                  )}
                </Button>

                {/* Info */}
                <p className="text-center text-xs text-cyan-200/60">
                  We&apos;ll send you a magic link for a password-free sign in.
                </p>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-cyan-200/50">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-cyan-400/70 hover:text-cyan-400">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-cyan-400/70 hover:text-cyan-400">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
