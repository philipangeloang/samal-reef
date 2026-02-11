import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";

interface BookingCancelledPageProps {
  searchParams: Promise<{
    booking_id?: string;
  }>;
}

export default async function BookingCancelledPage({
  searchParams,
}: BookingCancelledPageProps) {
  const { booking_id } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#0f2435] p-4">
      <Card className="w-full max-w-md border-cyan-400/30 bg-[#0d1f31]/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <XCircle className="h-10 w-10 text-amber-400" />
          </div>
          <CardTitle className="text-2xl text-white">
            Payment Cancelled
          </CardTitle>
          <CardDescription className="text-cyan-100/70">
            Your booking was not completed
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="text-center text-sm text-cyan-100/70">
              You cancelled the payment process. Your booking has not been
              confirmed and no charges have been made.
            </p>
          </div>

          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
            <h3 className="mb-2 font-semibold text-white">Need Help?</h3>
            <p className="text-sm text-cyan-100/70">
              If you experienced any issues during checkout or have questions
              about booking, please contact our support team.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {booking_id ? (
            <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
              <Link href={`/book`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>
          ) : (
            <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10">
            <Link href="/">Browse Properties</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
