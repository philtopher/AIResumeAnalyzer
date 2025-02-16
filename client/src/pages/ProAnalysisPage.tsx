import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const analysisFormSchema = z.object({
  interviewer1: z.string().min(2, "Name must be at least 2 characters"),
  interviewer2: z.string().optional(),
  interviewer3: z.string().optional(),
  organization: z.string().min(2, "Organization name must be at least 2 characters"),
});

type AnalysisFormValues = z.infer<typeof analysisFormSchema>;

interface AnalysisResult {
  interviewers: {
    name: string;
    specialization: string[];
    likelyQuestions: string[];
    expertise: string[];
    preferences: string[];
  }[];
  organization: {
    competitors: string[];
    strengths: string[];
    improvements: string[];
    marketPosition: string;
  };
}

export default function ProAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      interviewer1: "",
      interviewer2: "",
      interviewer3: "",
      organization: "",
    },
  });

  async function onSubmit(data: AnalysisFormValues) {
    setLoading(true);
    try {
      const response = await fetch("/api/pro/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch analysis");
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Pro Analysis Tools</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Interview & Competition Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="interviewer1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Interviewer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter interviewer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interviewer2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Second Interviewer Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter interviewer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interviewer3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Third Interviewer Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter interviewer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organization name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Analyze
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {analysisResult && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {analysisResult.interviewers.map((interviewer, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-semibold text-lg">{interviewer.name}</h3>
                  <div>
                    <h4 className="font-medium">Specialization:</h4>
                    <ul className="list-disc pl-5">
                      {interviewer.specialization.map((spec, i) => (
                        <li key={i}>{spec}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Likely Questions:</h4>
                    <ul className="list-disc pl-5">
                      {interviewer.likelyQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-lg mb-3">Competitor Analysis</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Key Competitors:</h4>
                    <ul className="list-disc pl-5">
                      {analysisResult.organization.competitors.map((comp, i) => (
                        <li key={i}>{comp}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Organizational Strengths:</h4>
                    <ul className="list-disc pl-5">
                      {analysisResult.organization.strengths.map((str, i) => (
                        <li key={i}>{str}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Areas for Improvement:</h4>
                    <ul className="list-disc pl-5">
                      {analysisResult.organization.improvements.map((imp, i) => (
                        <li key={i}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
