import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  CreditCard, 
  ArrowDown, 
  AlertTriangle,
  Loader2 
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);

  // Fetch current subscription status
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      const response = await fetch("/api/subscription", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch subscription");
      return response.json();
    }
  });

  // Downgrade mutation
  const downgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/downgrade-to-standard", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to downgrade subscription");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Plan Downgraded",
        description: "You have been successfully downgraded to the Standard plan.",
      });
      setShowDowngradeConfirm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to downgrade subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = subscription?.type === "pro";

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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-muted-foreground">
                  {isPro ? "Pro Plan (£15/month)" : "Standard Plan (£5/month)"}
                </p>
              </div>
              {isPro && !showDowngradeConfirm && (
                <Button
                  variant="outline"
                  onClick={() => setShowDowngradeConfirm(true)}
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Downgrade to Standard
                </Button>
              )}
            </div>

            {showDowngradeConfirm && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="mt-2">
                  <p className="mb-4">
                    Are you sure you want to downgrade to the Standard plan? You'll lose access to:
                  </p>
                  <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li>Interview preparation insights</li>
                    <li>Advanced analytics dashboard</li>
                    <li>Priority support</li>
                  </ul>
                  <div className="flex gap-4">
                    <Button
                      variant="default"
                      onClick={() => downgradeMutation.mutate()}
                      disabled={downgradeMutation.isLoading}
                    >
                      {downgradeMutation.isLoading && (
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
          </CardContent>
        </Card>

        {/* Other settings sections can be added here */}
      </div>
    </div>
  );
}
