import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RegistrationCompletePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get('session_id');

  useEffect(() => {
    const completeRegistration = async () => {
      if (!sessionId) {
        setError("No session ID found. Registration cannot be completed.");
        setIsLoading(false);
        return;
      }

      try {
        // Send the session ID to complete the registration
        const response = await fetch('/api/direct-subscription/complete-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to complete registration');
        }

        setIsSuccess(true);
        toast({
          title: "Registration Complete",
          description: "Your account has been created and subscription activated!",
        });
      } catch (error) {
        console.error('Registration completion error:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        toast({
          title: "Registration Failed",
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    completeRegistration();
  }, [sessionId, toast]);

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleGoToHomepage = () => {
    setLocation('/');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Completing Registration...</CardTitle>
            <CardDescription>Please wait while we set up your account</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Registration Error
            </CardTitle>
            <CardDescription>We encountered a problem completing your registration</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-center text-muted-foreground mb-4">
              Please contact support if you believe your payment was processed successfully.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={handleGoToHomepage}>
              Return to Homepage
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Registration Complete!
          </CardTitle>
          <CardDescription>Your account has been created successfully</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">Thank you for subscribing to CV Transformer!</p>
          <p className="mb-6 text-muted-foreground">
            Your account is now active and your subscription has been set up. 
            You can start transforming your CV immediately.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleGoToDashboard}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}