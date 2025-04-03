import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import StripeCheckout from "@/components/StripeCheckout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CheckoutPage() {
  const { user, isLoading: userLoading, refetch } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'standard' | 'pro'>('standard');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  
  useEffect(() => {
    if (!userLoading) {
      // Get plan from URL parameters
      const planParam = searchParams.get('plan');
      if (planParam === 'standard' || planParam === 'pro') {
        setPlanType(planParam);
      }
      setIsLoading(false);
    }
  }, [userLoading, search, searchParams]);

  if (userLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to complete checkout. 
            <a href="/auth" className="ml-2 font-medium underline">
              Click here to login
            </a>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSuccess = () => {
    toast({
      title: "Payment Successful",
      description: "Your subscription has been activated. You'll be redirected to your dashboard.",
    });
    refetch();
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  const handleError = (message: string) => {
    setError(message);
    toast({
      title: "Payment Failed",
      description: message,
      variant: "destructive",
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Complete Your Subscription</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="text-center mb-8">
        <p className="text-lg mb-2">
          You're subscribing to the <span className="font-semibold">{planType === 'pro' ? 'Pro' : 'Standard'} Plan</span>
        </p>
        <p className="text-muted-foreground">
          {planType === 'pro' 
            ? 'Get access to all premium features for £15/month'
            : 'Basic subscription with standard features for £5/month'}
        </p>
      </div>
      
      <StripeCheckout 
        planType={planType}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}