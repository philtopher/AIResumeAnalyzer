import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect, useLocation, useSearch } from "wouter";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UpgradePlanPage() {
  const { user, isLoading: userLoading } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('basic');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentStatus = params.get('payment');
  const paymentUserId = params.get('userId');

  // Check if user is already a Pro subscriber
  if (!userLoading && user?.subscription?.status === "active") {
    toast({
      title: "Already Subscribed",
      description: "You already have an active subscription.",
      variant: "default",
    });
    return <Redirect to="/dashboard" />;
  }

  useEffect(() => {
    setVerificationError(null);

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
              title: "Subscription Successful!",
              description: "Your subscription is now active. Check your email for confirmation.",
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
        body: JSON.stringify({ plan: selectedPlan }),
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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Choose Your Plan</h1>

      {verificationError && (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription>{verificationError}</AlertDescription>
        </Alert>
      )}

      {isSubscribed && (
        <Alert className="mb-8">
          <AlertTitle>Subscription Active!</AlertTitle>
          <AlertDescription>
            Your subscription is active. You now have access to all features.
            {user ? (
              <> Visit your <a href="/dashboard" className="font-medium underline">dashboard</a> to start!</>
            ) : (
              <> Please <a href="/auth" className="font-medium underline">log in</a> to access your features.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-8">
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
                <span>View sample CVs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic formatting preview</span>
              </div>
            </div>
            <Button className="w-full" variant="outline" disabled>
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Basic Plan Card */}
        <Card className={selectedPlan === 'basic' ? 'border-primary' : ''}>
          <CardHeader>
            <CardTitle>Basic Plan</CardTitle>
            <CardDescription>£5/month - Essential CV tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>All Free Plan features</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic CV transformation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Download transformed CVs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic keyword optimization</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setSelectedPlan('basic');
                handleUpgradeClick();
              }}
              disabled={isProcessing || isSubscribed}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe - £5/month"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan Card */}
        <Card className={selectedPlan === 'pro' ? 'border-primary' : ''}>
          <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-bl">
            Best Value
          </div>
          <CardHeader>
            <CardTitle>Pro Plan</CardTitle>
            <CardDescription>£15/month - Premium features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>All Basic Plan features</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Advanced CV Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Employer Competition Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Interviewer LinkedIn Insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Advanced CV scoring</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setSelectedPlan('pro');
                handleUpgradeClick();
              }}
              disabled={isProcessing || isSubscribed}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Upgrade - £15/month"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}