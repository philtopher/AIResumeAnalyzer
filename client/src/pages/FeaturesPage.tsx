import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Elements } from "@stripe/stripe-js";
import { CardElement } from "@stripe/react-stripe-js";
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
import { useState } from "react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
    const form = useForm<z.infer<typeof signupSchema>>({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        email: "",
        password: "",
        confirmPassword: "",
        username: "",
        acceptTerms: false,
      },
    });

    const handleCardChange = (event: any) => {
      if (event.error) {
        setCardError(event.error.message);
      } else {
        setCardError("");
      }
    };

    async function onSubmit(values: z.infer<typeof signupSchema>) {
      try {
        setIsLoading(true);

        if (cardError) {
          throw new Error(cardError);
        }

        // Create payment intent
        const response = await fetch("/api/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            username: values.username,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create subscription");
        }

        const { clientSecret } = await response.json();

        // Load Stripe
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to load");

        // Confirm payment
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: document.querySelector('#card-element') as any,
            billing_details: {
              email: values.email,
            },
          },
        });

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        // Create user account
        const registerResponse = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!registerResponse.ok) {
          throw new Error("Failed to create account");
        }

        toast({
          title: "Success!",
          description: "Your pro account has been created. Check your email for confirmation.",
        });

      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Something went wrong",
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

                    <div id="card-element" className="p-3 border rounded-md">
                      <CardElement onChange={handleCardChange} />
                    </div>
                    {cardError && (
                      <p className="text-sm text-red-500 mt-2">{cardError}</p>
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

  export default function PricingPlansPage() {
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