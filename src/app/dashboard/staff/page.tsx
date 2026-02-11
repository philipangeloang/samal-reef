import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/server/auth";
import { Building2, CalendarDays, Clock, CheckCircle, XCircle } from "lucide-react";

export default async function StaffDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Only allow STAFF or ADMIN role
  if (session.user.role !== "STAFF" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Staff Dashboard
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Create ownership and booking entries for admin approval
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Ownership Card */}
        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-blue-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all group-hover:bg-blue-400/20" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-400/10 p-3">
                <Building2 className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Add Ownership</CardTitle>
                <CardDescription className="text-cyan-100/60">
                  Create a new ownership record
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="mb-4 text-sm text-cyan-100/70">
              Enter investor details, select collection and pricing tier.
              Entry will be submitted for admin approval.
            </p>
            <Button asChild className="w-full bg-blue-500 hover:bg-blue-600">
              <Link href="/dashboard/staff/add-ownership">
                <Building2 className="mr-2 h-4 w-4" />
                Add Ownership Entry
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Add Booking Card */}
        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-green-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-400/10 p-3">
                <CalendarDays className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-white">Add Booking</CardTitle>
                <CardDescription className="text-cyan-100/60">
                  Create a new booking record
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="mb-4 text-sm text-cyan-100/70">
              Enter guest details, select dates and collection.
              Entry will be submitted for admin approval.
            </p>
            <Button asChild className="w-full bg-green-500 hover:bg-green-600">
              <Link href="/dashboard/staff/add-booking">
                <CalendarDays className="mr-2 h-4 w-4" />
                Add Booking Entry
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Status Legend */}
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">How It Works</CardTitle>
          <CardDescription className="text-cyan-100/60">
            Understanding the approval workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-400/10 p-2">
                <Clock className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-white">Pending Approval</p>
                <p className="text-sm text-cyan-100/60">
                  Entry submitted, waiting for admin review
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-400/10 p-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium text-white">Approved</p>
                <p className="text-sm text-cyan-100/60">
                  Admin approved - ownership/booking created
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-400/10 p-2">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-white">Rejected</p>
                <p className="text-sm text-cyan-100/60">
                  Admin rejected with reason provided
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Submissions Link */}
      <div className="flex justify-center">
        <Button
          asChild
          variant="outline"
          className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
        >
          <Link href="/dashboard/staff/submissions">
            View My Submissions
          </Link>
        </Button>
      </div>
    </div>
  );
}
