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
import FeedbackForm from "@/components/FeedbackForm";


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
              <div className="text-center space-y-6 py-8">
                <h2 className="text-3xl font-bold">Upgrade Your Career with AI-Powered CV Transformation</h2>
                <p className="text-muted-foreground">
                  Our AI-powered CV transformation service helps you stand out from the competition by tailoring your CV to specific job roles and descriptions.
                </p>
                
                <div className="bg-primary/10 p-6 rounded-lg my-8">
                  <h3 className="text-xl font-semibold mb-4">Choose a Subscription Plan</h3>
                  
                  <div className="grid gap-6 md:grid-cols-3 mb-6">
                    {/* Basic Plan */}
                    <div className="border rounded-lg p-4 flex flex-col">
                      <h4 className="font-bold text-lg">Basic Plan</h4>
                      <p className="text-2xl font-bold my-2">£3 <span className="text-sm font-normal">/month</span></p>
                      <ul className="list-disc list-inside text-sm space-y-2 mb-4 flex-grow">
                        <li>10 CV transformations per month</li>
                        <li>AI-powered CV analysis</li>
                        <li>Job-specific optimization</li>
                      </ul>
                      <Button variant="outline" className="w-full" onClick={() => window.location.href = "/register"}>
                        Choose Basic
                      </Button>
                    </div>
                    
                    {/* Standard Plan */}
                    <div className="border rounded-lg p-4 flex flex-col relative bg-primary/5">
                      <div className="absolute -top-3 left-0 right-0 flex justify-center">
                        <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                          POPULAR
                        </span>
                      </div>
                      <h4 className="font-bold text-lg">Standard Plan</h4>
                      <p className="text-2xl font-bold my-2">£5 <span className="text-sm font-normal">/month</span></p>
                      <ul className="list-disc list-inside text-sm space-y-2 mb-4 flex-grow">
                        <li>20 CV transformations per month</li>
                        <li>AI-powered CV analysis</li>
                        <li>Job-specific optimization</li>
                        <li>Advanced competition insights</li>
                      </ul>
                      <Button className="w-full" onClick={() => window.location.href = "/register"}>
                        Choose Standard
                      </Button>
                    </div>
                    
                    {/* Pro Plan */}
                    <div className="border rounded-lg p-4 flex flex-col">
                      <h4 className="font-bold text-lg">Pro Plan</h4>
                      <p className="text-2xl font-bold my-2">£30 <span className="text-sm font-normal">/month</span></p>
                      <ul className="list-disc list-inside text-sm space-y-2 mb-4 flex-grow">
                        <li>Unlimited CV transformations</li>
                        <li>Priority processing</li>
                        <li>Enhanced feedback & analysis</li>
                        <li>Organizational insights</li>
                        <li>Interviewer analysis tools</li>
                      </ul>
                      <Button variant="outline" className="w-full" onClick={() => window.location.href = "/register"}>
                        Choose Pro
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    All plans include secure payment processing and SSL encryption. 
                    Cancel anytime. No free trials available.
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    size="lg" 
                    className="animate-pulse"
                    onClick={() => window.location.href = "/register"}
                  >
                    Get Started Now
                  </Button>
                </div>
              </div>
              {/* Add feedback form section */}
              <div className="mt-12 pt-8 border-t">
                <h2 className="text-2xl font-semibold mb-6">Send Us Your Feedback</h2>
                <Card>
                  <CardContent className="pt-6">
                    <FeedbackForm />
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}