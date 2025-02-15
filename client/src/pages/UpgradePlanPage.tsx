import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?payment=success`,
        },
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Upgrade Now - £5/month"
        )}
      </Button>
    </form>
  );
}

export default function UpgradePlanPage() {
  const { user, isLoading } = useUser();
  const [clientSecret, setClientSecret] = useState<string>();

  useEffect(() => {
    if (user?.id) {
      // Create a payment intent when the page loads
      fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  }, [user]);

  // Only show loading state when initially loading user data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If no user is logged in, redirect to auth
  if (!user) {
    return <Redirect to="/auth" />;
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0f172a',
    },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Upgrade to Pro Plan</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="relative">
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Your current plan</CardDescription>
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

        <Card className="relative border-primary">
          <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm">
            Advanced Features
          </div>
          <CardHeader>
            <CardTitle>Pro Plan</CardTitle>
            <CardDescription>£5/month - Unlock premium features</CardDescription>
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
                <span>Employer competitor analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Interviewer LinkedIn insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Advanced CV scoring and analysis</span>
              </div>
            </div>

            {clientSecret ? (
              <div className="mt-6">
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance 
                  }}
                >
                  <CheckoutForm />
                </Elements>
              </div>
            ) : (
              <div className="mt-6">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}