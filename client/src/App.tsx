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
import PublicCVPage from "./pages/PublicCVPage";
import TutorialPage from "./pages/TutorialPage";
import ContactPage from "./pages/ContactPage";
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

  const isAdmin = user?.role === "super_admin" || user?.role === "sub_admin";

  const menuItems = [
    { label: "How It Works", path: "/tutorial" },
    { label: "Features", path: "/features" },
    { label: "Try Demo", path: "/public-cv" },
    { label: "Contact", path: "/contact" },
  ];

  const authenticatedItems = [
    { label: "Dashboard", path: "/dashboard" },
    ...(isAdmin ? [{ label: "Admin", path: "/admin" }] : []),
  ];

  return (
    <nav className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          CV Transformer
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          {menuItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button variant="ghost">{item.label}</Button>
            </Link>
          ))}
          {user ? (
            <>
              {authenticatedItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button variant="ghost">{item.label}</Button>
                </Link>
              ))}
              <Button onClick={handleLogout} variant="ghost">
                Logout ({user.username})
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
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
              {user ? (
                <>
                  {authenticatedItems.map((item) => (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => setLocation(item.path)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout ({user.username})
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/tutorial" component={TutorialPage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/public-cv" component={PublicCVPage} />
          <Route path="/contact" component={ContactPage} />
          {(!user && window.location.pathname !== "/reset-password" && 
            window.location.pathname !== "/" && 
            window.location.pathname !== "/features" &&
            window.location.pathname !== "/tutorial" &&
            window.location.pathname !== "/public-cv" &&
            window.location.pathname !== "/contact") ? (
            <Route component={AuthPage} />
          ) : (
            <>
              <Route path="/dashboard" component={DashboardPage} />
              {(user?.role === "super_admin" || user?.role === "sub_admin") && (
                <Route path="/admin" component={AdminPage} />
              )}
            </>
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