import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Upload,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Lightbulb,
  Building,
  MessageSquare,
  Newspaper
} from "lucide-react";

type OrganizationalInsights = string[][];

type Feedback = {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  organizationalInsights: OrganizationalInsights;
};

export default function PublicCVPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [transformedCV, setTransformedCV] = useState<any>(null);
  const [transformedContent, setTransformedContent] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "targetRole",
      (e.currentTarget.elements.namedItem("role") as HTMLInputElement).value
    );
    formData.append(
      "jobDescription",
      (e.currentTarget.elements.namedItem("description") as HTMLTextAreaElement)
        .value
    );

    try {
      const response = await fetch("/api/cv/transform/public", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setTransformedCV(result);

      // Get the transformed content for display
      const contentResponse = await fetch(`/api/cv/${result.id}/content/public`);
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        setTransformedContent(content);
      }

      toast({
        title: "CV Transformed Successfully",
        description: "Your CV has been updated for the target role.",
      });
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

  async function handleDownload() {
    if (!transformedCV) return;

    try {
      const response = await fetch(
        `/api/cv/${transformedCV.id}/download/public?format=docx`
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transformed_cv.docx";
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

  async function handleView() {
    if (!transformedCV) return;

    try {
      const response = await fetch(`/api/cv/${transformedCV.id}/view/public`);
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const content = await response.text();
      setTransformedContent(content);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cv">Upload CV (PDF or DOCX)</Label>
                  <div className="border rounded-md p-4">
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
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

              {transformedCV && (
                <div className="mt-8 space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Transformed CV</h3>
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant="secondary"
                        onClick={handleView}
                        className="transition-all duration-200 hover:scale-[1.02]"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleDownload}
                        className="transition-all duration-200 hover:scale-[1.02]"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download as Word
                      </Button>
                    </div>

                    {transformedContent && (
                      <div className="bg-muted p-4 rounded-md mt-4">
                        <pre className="whitespace-pre-wrap text-sm">
                          {transformedContent}
                        </pre>
                      </div>
                    )}
                  </div>

                  {transformedCV.feedback && (
                    <>
                      <div className="space-y-4">
                        <h3 className="font-medium">Analysis & Feedback</h3>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <h4 className="font-medium">Strengths</h4>
                            </div>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {transformedCV.feedback.strengths.map(
                                (strength: string, i: number) => (
                                  <li key={i}>{strength}</li>
                                )
                              )}
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-red-500" />
                              <h4 className="font-medium">Areas for Improvement</h4>
                            </div>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {transformedCV.feedback.weaknesses.map(
                                (weakness: string, i: number) => (
                                  <li key={i}>{weakness}</li>
                                )
                              )}
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Lightbulb className="h-5 w-5 text-yellow-500" />
                              <h4 className="font-medium">Suggestions</h4>
                            </div>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {transformedCV.feedback.suggestions.map(
                                (suggestion: string, i: number) => (
                                  <li key={i}>{suggestion}</li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {transformedCV.feedback.organizationalInsights && (
                        <div className="space-y-4">
                          <h3 className="font-medium">Organization Insights</h3>
                          <div className="grid gap-4">
                            {/* Glassdoor Reviews */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Building className="h-5 w-5 text-blue-500" />
                                <h4 className="font-medium">Glassdoor Reviews</h4>
                              </div>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {(transformedCV.feedback.organizationalInsights[0] || []).map(
                                  (insight: string, i: number) => (
                                    <li key={i}>{insight}</li>
                                  )
                                )}
                              </ul>
                            </div>

                            {/* Indeed Reviews */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-purple-500" />
                                <h4 className="font-medium">Indeed Reviews</h4>
                              </div>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {(transformedCV.feedback.organizationalInsights[1] || []).map(
                                  (insight: string, i: number) => (
                                    <li key={i}>{insight}</li>
                                  )
                                )}
                              </ul>
                            </div>

                            {/* Latest News */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Newspaper className="h-5 w-5 text-orange-500" />
                                <h4 className="font-medium">Latest News</h4>
                              </div>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {(transformedCV.feedback.organizationalInsights[2] || []).map(
                                  (insight: string, i: number) => (
                                    <li key={i}>{insight}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}