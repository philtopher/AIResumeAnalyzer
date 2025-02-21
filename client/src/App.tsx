import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Loader2, Menu, FileText, Shield, Activity, Users } from "lucide-react";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import FeaturesPage from "./pages/FeaturesPage";
import PublicCVPage from "./pages/PublicCVPage";
import TutorialPage from "./pages/TutorialPage";
import ContactPage from "./pages/ContactPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import { useUser } from "./hooks/use-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import AboutPage from "./pages/AboutPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PrivacyDashboardPage from "./pages/PrivacyDashboardPage";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";
import UpgradePlanPage from "./pages/UpgradePlanPage";
import MetricsPage from "./pages/MetricsPage";
import AnalysisPage from "./pages/AnalysisPage";
import PaymentCompletePage from "./pages/PaymentCompletePage";
import InterviewerAnalysisPage from "./pages/InterviewerAnalysisPage";
import { Footer } from "./components/Footer"; // Added import


// Add type for user subscription
type User = {
  id: number;
  username: string;
  email: string;
  role: "user" | "sub_admin" | "super_admin";
  subscription: {
    status: "active" | "inactive" | "canceled";
  } | null;
};

function Navigation() {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  // Check user roles and subscription
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = isSuperAdmin || user?.role === "sub_admin";
  const isProUser = user?.subscription?.status === "active";

  const menuItems = [
    { label: "About", path: "/about" },
    { label: "How It Works", path: "/how-it-works" },
    { label: "Try Demo", path: "/public-cv" },
    { label: "Contact", path: "/contact" },
  ];

  // Base authenticated items that all logged-in users see
  const authenticatedItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Privacy Settings", path: "/privacy-dashboard" },
  ];

  // Add Pro features for Pro users
  if (isProUser) {
    authenticatedItems.push(
      { label: "Employer Competition Analysis", path: "/analysis" },
      { label: "Interviewer Analysis", path: "/interviewer-analysis" }
    );
  }
  // Only show upgrade link for non-pro users
  else if (user) {
    authenticatedItems.push({ label: "Upgrade to Pro", path: "/upgrade" });
  }

  // Add admin link if user is admin/super admin
  if (isAdmin) {
    authenticatedItems.push({ label: "Admin", path: "/admin" });
  }

  return (
    <nav className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            CV Transformer
          </span>
        </Link>

        {/* Desktop Navigation */}
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
                  <Button variant="ghost">
                    {item.label}
                    {item.label === "Employer Competition Analysis" && <Activity className="ml-2 h-4 w-4" />}
                    {item.label === "Interviewer Analysis" && <Users className="ml-2 h-4 w-4" />}
                  </Button>
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

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className="cursor-pointer"
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
                      className="cursor-pointer"
                    >
                      {item.label}
                      {item.label === "Employer Competition Analysis" && <Activity className="ml-2 h-4 w-4" />}
                      {item.label === "Interviewer Analysis" && <Users className="ml-2 h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-500 hover:text-red-600"
                  >
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={() => setLocation("/auth")}
                  className="cursor-pointer font-medium"
                >
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

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check user roles and subscription
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = isSuperAdmin || user?.role === "sub_admin";
  const isProUser = user?.subscription?.status === "active";

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/how-it-works" component={TutorialPage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/public-cv" component={PublicCVPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms-of-service" component={TermsOfServicePage} />
          <Route path="/upgrade" component={UpgradePlanPage} />
          <Route path="/payment-success" component={PaymentSuccessPage} />
          <Route path="/payment-complete" component={PaymentCompletePage} />
          {user && (
            <>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/privacy-dashboard" component={PrivacyDashboardPage} />
              {isProUser && (
                <>
                  <Route path="/analysis" component={AnalysisPage} />
                  <Route path="/interviewer-analysis" component={InterviewerAnalysisPage} />
                </>
              )}
            </>
          )}
          {isAdmin && (
            <>
              <Route path="/admin" component={AdminDashboardPage} />
              <Route path="/metrics" component={MetricsPage} />
            </>
          )}
          {isSuperAdmin && (
            <Route path="/super-admin" component={SuperAdminDashboardPage} />
          )}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
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

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  );
}