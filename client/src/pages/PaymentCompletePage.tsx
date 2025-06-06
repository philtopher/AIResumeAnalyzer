import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, User, Settings, Loader2, AlertTriangle } from "lucide-react";
import { useUser } from "@/hooks/use-user";

type PaymentStatus = "loading" | "success" | "error" | "invalid";

export default function PaymentCompletePage() {
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [planType, setPlanType] = useState<"standard" | "pro">("standard");
  const [isUpgrade, setIsUpgrade] = useState<boolean>(false);
  const [location] = useLocation();
  const { refetch } = useUser();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          setStatus("invalid");
          return;
        }

        const response = await fetch(`/api/verify-payment?session_id=${sessionId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Payment verification failed');
        }

        const data = await response.json();

        if (data.status === 'success') {
          setPlanType(data.planType);
          setIsUpgrade(data.isUpgrade || false);
          setStatus("success");
          refetch(); // Refresh user data after successful payment

          try {
            const event = new Event('payment_complete');
            window.dispatchEvent(event);
          } catch (error) {
            console.error('Error tracking payment completion:', error);
          }
        } else {
          setStatus("error");
          setErrorMessage(data.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus("error");
        setErrorMessage('Unable to verify payment status');
      }
    };

    verifyPayment();
  }, [location, refetch]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <CardTitle>Verifying your payment...</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Please wait while we confirm your payment status.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error" || status === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl mb-2">Payment Verification Failed</CardTitle>
            <CardDescription className="text-lg text-red-600">
              {status === "invalid" 
                ? "Invalid payment session" 
                : errorMessage || "Unable to verify payment status"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              If you believe this is an error, please contact our support team.
            </p>
            <div className="flex justify-center">
              <Link href="/contact">
                <Button variant="outline">Contact Support</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl mb-2">
            {isUpgrade 
              ? `Upgraded to CV Transformer ${planType === 'pro' ? 'Pro' : 'Standard'}!`
              : `Welcome to CV Transformer ${planType === 'pro' ? 'Pro' : 'Standard'}!`}
          </CardTitle>
          <CardDescription className="text-lg">
            Your account has been successfully {isUpgrade ? 'upgraded' : 'activated'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">🎉 What's included in your {planType === 'pro' ? 'Pro' : 'Standard'} plan:</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ Advanced CV transformation with AI-powered insights</li>
              <li>✓ Download transformed CVs</li>
              <li>✓ Keyword optimization</li>
              {planType === 'pro' && (
                <>
                  <li>✓ Employer Competition Analysis</li>
                  <li>✓ Interviewer LinkedIn Insights</li>
                  <li>✓ Advanced CV scoring and analysis</li>
                  <li>✓ Priority support</li>
                </>
              )}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard">
              <Button className="w-full" variant="default">
                <FileText className="mr-2 h-4 w-4" />
                Start Transforming
              </Button>
            </Link>
            <Link href="/profile">
              <Button className="w-full" variant="outline">
                <User className="mr-2 h-4 w-4" />
                View Profile
              </Button>
            </Link>
            <Link href="/settings">
              <Button className="w-full" variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>

          {planType === 'standard' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Want more features? Upgrade to Pro for advanced analytics and interview insights
              </p>
              <Link href="/upgrade">
                <Button variant="outline">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground mt-6">
            <p>Need help getting started?</p>
            <Link href="/tutorial">
              <span className="text-primary hover:underline cursor-pointer">
                Check out our tutorial guide
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}