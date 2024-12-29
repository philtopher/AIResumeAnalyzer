import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Loader2, Menu } from "lucide-react";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import FeaturesPage from "./pages/FeaturesPage";
import { useUser } from "./hooks/use-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Navigation() {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <nav className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          CV Transformer
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          <Link href="/features">
            <Button variant="ghost">Features</Button>
          </Link>
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              {user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost">Admin</Button>
                </Link>
              )}
              <Button onClick={handleLogout} variant="ghost">
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button>Get Started</Button>
            </Link>
          )}
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation("/features")}>
                Features
              </DropdownMenuItem>
              {user ? (
                <>
                  <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                    Dashboard
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => setLocation("/admin")}>
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setLocation("/auth")}>
                  Get Started
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && window.location.pathname !== "/reset-password" && 
      window.location.pathname !== "/" && 
      window.location.pathname !== "/features") {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/dashboard" component={DashboardPage} />
          {user?.role === "admin" && (
            <Route path="/admin" component={AdminPage} />
          )}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthenticatedApp />
      <Toaster />
    </QueryClientProvider>
  );
}