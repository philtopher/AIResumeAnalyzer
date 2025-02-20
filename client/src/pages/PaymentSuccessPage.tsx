import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Add a small delay to show the loading state
    const timer = setTimeout(() => {
      setLocation("/payment-complete");
    }, 2000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Finalizing your upgrade...</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Please wait while we set up your Pro account.
        </CardContent>
      </Card>
    </div>
  );
}