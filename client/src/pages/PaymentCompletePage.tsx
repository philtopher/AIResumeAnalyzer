import { useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, User, Settings } from "lucide-react";

export default function PaymentCompletePage() {
  useEffect(() => {
    // Track successful payment completion
    try {
      const event = new Event('payment_complete');
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error tracking payment completion:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl mb-2">Welcome to CV Transformer Pro!</CardTitle>
          <CardDescription className="text-lg">
            Your account has been successfully upgraded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">🎉 What's included in your Pro plan:</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ Advanced CV transformation with AI-powered insights</li>
              <li>✓ Unlimited CV transformations</li>
              <li>✓ Priority support</li>
              <li>✓ Access to all premium features</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard">
              <Button className="w-full" variant="default">
                <FileText className="mr-2 h-4 w-4" />
                Start Transforming
              </Button>
            </Link>
            <Link href="/profile">
              <Button className="w-full" variant="outline">
                <User className="mr-2 h-4 w-4" />
                View Profile
              </Button>
            </Link>
            <Link href="/settings">
              <Button className="w-full" variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configure Account
              </Button>
            </Link>
          </div>

          <div className="text-center text-sm text-muted-foreground mt-6">
            <p>Need help getting started?</p>
            <Link href="/tutorial">
              <span className="text-primary hover:underline cursor-pointer">
                Check out our tutorial guide
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
