import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get session_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (!sessionId) {
          setError('Invalid payment session');
          setLoading(false);
          return;
        }

        // Verify the payment with our backend
        const response = await fetch(`/api/verify-payment?session_id=${sessionId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to verify payment');
        }

        // Show success message for 2 seconds
        setTimeout(() => {
          setLoading(false);
        }, 2000);

        // Then redirect to dashboard
        setTimeout(() => {
          setLocation("/dashboard");
        }, 5000);
      } catch (err) {
        console.error('Payment verification error:', err);
        setError('Failed to verify payment status');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [setLocation]);

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
            ) : error ? (
              <div className="text-red-500">
                {error}
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
          {!loading && !error && (
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
          {error && (
            <div className="flex justify-center">
              <Link href="/features">
                <Button variant="secondary">Back to Features</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}