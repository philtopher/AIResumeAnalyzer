import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UpgradePlanPage() {
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  // Redirect if user is not logged in or email is not verified
  if (!isLoading && (!user || !user.emailVerified)) {
    return <Redirect to="/auth" />;
  }

  // Handle upgrade to pro plan
  const handleUpgrade = async () => {
    try {
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const { subscriptionId, clientSecret } = await response.json();

      // Redirect to Stripe checkout
      window.location.href = `/checkout?session_id=${subscriptionId}&client_secret=${clientSecret}`;
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
            Upgrade Now
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
                <span>Organization insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Detailed CV scoring and analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Full CV generation option</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleUpgrade}
              disabled={!user?.emailVerified}
            >
              {user?.emailVerified ? (
                "Upgrade to Pro - £5/month"
              ) : (
                "Please verify your email first"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
