import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { usePasswordStrength } from "@/hooks/use-password-strength";
import { AnimatePresence, motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import StripeCheckout from "@/components/StripeCheckout";

interface RegistrationData {
  username: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const { score, feedback, color, label } = usePasswordStrength(password);

  // Stage of the registration process
  // 1. form - Initial registration form
  // 2. payment - Payment stage with Stripe
  const [stage, setStage] = useState<"form" | "payment">("form");
  
  // Store temporary user data after form submission, before payment
  const [tempUserData, setTempUserData] = useState<{ id: number; username: string } | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    // Validate form data
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (score < 2) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password for better security.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const registrationData: RegistrationData = {
      username,
      email,
      password
    };

    try {
      // Create a temporary user record
      const response = await apiRequest("POST", "/api/register-temp", registrationData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      setTempUserData(data.user);
      
      // Initialize payment flow
      const paymentResponse = await apiRequest("POST", "/api/create-checkout-session", {
        plan: "basic", // Default to basic plan for registration
        userId: data.user.id
      });
      
      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.message || 'Payment initialization failed');
      }
      
      const paymentData = await paymentResponse.json();
      
      // Redirect to Stripe checkout page
      window.location.href = paymentData.url;
      
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handlePaymentSuccess() {
    toast({
      title: "Payment Successful",
      description: "Your registration is now complete. Redirecting to dashboard...",
    });
    setTimeout(() => {
      setLocation("/dashboard");
    }, 2000);
  }

  function handlePaymentError(message: string) {
    toast({
      title: "Payment Failed",
      description: message,
      variant: "destructive",
    });
    setStage("form");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{stage === "form" ? "Create Account" : "Complete Payment"}</CardTitle>
          {stage === "form" && (
            <CardDescription>
              Register for CV Transformer with a £3 Basic Plan subscription
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {stage === "form" ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 flex-1 rounded-full transition-colors ${
                              i < score
                                ? `bg-${color}-500`
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          />
                        ))}
                      </div>
                      <p
                        className={`text-xs font-medium text-${color}-600 dark:text-${color}-400`}
                      >
                        {label}
                      </p>
                      {feedback.length > 0 && (
                        <ul className="text-xs text-gray-500 space-y-1 mt-1 list-disc pl-4">
                          {feedback.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full transition-all duration-200 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Continue to Payment (£3/month)"
                )}
              </Button>

              <div className="mt-4 text-center">
                <button
                  className="text-sm text-muted-foreground hover:underline transition-colors"
                  onClick={() => setLocation("/login")}
                  type="button"
                >
                  Already have an account? Login
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please complete your payment to activate your account. You will be charged £3 for the Basic Plan subscription.
              </p>
              
              {clientSecret && (
                <StripeCheckout 
                  planType="basic"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStage("form")}
                disabled={isLoading}
              >
                Back to Registration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}