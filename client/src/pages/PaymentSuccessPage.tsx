import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add a small delay to show the success message
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Redirect to dashboard after showing success message
    if (!loading) {
      const redirectTimer = setTimeout(() => {
        setLocation("/dashboard");
      }, 3000);

      return () => clearTimeout(redirectTimer);
    }
  }, [loading, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-center">
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Processing your payment...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-green-500">
                <CheckCircle className="h-6 w-6" />
                <span>Payment Successful!</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && (
            <div className="text-center space-y-4">
              <p>Thank you for upgrading to Pro! Your account has been successfully upgraded.</p>
              <p className="text-sm text-muted-foreground">
                You will receive a confirmation email shortly.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to your dashboard...
              </p>
              <div className="flex justify-center">
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
