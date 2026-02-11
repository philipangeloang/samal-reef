"use client";

import { Building2 } from "lucide-react";

/**
 * Loading UI shown on /dashboard while smart redirect happens
 * Simple, clean animation that doesn't distract from fast redirect
 */
export function DashboardLoadingUI() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Logo */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
            <Building2 className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-white">Loading Dashboard</p>
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
