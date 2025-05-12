import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect, useLocation, useSearch } from "wouter";
import { Loader2, Check, AlertTriangle, ArrowDown, CreditCard, UserPlus, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiApple, SiGooglepay } from "react-icons/si";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import StripeCheckout from "@/components/StripeCheckout";

// Create a schema for form validation
const registerFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters."
  }),
  email: z.string().email({
    message: "Please enter a valid email address."
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters."
  }),
});

// Define the form values type from the schema
type RegisterFormValues = z.infer<typeof registerFormSchema>;

// Define steps for unregistered users
type SubscriptionStep = 'plan-selection' | 'registration' | 'payment';

export default function UpgradePlanPage() {
  const { user, isLoading: userLoading, refetch } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'pro'>('standard');
  const [currentStep, setCurrentStep] = useState<SubscriptionStep>('plan-selection');
  const [registrationData, setRegistrationData] = useState<RegisterFormValues | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentStatus = params.get('payment');
  const paymentUserId = params.get('userId');

  // Form setup for unregistered users
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  // Determine if user has an active subscription and what kind
  const hasBasicPlan = !userLoading && user?.subscription?.status === "active" && 
    !user.subscription?.isPro && user.subscription?.monthlyLimit === 10;
  const hasStandardPlan = !userLoading && user?.subscription?.status === "active" && 
    !user.subscription?.isPro && user.subscription?.monthlyLimit === 20;
  const hasProPlan = !userLoading && user?.subscription?.status === "active" && user.subscription?.isPro;

  useEffect(() => {
    setVerificationError(null);

    if (paymentStatus === 'success' && paymentUserId) {
      console.log('Verifying payment success for userId:', paymentUserId);
      setIsVerifying(true);

      fetch(`/api/stripe/verify-subscription/${paymentUserId}`)
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to verify subscription');
          return data;
        })
        .then(data => {
          console.log('Verification response:', data);
          if (data.isSubscribed) {
            setIsSubscribed(true);
            refetch(); // Refresh user data
            toast({
              title: "Subscription Successful!",
              description: "Your subscription is now active. Check your email for confirmation.",
            });
          } else {
            throw new Error(data.message || "Subscription verification failed. Please contact support if you believe this is an error.");
          }
        })
        .catch(error => {
          console.error('Verification error:', error);
          setVerificationError(error.message);
          toast({
            title: "Verification Error",
            description: error.message,
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [paymentStatus, paymentUserId, toast, refetch]);

  const handleSubscriptionAction = async (action: 'subscribe' | 'upgrade' | 'downgrade') => {
    if (action === 'downgrade') {
      // Downgrades require a user account
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to downgrade your subscription.",
          variant: "destructive",
        });
        return;
      }
      
      setIsProcessing(true);
      try {
        // Handle downgrade through our API
        const response = await fetch("/api/stripe/downgrade-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            plan: selectedPlan,
            action: action
          }),
          credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to process subscription request");
        }

        // Handle downgrade success
        toast({
          title: "Downgrade Successful",
          description: "Your subscription has been downgraded to the Standard Subscription Plan. Changes will take effect at the end of your current billing period.",
        });
        refetch(); // Refresh user data
      } catch (error) {
        console.error("Subscription action error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process your subscription request",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // For subscribe/upgrade
      if (user) {
        // Existing users go straight to checkout
        setIsProcessing(true);
        try {
          setLocation(`/checkout?plan=${selectedPlan}`);
        } catch (error) {
          console.error("Navigation error:", error);
          toast({
            title: "Error",
            description: "Failed to navigate to checkout page",
            variant: "destructive",
          });
          setIsProcessing(false);
        }
      } else {
        // Unregistered users start registration process
        setIsProcessing(false);
        setCurrentStep('registration');
      }
    }
  };

  // Handle form submission for registration
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.handleSubmit(async (data) => {
      try {
        setIsProcessing(true);
        
        // Store registration data for payment step
        setRegistrationData(data);
        
        // Move to payment step
        setCurrentStep('payment');
        
        toast({
          title: "Account information saved",
          description: "Please complete your payment to activate your subscription.",
        });
      } catch (error) {
        toast({
          title: "Registration failed",
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    })(event);
  };
  
  const handlePaymentSuccess = () => {
    toast({
      title: "Payment successful",
      description: "Your account has been created and subscription activated.",
    });
    refetch(); // Refresh user data in case the user was created
    setLocation('/dashboard');
  };

  const handlePaymentError = (message: string) => {
    toast({
      title: "Payment failed",
      description: message,
      variant: "destructive",
    });
  };
  
  // Function to go back to previous step
  const handleGoBack = () => {
    if (currentStep === 'registration') {
      setCurrentStep('plan-selection');
    } else if (currentStep === 'payment') {
      setCurrentStep('registration');
    }
  };

  if (userLoading || isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Different headers based on current step */}
      {currentStep === 'plan-selection' && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Choose Your Subscription Plan</h1>
          {!user && (
            <p className="text-muted-foreground mt-2">
              No account? No problem! You can subscribe directly without logging in.
            </p>
          )}
        </div>
      )}
      
      {currentStep === 'registration' && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Your Account</h1>
          <p className="text-muted-foreground mt-2">
            Set up your account to continue with your {selectedPlan === 'standard' ? 'Standard' : 'Pro'} Subscription Plan.
          </p>
        </div>
      )}
      
      {currentStep === 'payment' && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Complete Your Payment</h1>
          <p className="text-muted-foreground mt-2">
            Finalize your {selectedPlan === 'standard' ? 'Standard' : 'Pro'} Subscription Plan purchase.
          </p>
        </div>
      )}

      {verificationError && (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription>{verificationError}</AlertDescription>
        </Alert>
      )}

      {isSubscribed && (
        <Alert className="mb-8">
          <AlertTitle>Subscription Active!</AlertTitle>
          <AlertDescription>
            Your subscription is active. You now have access to all features.
            {user ? (
              <> Visit your <a href="/dashboard" className="font-medium underline">dashboard</a> to start!</>
            ) : (
              <> Please <a href="/auth" className="font-medium underline">log in</a> to access your features.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Show plan selection (default view) */}
      {currentStep === 'plan-selection' && (
        <>
          <div className="flex justify-center mb-8">
            <div className="bg-muted p-4 rounded-lg inline-flex items-center gap-3">
              <span className="text-sm font-medium">Payment Methods:</span>
              <CreditCard className="h-5 w-5" />
              <SiApple className="h-5 w-5" />
              <SiGooglepay className="h-6 w-6" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Plan Card */}
            <Card className={selectedPlan === 'basic' ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle>Basic Plan</CardTitle>
                <CardDescription>£3/month - 10 CV transformations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>10 CV transformations per month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Download transformed CVs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Basic CV feedback</span>
                  </div>
                </div>
                
                {hasBasicPlan ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Subscription Plan
                  </Button>
                ) : hasStandardPlan || hasProPlan ? (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan('basic');
                      handleSubscriptionAction('downgrade');
                    }}
                    disabled={isProcessing}
                    variant="outline"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Downgrade to Basic Plan
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan('basic');
                      handleSubscriptionAction('subscribe');
                    }}
                    disabled={isProcessing || isSubscribed}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : user ? (
                      "Subscribe - £3/month"
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Subscribe - £3/month
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Standard Subscription Plan Card */}
            <Card className={selectedPlan === 'standard' ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle>Standard Subscription Plan</CardTitle>
                <CardDescription>£5/month - Essential CV tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>All Free Trial features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Basic CV transformation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Download transformed CVs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Basic keyword optimization</span>
                  </div>
                </div>

                {hasProPlan ? (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan('standard');
                      handleSubscriptionAction('downgrade');
                    }}
                    disabled={isProcessing}
                    variant="outline"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Downgrade to Standard Subscription
                      </>
                    )}
                  </Button>
                ) : hasStandardPlan ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled
                  >
                    Current Subscription Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan('standard');
                      handleSubscriptionAction('subscribe');
                    }}
                    disabled={isProcessing || isSubscribed}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : user ? (
                      "Subscribe - £5/month"
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Subscribe - £5/month
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pro Subscription Plan Card */}
            <Card className={selectedPlan === 'pro' ? 'border-primary' : ''}>
              <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-bl">
                Best Value
              </div>
              <CardHeader>
                <CardTitle>Pro Subscription Plan</CardTitle>
                <CardDescription>£30/month - Premium features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>All Standard Subscription Plan features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Advanced CV Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Employer Competition Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Interviewer LinkedIn Insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Advanced CV scoring</span>
                  </div>
                </div>

                {hasProPlan ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled
                  >
                    Current Subscription Plan
                  </Button>
                ) : hasStandardPlan ? (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan('pro');
                      handleSubscriptionAction('upgrade');
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upgrade - £30/month"
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan('pro');
                      handleSubscriptionAction('subscribe');
                    }}
                    disabled={isProcessing || isSubscribed}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : user ? (
                      "Subscribe - £30/month"
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Subscribe - £30/month
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Registration form for unregistered users */}
      {currentStep === 'registration' && (
        <div className="max-w-md mx-auto bg-card rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Create Your Account</h2>
            <p className="text-muted-foreground text-sm">
              You're subscribing to the <span className="font-medium">{selectedPlan === 'pro' ? 'Pro' : 'Standard'} Subscription Plan</span> for {selectedPlan === 'pro' ? '£30' : '£5'}/month
            </p>
          </div>
          
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Create a password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleGoBack}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-center">
                <span className="text-muted-foreground">Already have an account?</span>{' '}
                <a href="/auth" className="text-primary hover:underline">
                  Sign in instead
                </a>
              </div>
            </form>
          </Form>
        </div>
      )}
      
      {/* Payment step */}
      {currentStep === 'payment' && registrationData && (
        <div className="max-w-xl mx-auto">
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            className="mb-4"
          >
            Back to Registration
          </Button>
          
          {/* For direct payment with stored registration data */}
          <StripeCheckout
            planType={selectedPlan}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            isRegistration={true}
            registrationData={registrationData}
          />
        </div>
      )}
    </div>
  );
}