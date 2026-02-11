import Link from "next/link";
import { ArrowLeft, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,206,209,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(64,224,208,0.1),transparent_70%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
            <ImageOff className="h-12 w-12 text-cyan-300" />
          </div>

          {/* Message */}
          <h1 className="mb-3 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
            Gallery Not Found
          </h1>
          <p className="mb-8 text-cyan-100/70">
            The collection you&apos;re looking for doesn&apos;t exist or
            hasn&apos;t been created yet.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Available Collections */}
          <div className="mt-12 rounded-xl border border-cyan-400/20 bg-[#0d1f31]/40 p-6 backdrop-blur-sm">
            <p className="mb-3 text-sm font-medium text-cyan-300">
              Available Galleries:
            </p>
            <Link
              href="/gallery/glamphouse"
              className="inline-block rounded-lg border border-cyan-400/30 bg-[#0a1929]/50 px-4 py-2 text-sm text-cyan-100 transition-colors hover:border-cyan-400/50 hover:bg-[#0a1929]/70"
            >
              Glamp House Gallery
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
