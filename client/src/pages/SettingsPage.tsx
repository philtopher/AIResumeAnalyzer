import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { 
  Settings, 
  CreditCard, 
  ArrowDown, 
  AlertTriangle,
  X,
  ShieldAlert,
  Loader2 
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { 
    subscription, 
    isLoading,
    downgradeSubscription,
    cancelSubscription,
    isDowngrading,
    isCancelling
  } = useSubscription();
  
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedDowngradeTier, setSelectedDowngradeTier] = useState<'standard' | 'basic'>('standard');

  // Check what plan the user is on
  const isPro = subscription?.tier === 'pro' || subscription?.isPro === true;
  const isStandard = subscription?.tier === 'standard' || 
    (subscription && !subscription.isPro && subscription.tier !== 'basic');
  const isBasic = subscription?.tier === 'basic';

  // Handle downgrade (Pro to Standard or Basic, or Standard to Basic)
  const handleDowngrade = async () => {
    try {
      const result = await downgradeSubscription(selectedDowngradeTier);
      toast({
        title: `Plan Downgraded to ${selectedDowngradeTier.charAt(0).toUpperCase() + selectedDowngradeTier.slice(1)}`,
        description: "You have been successfully downgraded to the Standard plan.",
      });
      setShowDowngradeConfirm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to downgrade subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle cancellation (end premium)
  const handleCancel = async () => {
    try {
      const result = await cancelSubscription();
      toast({
        title: "Subscription Cancelled",
        description: "Your premium subscription has been cancelled. You've been returned to the Basic plan.",
      });
      setShowCancelConfirm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine subscription status from user object
  const subscriptionStatus = user?.subscription?.status || "inactive";
  const isPro = user?.subscription?.isPro === true;
  const isActive = subscriptionStatus === "active";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Account Settings</h1>
        </div>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Details
            </CardTitle>
            <CardDescription>
              Manage your subscription plan and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Subscription Plan</p>
                <p className="text-muted-foreground">
                  {isActive 
                    ? (isPro ? "Pro Subscription Plan (£30/month)" : "Standard Subscription Plan (£5/month)") 
                    : "Basic Subscription Plan (£3/month)"}
                </p>
                {isActive && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: <span className="text-green-600 font-medium">Active</span>
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                {isActive && !showDowngradeConfirm && !showCancelConfirm && (
                  <>
                    {isPro && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedDowngradeTier('standard');
                            setShowDowngradeConfirm(true);
                          }}
                        >
                          <ArrowDown className="mr-2 h-4 w-4" />
                          Downgrade to Standard
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedDowngradeTier('basic');
                            setShowDowngradeConfirm(true);
                          }}
                        >
                          <ArrowDown className="mr-2 h-4 w-4" />
                          Downgrade to Basic
                        </Button>
                      </div>
                    )}
                    {!isPro && isStandard && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedDowngradeTier('basic');
                          setShowDowngradeConfirm(true);
                        }}
                      >
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Downgrade to Basic
                      </Button>
                    )}
                  </>
                )}
                {isActive && !showDowngradeConfirm && !showCancelConfirm && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    End Premium
                  </Button>
                )}
                {!isActive && (
                  <Link href="/upgrade">
                    <Button>Upgrade Now</Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Downgrade Confirmation */}
            {showDowngradeConfirm && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="mt-2">
                  <p className="mb-4">
                    Are you sure you want to downgrade to the Standard Subscription Plan? You'll lose access to:
                  </p>
                  <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li>Interviewer LinkedIn Insights</li>
                    <li>Employer Competition Analysis</li>
                    <li>Advanced CV Analysis</li>
                  </ul>
                  <div className="flex gap-4">
                    <Button
                      variant="default"
                      onClick={handleDowngrade}
                      disabled={isDowngrading}
                    >
                      {isDowngrading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Confirm Downgrade
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDowngradeConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Cancel Confirmation */}
            {showCancelConfirm && (
              <Alert className="bg-red-50 border-red-200">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <AlertDescription className="mt-2">
                  <p className="mb-4">
                    Are you sure you want to cancel your premium subscription? You'll lose access to:
                  </p>
                  <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li>CV transformation functionality</li>
                    <li>CV downloads</li>
                    <li>All premium features</li>
                  </ul>
                  <div className="flex gap-4">
                    <Button
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={isCancelling}
                    >
                      {isCancelling && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Confirm Cancellation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      Keep Subscription
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          {isActive && (
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Your subscription renews automatically. You can cancel or change your subscription plan at any time.
              </p>
            </CardFooter>
          )}
        </Card>

        {/* Other settings sections can be added here */}
      </div>
    </div>
  );
}
