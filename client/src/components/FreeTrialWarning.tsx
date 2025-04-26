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
  const [transformationsLeft, setTransformationsLeft] = useState(3);

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
        return { count: 0, limit: 3 };
      }
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (transformationsData) {
      const { count, limit } = transformationsData;
      const remaining = Math.max(0, limit - count);
      setTransformationsLeft(remaining);
      
      // Show warning dialog when user has only 1 transformation left
      if (remaining === 1) {
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

  return (
    <>
      {transformationsLeft < 3 && transformationsLeft > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 3.879l-6.364 6.364a1 1 0 000 1.414l6.364 6.364a1 1 0 001.414 0l6.364-6.364a1 1 0 000-1.414L9.9 3.879a1 1 0 00-1.414 0zM10 11a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                <span className="font-bold">Free Trial Warning:</span> You have {transformationsLeft} CV transformation{transformationsLeft !== 1 ? 's' : ''} remaining in your free trial.
              </p>
            </div>
          </div>
          <div className="mt-2 pl-8">
            <Button 
              variant="outline" 
              className="text-amber-700 border-amber-500 hover:bg-amber-100"
              onClick={() => setShowDialog(true)}
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Free Trial Limit</AlertDialogTitle>
            <AlertDialogDescription>
              {transformationsLeft > 0 ? (
                <>
                  You have only <strong>{transformationsLeft}</strong> CV transformation{transformationsLeft !== 1 ? 's' : ''} remaining in your free trial. 
                  After that, you'll need to subscribe to continue using our service.
                </>
              ) : (
                <>
                  You've reached the limit of your free trial. 
                  Subscribe now to unlock unlimited CV transformations and access all premium features.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubscribe} className="bg-primary text-primary-foreground">
              Subscribe Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}