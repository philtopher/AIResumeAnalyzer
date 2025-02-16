import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect, useLocation, useSearch } from "wouter";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UpgradePlanPage() {
  const { user, isLoading: userLoading } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { toast } = useToast();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentStatus = params.get('payment');
  const paymentUserId = params.get('userId');

  useEffect(() => {
    setVerificationError(null);

    // Always verify if we have payment success parameters
    if (paymentStatus === 'success' && paymentUserId) {
      console.log('Verifying payment success for userId:', paymentUserId);
      setIsVerifying(true);

      fetch(`/api/verify-subscription/${paymentUserId}`)
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to verify subscription');
          return data;
        })
        .then(data => {
          console.log('Verification response:', data);
          if (data.isSubscribed) {
            setIsSubscribed(true);
            toast({
              title: "Upgrade Successful!",
              description: "Welcome to CV Transformer Pro! Check your email for confirmation.",
            });
          } else {
            throw new Error(data.message || "Subscription verification failed. Please contact support if you believe this is an error.");
          }
        })
        .catch(error => {
          console.error('Verification error:', error);
          setVerificationError(error.message);
          toast({
            title: "Verification Error",
            description: error.message,
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [paymentStatus, paymentUserId, toast]);

  const handleResendWelcomeEmail = async () => {
    if (!paymentUserId) {
      toast({
        title: "Error",
        description: "User ID not found",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch(`/api/stripe/test-send-welcome-email/${paymentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send welcome email');
      }

      toast({
        title: "Email Sent",
        description: "Welcome email has been resent successfully!",
      });
    } catch (error) {
      console.error('Email sending error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send welcome email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleUpgradeClick = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upgrade your account.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/create-payment-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment link");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Payment link creation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start upgrade process",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (userLoading || isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Upgrade to Pro Plan</h1>

      {verificationError && (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription>{verificationError}</AlertDescription>
        </Alert>
      )}

      {isSubscribed && (
        <Alert className="mb-8">
          <AlertTitle>Pro Plan Active!</AlertTitle>
          <AlertDescription>
            Your subscription is active. You now have access to all Pro features.
            {user ? (
              <> Visit your <a href="/dashboard" className="font-medium underline">dashboard</a> to start using them!</>
            ) : (
              <> Please <a href="/auth" className="font-medium underline">log in</a> to access your Pro features.</>
            )}
          </AlertDescription>
          {paymentUserId && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={handleResendWelcomeEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  "Resend Welcome Email"
                )}
              </Button>
            </div>
          )}
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Free Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Basic features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic CV transformation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>View transformed CVs in browser</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic keyword optimization</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan Card */}
        <Card className="relative border-primary">
          <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm">
            Advanced Features
          </div>
          <CardHeader>
            <CardTitle>Pro Plan</CardTitle>
            <CardDescription>£5/month - Unlock premium features and interview insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>All Free Plan features</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Download transformed CVs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Comprehensive employer and competitor analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Personalized interview question predictions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Real-time updates on company culture and interview style</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Advanced CV scoring with industry benchmarks</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Interview preparation timeline with custom insights</span>
              </div>
            </div>

            <div className="mt-6">
              {isSubscribed ? (
                <Button className="w-full" disabled>
                  Currently Subscribed
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleUpgradeClick}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upgrade Now - £5/month"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}