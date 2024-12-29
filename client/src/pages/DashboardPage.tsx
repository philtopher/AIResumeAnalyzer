import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { useCVHistory } from "@/hooks/use-cv-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Download, Eye } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function DashboardPage() {
  const { user } = useUser();
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();
  const { cvs, isLoading: isLoadingCVs } = useCVHistory();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Consider admin users as having pro access
  const hasPro = user?.role === "admin" || subscription?.status === "active";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetRole", (e.currentTarget.elements.namedItem("role") as HTMLInputElement).value);
    formData.append("jobDescription", (e.currentTarget.elements.namedItem("description") as HTMLTextAreaElement).value);

    try {
      const response = await fetch("/api/cv/transform", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/cv/history"] });

      toast({
        title: "CV Transformed Successfully",
        description: "Your CV has been updated for the target role.",
      });

      // Clear form
      setFile(null);
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDownload(cvId: number) {
    try {
      const response = await fetch(`/api/cv/${cvId}/download`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transformed_cv.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleView(cvId: number) {
    try {
      const response = await fetch(`/api/cv/${cvId}/view`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.username}
            </span>
            {!hasPro && user?.role !== "admin" && (
              <Link href="/features">
                <Button variant="secondary">Upgrade to Pro</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Transform Your CV</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cv">Upload CV (PDF or DOCX)</Label>
                  <div className="border rounded-md p-4">
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf,.docx"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="cv"
                      className="flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {file ? file.name : "Click to upload"}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Target Role</Label>
                  <Input id="role" name="role" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={5}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full transition-all duration-200 hover:scale-[1.02]"
                  disabled={isProcessing || !file}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Transform CV"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transformations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingCVs ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </div>
                ) : !cvs?.length ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-2" />
                    <p>No recent transformations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cvs.map((cv) => (
                      <Card key={cv.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{cv.targetRole}</h3>
                              <p className="text-sm text-muted-foreground">
                                Score: {cv.score}
                              </p>
                            </div>
                            {hasPro && (
                              <div className="space-x-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleView(cv.id)}
                                  className="transition-all duration-200 hover:scale-[1.02]"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleDownload(cv.id)}
                                  className="transition-all duration-200 hover:scale-[1.02]"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}