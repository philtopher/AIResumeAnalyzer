import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Download, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PrivacyDashboardPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [processingRestricted, setProcessingRestricted] = useState(false);

  // Fetch user's privacy settings and activity
  const { data: privacyData, isLoading: isLoadingPrivacy } = useQuery({
    queryKey: ["/api/privacy/settings"],
    queryFn: async () => {
      const response = await fetch("/api/privacy/settings", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch privacy settings");
      return response.json();
    },
  });

  // Fetch user's activity data
  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["/api/privacy/activity"],
    queryFn: async () => {
      const response = await fetch("/api/privacy/activity", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch activity data");
      return response.json();
    },
  });

  // Mutation for requesting data deletion
  const deleteDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/privacy/delete-data", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to process deletion request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your data deletion request has been submitted. We will process it within 30 days.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating processing preferences
  const updateProcessingMutation = useMutation({
    mutationFn: async (restricted: boolean) => {
      const response = await fetch("/api/privacy/processing-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restricted }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update processing preferences");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your data processing preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingPrivacy || isLoadingActivity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleProcessingToggle = (checked: boolean) => {
    setProcessingRestricted(checked);
    updateProcessingMutation.mutate(checked);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Privacy Dashboard</h1>
            <Link href="/dashboard">
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Personal Data Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Personal Data Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Account Information</h3>
                  <p>Email: {user?.email}</p>
                  <p>Username: {user?.username}</p>
                  <p>Account Created: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(privacyData, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "my-data.json";
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download My Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityData?.activities.map((activity: any) => (
                  <div key={activity.id} className="flex justify-between items-start border-b pb-4">
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {typeof activity.details === 'object' 
                          ? JSON.stringify(activity.details) 
                          : activity.details}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="processing">Restrict Data Processing</Label>
                    <p className="text-sm text-muted-foreground">
                      Limit how we process your personal data
                    </p>
                  </div>
                  <Switch
                    id="processing"
                    checked={processingRestricted}
                    onCheckedChange={handleProcessingToggle}
                  />
                </div>

                <div className="border-t pt-6">
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Delete Account Data</AlertTitle>
                    <AlertDescription>
                      This action will initiate the deletion of all your personal data. This process
                      cannot be undone.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to request deletion of all your data? This action cannot be undone."
                        )
                      ) {
                        deleteDataMutation.mutate();
                      }
                    }}
                  >
                    Request Data Deletion
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} CV Transformer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}