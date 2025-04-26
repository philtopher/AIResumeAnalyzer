import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper function to make API requests
const apiRequest = async (method: string, endpoint: string, data?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  return fetch(endpoint, options);
};

export function FreeTrialWarning() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [transformationsLeft, setTransformationsLeft] = useState(0);
  const [transformationsUsed, setTransformationsUsed] = useState(0);
  const [totalLimit, setTotalLimit] = useState(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(false);

  // Query to get recent transformations count
  const { data: transformationsData } = useQuery({
    queryKey: ["/api/cv/recent-count"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/cv/recent-count");
        if (!response.ok) {
          throw new Error("Failed to fetch recent transformations count");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching recent transformations:", error);
        return { count: 0, limit: 10, remaining: 10, tier: "basic", requiresPayment: false, unlimited: false }; // tier refers to subscription plan
      }
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (transformationsData) {
      const { 
        count, 
        limit, 
        remaining, 
        tier, 
        requiresPayment: needsPayment = false,
        unlimited = false
      } = transformationsData;
      
      setTransformationsUsed(count || 0);
      setTotalLimit(limit || 0);
      setTransformationsLeft(remaining || 0);
      setSubscriptionPlan(tier || "basic");
      setRequiresPayment(!!needsPayment);
      setIsUnlimited(!!unlimited);
      
      // Show warning dialog when user is close to their limit (less than 3 remaining)
      // or if they need to make a payment
      if ((remaining && remaining <= 3 && !unlimited) || needsPayment) {
        setShowDialog(true);
      }
    }
  }, [transformationsData]);

  const handleSubscribe = () => {
    try {
      // Redirect to subscription page
      window.location.href = "/pricing";
      setShowDialog(false);
    } catch (error) {
      console.error("Error starting subscription process:", error);
      toast({
        title: "Subscription Error",
        description: "There was an error redirecting to the subscription page. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpgrade = () => {
    try {
      // Redirect to upgrade page
      window.location.href = "/upgrade";
      setShowDialog(false);
    } catch (error) {
      console.error("Error starting upgrade process:", error);
      toast({
        title: "Upgrade Error",
        description: "There was an error redirecting to the upgrade page. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Don't show anything for unlimited users (Pro subscription plan or admin)
  if (isUnlimited) {
    return null;
  }
  
  // Don't show anything if user has no subscription yet
  if (requiresPayment) {
    return null; // The payment requirement will be handled elsewhere in the app
  }

  // Get friendly name and subscription plan color
  const getSubscriptionPlanInfo = (tier: string | null) => {
    switch(tier) {
      case "basic":
        return { name: "Basic", color: "amber" };
      case "standard":
        return { name: "Standard", color: "emerald" };
      default:
        return { name: "Basic", color: "amber" };
    }
  };
  
  const { name: planName, color: planColor } = getSubscriptionPlanInfo(subscriptionPlan);
  const colorClasses = {
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-500",
      text: "text-amber-700",
      button: "text-amber-700 border-amber-500 hover:bg-amber-100",
      icon: "text-amber-400",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-500",
      text: "text-emerald-700",
      button: "text-emerald-700 border-emerald-500 hover:bg-emerald-100",
      icon: "text-emerald-400",
    }
  };
  const classes = colorClasses[planColor as keyof typeof colorClasses];

  return (
    <>
      {transformationsLeft <= 5 && transformationsLeft > 0 && (
        <div className={`${classes.bg} border-l-4 ${classes.border} p-4 mb-4`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 ${classes.icon}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 3.879l-6.364 6.364a1 1 0 000 1.414l6.364 6.364a1 1 0 001.414 0l6.364-6.364a1 1 0 000-1.414L9.9 3.879a1 1 0 00-1.414 0zM10 11a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className={`text-sm ${classes.text}`}>
                <span className="font-bold">{planName} Plan:</span> You have used {transformationsUsed} of {totalLimit} CV transformations this month ({transformationsLeft} remaining).
              </p>
            </div>
          </div>
          {subscriptionPlan === "basic" && (
            <div className="mt-2 pl-8">
              <Button 
                variant="outline" 
                className={classes.button}
                onClick={() => setShowDialog(true)}
              >
                Upgrade to Standard or Pro
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {subscriptionPlan === "basic" ? "Basic Plan Limit" : "Standard Plan Limit"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {transformationsLeft > 0 ? (
                subscriptionPlan === "basic" ? (
                  <>
                    You have only <strong>{transformationsLeft}</strong> CV transformation{transformationsLeft !== 1 ? 's' : ''} remaining in your Basic plan. 
                    <p className="mt-2">Upgrade to our Standard plan for £5/month to get 20 transformations per month, or Pro plan for £30/month for unlimited transformations.</p>
                  </>
                ) : (
                  <>
                    You have only <strong>{transformationsLeft}</strong> CV transformation{transformationsLeft !== 1 ? 's' : ''} remaining in your Standard plan. 
                    <p className="mt-2">Upgrade to our Pro plan for £30/month to get unlimited transformations and additional premium features.</p>
                  </>
                )
              ) : (
                subscriptionPlan === "basic" ? (
                  <>
                    You've reached the limit of {totalLimit} transformations in your Basic plan. 
                    <p className="mt-2">Upgrade to our Standard plan for £5/month to get 20 transformations per month, or Pro plan for £30/month for unlimited transformations.</p>
                  </>
                ) : (
                  <>
                    You've reached the limit of {totalLimit} transformations in your Standard plan. 
                    <p className="mt-2">Upgrade to our Pro plan for £30/month to get unlimited transformations and additional premium features.</p>
                  </>
                )
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpgrade} className="bg-primary text-primary-foreground">
              Upgrade Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}