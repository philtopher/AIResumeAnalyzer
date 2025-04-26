import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

type RegistrationStatus = "loading" | "success" | "error" | "invalid";

export default function RegistrationCompletePage() {
  const [status, setStatus] = useState<RegistrationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [, setLocation] = useLocation();
  const { refetch } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const verifyRegistration = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const userId = params.get('user_id');

        if (!sessionId || !userId) {
          setStatus("invalid");
          return;
        }

        const response = await fetch(`/api/registration-complete?session_id=${sessionId}&user_id=${userId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Registration verification failed');
        }

        const data = await response.json();

        if (data.status === 'success') {
          setStatus("success");
          refetch(); // Refresh user data after successful registration completion
          
          toast({
            title: "Registration Complete",
            description: "Your account has been successfully created and activated.",
          });
        } else {
          throw new Error(data.message || 'Registration verification failed');
        }
      } catch (error) {
        console.error('Registration completion error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
        setStatus("error");
        
        toast({
          title: "Registration Error",
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: "destructive",
        });
      }
    };

    verifyRegistration();
  }, [refetch, toast]);

  const getContent = () => {
    switch (status) {
      case "loading":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Finalizing your registration...</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              Please wait while we set up your account. This should only take a moment.
            </CardContent>
          </>
        );
      case "success":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="flex items-center justify-center space-x-2 text-green-500">
                  <Check className="h-6 w-6" />
                  <span>Registration Complete!</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Your account has been successfully created and your subscription is now active.
              </p>
              <Button 
                className="w-full" 
                onClick={() => setLocation("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </>
        );
      case "error":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="flex items-center justify-center space-x-2 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                  <span>Registration Error</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {errorMessage || "There was a problem completing your registration."}
              </p>
              <Button 
                className="w-full" 
                onClick={() => setLocation("/register")}
                variant="outline"
              >
                Try Again
              </Button>
            </CardContent>
          </>
        );
      case "invalid":
        return (
          <>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="flex items-center justify-center space-x-2 text-amber-500">
                  <AlertCircle className="h-6 w-6" />
                  <span>Invalid Registration Data</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                The registration information provided is invalid or incomplete.
              </p>
              <Button 
                className="w-full" 
                onClick={() => setLocation("/register")}
                variant="outline"
              >
                Return to Registration
              </Button>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        {getContent()}
      </Card>
    </div>
  );
}