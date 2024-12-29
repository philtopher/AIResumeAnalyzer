import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, Eye } from "lucide-react";

export default function PublicCVPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [transformedCV, setTransformedCV] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetRole", (e.currentTarget.elements.namedItem("role") as HTMLInputElement).value);
    formData.append("jobDescription", (e.currentTarget.elements.namedItem("description") as HTMLTextAreaElement).value);

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
      const response = await fetch(`/api/cv/${transformedCV.id}/download/public`);
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

  async function handleView() {
    if (!transformedCV) return;

    try {
      const response = await fetch(`/api/cv/${transformedCV.id}/view/public`);
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Transform Your CV (Public Demo)</CardTitle>
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

              {transformedCV && (
                <div className="mt-8 space-y-4">
                  <h3 className="font-medium">Transformed CV</h3>
                  <div className="flex gap-2">
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
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
