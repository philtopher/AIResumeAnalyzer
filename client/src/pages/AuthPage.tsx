import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { usePasswordStrength } from "@/hooks/use-password-strength";
import { AnimatePresence, motion } from "framer-motion";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, register } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendEmailSent, setResendEmailSent] = useState(false);
  const { score, feedback, color, label } = usePasswordStrength(password);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;

    if (!isLogin && password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const result = await login({ username, password, email });
        if (!result.ok) {
          // Check if the error is due to unverified email
          if (result.message.includes("verify your email")) {
            toast({
              title: "Email Not Verified",
              description: "Please check your email for the verification link. A new verification email has been sent.",
              duration: 6000,
            });
            setResendEmailSent(true);
          } else {
            throw new Error(result.message);
          }
          return;
        }
      } else {
        if (score < 2) {
          toast({
            title: "Weak Password",
            description: "Please choose a stronger password",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const result = await register({ username, password, email });
        if (!result.ok) {
          throw new Error(result.message);
        }

        toast({
          title: "Registration successful",
          description: "Please check your email to verify your account.",
          duration: 6000,
        });
        return;
      }

      toast({
        title: isLogin ? "Login successful" : "Registration successful",
        description: "Welcome to CV Transformer!",
      });

      setLocation("/dashboard");
    } catch (error: any) {
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? "Login" : "Create Account"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                required
                disabled={isLoading}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={isLoading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {!isLogin && password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} transition-all duration-300`}
                      style={{ width: `${(score + 1) * 20}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Password strength: {label}
                  </p>
                  {feedback.length > 0 && (
                    <ul className="text-sm text-muted-foreground list-disc pl-4">
                      {feedback.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </div>

            {!isLogin && (
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
            )}

            {resendEmailSent && (
              <div className="text-sm text-muted-foreground text-center">
                A new verification email has been sent. Please check your inbox.
              </div>
            )}

            <Button
              type="submit"
              className="w-full transition-all duration-200 hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLogin ? (
                "Login"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button
              className="text-sm text-muted-foreground hover:underline transition-colors"
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword("");
                setConfirmPassword("");
              }}
              type="button"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </button>

            {isLogin && (
              <div>
                <button
                  className="text-sm text-muted-foreground hover:underline transition-colors"
                  onClick={() => setLocation("/reset-password")}
                  type="button"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}