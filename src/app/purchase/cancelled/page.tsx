import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function PurchaseCancelledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was not completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              No charges were made to your account. You can try again anytime.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-semibold">Need help?</p>
            <ul className="space-y-1">
              <li>• Check your payment details</li>
              <li>• Try a different payment method</li>
              <li>• Contact support if issues persist</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button asChild className="flex-1">
            <Link href="/collections">Browse Collections</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">Go Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
