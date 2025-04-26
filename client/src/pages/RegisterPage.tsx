import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'wouter';
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

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempUserId, setTempUserId] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();
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
        
        // Create a temporary registration to get a user ID
        const registrationData: RegistrationData = {
          username: data.username,
          email: data.email,
          password: data.password
        };

        const response = await apiRequest('POST', '/api/register-temp', registrationData);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Registration failed');
        }

        const responseData = await response.json();
        setTempUserId(responseData.userId);
        setShowPayment(true);
        
        toast({
          title: "Step 1 complete",
          description: "Please complete your payment to activate your account.",
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
              {showPayment ? 'Complete Your Registration' : 'Create an Account'}
            </h1>
            <p className="text-muted-foreground">
              {showPayment 
                ? 'Please select a subscription plan to continue.'
                : 'Sign up to get started with CV transformation.'}
            </p>
          </div>

          {!showPayment ? (
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
                  {isSubmitting ? 'Creating account...' : 'Continue to Payment'}
                </Button>

                <p className="text-sm text-center mt-4">
                  Already have an account?{' '}
                  <a href="/login" className="text-primary hover:underline">
                    Sign in
                  </a>
                </p>
              </form>
            </Form>
          ) : (
            <div className="mt-6">
              {tempUserId && (
                <StripeCheckout
                  planType="basic"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isRegistration={true}
                  userId={tempUserId}
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