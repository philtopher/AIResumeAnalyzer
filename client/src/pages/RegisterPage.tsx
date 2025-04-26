import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import StripeCheckout from '@/components/StripeCheckout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowRight } from 'lucide-react';

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

// Define the data structure for registration requests
interface RegistrationData {
  username: string;
  email: string;
  password: string;
}

interface RegistrationFormData {
  username: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationFormData, setRegistrationFormData] = useState<RegistrationFormData | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'pro'>('basic');
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.handleSubmit(async (data) => {
      try {
        setIsSubmitting(true);
        
        // Store form data in component state instead of sending to server
        const formData = {
          username: data.username,
          email: data.email,
          password: data.password
        };
        
        // Check for basic validation (this would typically happen server-side too)
        if (!formData.username || !formData.email || !formData.password) {
          throw new Error('All fields are required');
        }
        
        // Store the form data in state temporarily (not in the database)
        setRegistrationFormData(formData);
        
        // Move directly to plan selection
        setShowPlanSelection(true);
        
        toast({
          title: "Step 1 complete",
          description: "Please select a subscription plan to continue.",
        });
      } catch (error) {
        toast({
          title: "Registration failed",
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    })(e);
  }
  
  function handleSelectPlan(plan: 'basic' | 'standard' | 'pro') {
    setSelectedPlan(plan);
    setShowPlanSelection(false);
    setShowPayment(true);
    
    toast({
      title: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan selected`,
      description: "Please complete your payment to activate your account.",
    });
  }

  function handlePaymentSuccess() {
    toast({
      title: "Payment successful",
      description: "Your account has been created and subscription activated.",
    });
    navigate('/');
  }

  function handlePaymentError(message: string) {
    toast({
      title: "Payment failed",
      description: message,
      variant: "destructive",
    });
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex flex-col md:flex-row bg-card rounded-xl shadow-lg overflow-hidden">
        {/* Left side - Form */}
        <div className="md:w-1/2 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {showPayment 
                ? 'Complete Your Payment' 
                : showPlanSelection 
                  ? 'Choose Your Plan'
                  : 'Create an Account'}
            </h1>
            <p className="text-muted-foreground">
              {showPayment 
                ? 'Please complete payment to activate your subscription.'
                : showPlanSelection
                  ? 'Select a subscription plan that suits your needs.'
                  : 'Sign up to get started with CV transformation.'}
            </p>
          </div>

          {!showPlanSelection && !showPayment ? (
            <Form {...form}>
              <form onSubmit={handleFormSubmit} className="space-y-6">
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating account...' : 'Continue to Plan Selection'}
                </Button>

                <p className="text-sm text-center mt-4">
                  Already have an account?{' '}
                  <a href="/auth" className="text-primary hover:underline">
                    Sign in
                  </a>
                </p>
              </form>
            </Form>
          ) : showPlanSelection ? (
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Choose Your Subscription Plan</h2>
              
              <div className="grid gap-4 md:grid-cols-3">
                {/* Basic Plan */}
                <Card className={`border-2 ${selectedPlan === 'basic' ? 'border-primary' : 'border-transparent'} transition-all`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Basic Plan</CardTitle>
                    <CardDescription>For occasional CV updates</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-3xl font-bold">£3<span className="text-base font-normal text-muted-foreground">/month</span></div>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>10 CV transformations per month</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>AI-powered insights</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>Basic PDF export</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSelectPlan('basic')} 
                      className="w-full"
                      variant={selectedPlan === 'basic' ? 'default' : 'outline'}
                    >
                      Select Basic
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Standard Plan */}
                <Card className={`border-2 ${selectedPlan === 'standard' ? 'border-primary' : 'border-transparent'} transition-all`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Standard Plan</CardTitle>
                    <CardDescription>For active job seekers</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-3xl font-bold">£5<span className="text-base font-normal text-muted-foreground">/month</span></div>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>20 CV transformations per month</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>Enhanced AI insights</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>Premium formatting options</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSelectPlan('standard')} 
                      className="w-full"
                      variant={selectedPlan === 'standard' ? 'default' : 'outline'}
                    >
                      Select Standard
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Pro Plan */}
                <Card className={`border-2 ${selectedPlan === 'pro' ? 'border-primary' : 'border-transparent'} transition-all`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Pro Plan</CardTitle>
                    <CardDescription>For professional career growth</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-3xl font-bold">£30<span className="text-base font-normal text-muted-foreground">/month</span></div>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>Unlimited CV transformations</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>Advanced analytics & insights</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>Priority support</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSelectPlan('pro')} 
                      className="w-full"
                      variant={selectedPlan === 'pro' ? 'default' : 'outline'}
                    >
                      Select Pro
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {registrationFormData && (
                <StripeCheckout
                  planType={selectedPlan}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isRegistration={true}
                  registrationData={registrationFormData}
                />
              )}
            </div>
          )}
        </div>

        {/* Right side - Hero */}
        <div className="md:w-1/2 bg-primary p-8 text-white flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-4">
            Transform Your CV for Any Job
          </h2>
          <p className="mb-6">
            Create a CV that gets results with our AI-powered CV transformation.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-white rounded-full p-1 mr-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p>Tailor your CV to specific job descriptions</p>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-white rounded-full p-1 mr-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p>Get insights on how to improve your CV</p>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-white rounded-full p-1 mr-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p>Advanced AI technology to highlight your strengths</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}