import { Suspense } from "react";
import { SignInForm } from "./_components/signin-form";

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoadingFallback />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInLoadingFallback() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="text-center text-cyan-300">Loading...</div>
      </div>
    </div>
  );
}
