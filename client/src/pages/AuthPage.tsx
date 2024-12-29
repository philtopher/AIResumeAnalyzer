import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, register } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const email = formData.get("email") as string;

    try {
      if (isLogin) {
        const result = await login({ username, password });
        if (!result.ok) {
          throw new Error(result.message);
        }
      } else {
        const result = await register({ username, password, email });
        if (!result.ok) {
          throw new Error(result.message);
        }
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
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
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
              className="text-sm text-muted-foreground hover:underline"
              onClick={() => setIsLogin(!isLogin)}
              type="button"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </button>

            {isLogin && (
              <div>
                <button
                  className="text-sm text-muted-foreground hover:underline"
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