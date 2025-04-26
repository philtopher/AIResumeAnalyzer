import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect, useLocation, useSearch } from "wouter";
import { Loader2, Check, AlertTriangle, ArrowDown, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiApple, SiGooglepay } from "react-icons/si";

export default function UpgradePlanPage() {
  const { user, isLoading: userLoading, refetch } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'pro'>('standard');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentStatus = params.get('payment');
  const paymentUserId = params.get('userId');

  // Determine if user has an active subscription and what kind
  const hasStandardPlan = !userLoading && user?.subscription?.status === "active" && !user.subscription?.isPro;
  const hasProPlan = !userLoading && user?.subscription?.status === "active" && user.subscription?.isPro;

  useEffect(() => {
    setVerificationError(null);

    if (paymentStatus === 'success' && paymentUserId) {
      console.log('Verifying payment success for userId:', paymentUserId);
      setIsVerifying(true);

      fetch(`/api/stripe/verify-subscription/${paymentUserId}`)
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to verify subscription');
          return data;
        })
        .then(data => {
          console.log('Verification response:', data);
          if (data.isSubscribed) {
            setIsSubscribed(true);
            refetch(); // Refresh user data
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
  }, [paymentStatus, paymentUserId, toast, refetch]);

  const handleSubscriptionAction = async (action: 'subscribe' | 'upgrade' | 'downgrade') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (action === 'downgrade') {
        // Handle downgrade through our API
        const response = await fetch("/api/stripe/downgrade-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            plan: selectedPlan,
            action: action
          }),
          credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to process subscription request");
        }

        // Handle downgrade success
        toast({
          title: "Downgrade Successful",
          description: "Your subscription has been downgraded to the Standard Plan. Changes will take effect at the end of your current billing period.",
        });
        refetch(); // Refresh user data
      } else {
        // Redirect to our new checkout page with embedded Stripe for Apple Pay/Google Pay support
        setLocation(`/checkout?plan=${selectedPlan}`);
      }
    } catch (error) {
      console.error("Subscription action error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your subscription request",
        variant: "destructive",
      });
    } finally {
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

      <div className="flex justify-center mb-8">
        <div className="bg-muted p-4 rounded-lg inline-flex items-center gap-3">
          <span className="text-sm font-medium">Payment Methods:</span>
          <CreditCard className="h-5 w-5" />
          <SiApple className="h-5 w-5" />
          <SiGooglepay className="h-6 w-6" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle>Free Trial</CardTitle>
            <CardDescription>Limited time access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>30-day trial period</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic features preview</span>
              </div>
            </div>
            <Button className="w-full" variant="outline" disabled>
              {user && !hasStandardPlan && !hasProPlan ? "Current Plan" : "Trial Period"}
            </Button>
          </CardContent>
        </Card>

        {/* Standard Plan Card */}
        <Card className={selectedPlan === 'standard' ? 'border-primary' : ''}>
          <CardHeader>
            <CardTitle>Standard Plan</CardTitle>
            <CardDescription>£5/month - Essential CV tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>All Free Trial features</span>
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

            {hasProPlan ? (
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedPlan('standard');
                  handleSubscriptionAction('downgrade');
                }}
                disabled={isProcessing}
                variant="outline"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Downgrade to Standard
                  </>
                )}
              </Button>
            ) : hasStandardPlan ? (
              <Button
                className="w-full"
                variant="outline"
                disabled
              >
                Current Plan
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedPlan('standard');
                  handleSubscriptionAction('subscribe');
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
            )}
          </CardContent>
        </Card>

        {/* Pro Plan Card */}
        <Card className={selectedPlan === 'pro' ? 'border-primary' : ''}>
          <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-bl">
            Best Value
          </div>
          <CardHeader>
            <CardTitle>Pro Plan</CardTitle>
            <CardDescription>£30/month - Premium features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>All Standard Plan features</span>
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

            {hasProPlan ? (
              <Button
                className="w-full"
                variant="outline"
                disabled
              >
                Current Plan
              </Button>
            ) : hasStandardPlan ? (
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedPlan('pro');
                  handleSubscriptionAction('upgrade');
                }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upgrade - £30/month"
                )}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedPlan('pro');
                  handleSubscriptionAction('subscribe');
                }}
                disabled={isProcessing || isSubscribed}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe - £30/month"
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}