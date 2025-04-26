import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type RegistrationStatus = "loading" | "success" | "error" | "invalid";

export default function RegistrationCompletePage() {
  const [status, setStatus] = useState<RegistrationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState('');
  const [_, navigate] = useLocation();

  const { toast } = useToast();
  
  useEffect(() => {
    async function completeRegistration() {
      try {
        // Parse URL params to get the session ID
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        
        if (!sessionId) {
          setStatus("invalid");
          setErrorMessage("Invalid request. Session ID not found.");
          return;
        }
        
        // Complete the registration
        const response = await fetch(`/api/registration-complete?session_id=${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData || 'Failed to complete registration');
        }
        
        setStatus("success");
        toast({
          title: "Registration successful",
          description: "Your account has been created and is ready to use.",
        });
        
        // Redirect to home after a delay
        setTimeout(() => {
          navigate('/');
        }, 5000);
      } catch (error) {
        console.error('Registration completion error:', error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        toast({
          title: "Registration failed",
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: "destructive",
        });
      }
    }
    
    completeRegistration();
  }, [navigate, toast]);
  
  return (
    <div className="container max-w-md mx-auto py-16 px-4">
      <div className="bg-card p-8 rounded-lg shadow-lg text-center">
        {status === "loading" && (
          <>
            <div className="flex justify-center mb-6">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Completing Your Registration</h1>
            <p className="text-muted-foreground">
              Please wait while we set up your account...
            </p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Registration Complete!</h1>
            <p className="text-muted-foreground mb-6">
              Your account has been created successfully and your subscription is active.
              You will be redirected to the homepage shortly.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Go to Homepage
            </Button>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Registration Failed</h1>
            <p className="text-muted-foreground mb-2">
              We encountered an error while completing your registration.
            </p>
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-800 rounded-md mb-6 text-sm">
                {errorMessage}
              </div>
            )}
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/register')}
                className="w-full"
                variant="outline"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => navigate('/contact')}
                className="w-full"
              >
                Contact Support
              </Button>
            </div>
          </>
        )}
        
        {status === "invalid" && (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="h-16 w-16 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Invalid Request</h1>
            <p className="text-muted-foreground mb-6">
              Your registration request is invalid or expired.
              Please try registering again.
            </p>
            <Button 
              onClick={() => navigate('/register')}
              className="w-full"
            >
              Register Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}