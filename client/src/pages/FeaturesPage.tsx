import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  FileText,
  Download,
  Eye,
  Search,
  BarChart,
  Clock,
  Check,
  CreditCard,
} from "lucide-react";

// Initialize Stripe with proper error handling and debugging
const stripePromise = (() => {
  // List all available environment variables (excluding sensitive data)
  console.log('Available environment variables:', Object.keys(import.meta.env)
    .filter(key => !key.includes('SECRET'))
    .join(', '));

  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error('Stripe publishable key is missing. Available env vars:', 
      Object.keys(import.meta.env)
        .filter(key => !key.includes('SECRET'))
        .reduce((acc, key) => ({ ...acc, [key]: import.meta.env[key] }), {})
    );
    return null;
  }

  console.log('Initializing Stripe with key prefix:', key.substring(0, 8) + '...');
  return loadStripe(key);
})();

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const PricingPlanContent = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const stripe = useStripe();
  const elements = useElements();

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      acceptTerms: false,
    },
  });

  const handleCardChange = (event) => {
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError("");
    }
  };

  async function onSubmit(values) {
    try {
      setIsLoading(true);

      if (!stripe || !elements) {
        throw new Error("Stripe.js hasn't loaded yet");
      }

      // Create subscription with customer data
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          username: values.username,
          password: values.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create subscription");
      }

      const { clientSecret } = await response.json();

      // Confirm payment with the card details
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            email: values.email,
            name: values.username,
          },
        },
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      // Payment successful
      toast({
        title: "Payment Successful!",
        description: "Your account will be created momentarily. Please check your email for confirmation.",
      });

      // Reset form and clear card input
      form.reset();
      elements.getElement(CardElement)?.clear();

    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-primary relative overflow-hidden">
      <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm">
        Popular
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-6 w-6" />
          Pro Plan
        </CardTitle>
        <CardDescription>
          £5/month - Unlock premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feature list */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Download transformed CVs</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Preview transformed CVs in browser</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Organization insights from web scraping</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Detailed CV scoring and analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Full CV generation option</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Unlimited transformations</span>
          </div>
        </div>

        {/* Subscription form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I accept the{" "}
                        <Link href="/terms-of-service" className="text-primary hover:underline">
                          terms of service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy-policy" className="text-primary hover:underline">
                          privacy policy
                        </Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Card Element */}
            <div className="p-3 border rounded-md">
              <CardElement onChange={handleCardChange} />
            </div>
            {cardError && (
              <p className="text-sm text-red-500">{cardError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <CreditCard className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscribe Now - £5/month
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

// Main page component
export default function PricingPlansPage() {
  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Payment System Unavailable</h2>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <Elements stripe={stripePromise}>
          <PricingPlanContent />
        </Elements>
      </main>
    </div>
  );
}