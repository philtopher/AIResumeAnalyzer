import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building, Users, Target, Briefcase, TrendingUp, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const InterviewerFormSchema = z.object({
  interviewerName: z.string().min(1, "Interviewer name is required"),
  interviewerRole: z.string().min(1, "Role is required"),
  organizationName: z.string().min(1, "Organization name is required"),
  organizationWebsite: z.string().url("Please enter a valid website URL"),
});

const OrganizationFormSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  website: z.string().url("Please enter a valid website URL"),
});

export default function InterviewerAnalysisPage() {
  const [activeAnalysis, setActiveAnalysis] = useState<"interviewer" | "organization" | null>(null);
  const { toast } = useToast();

  const interviewerForm = useForm({
    resolver: zodResolver(InterviewerFormSchema),
    defaultValues: {
      interviewerName: "",
      interviewerRole: "",
      organizationName: "",
      organizationWebsite: "",
    },
  });

  const organizationForm = useForm({
    resolver: zodResolver(OrganizationFormSchema),
    defaultValues: {
      organizationName: "",
      website: "",
    },
  });

  const interviewerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof InterviewerFormSchema>) => {
      const response = await fetch("/api/pro/interviewer-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch interviewer insights");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Interviewer insights have been generated successfully.",
      });
      setActiveAnalysis("interviewer");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze interviewer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const organizationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof OrganizationFormSchema>) => {
      const response = await fetch("/api/pro/organization-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to analyze organization");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Organization analysis has been generated successfully.",
      });
      setActiveAnalysis("organization");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onInterviewerSubmit = (data: z.infer<typeof InterviewerFormSchema>) => {
    interviewerMutation.mutate(data);
  };

  const onOrganizationSubmit = (data: z.infer<typeof OrganizationFormSchema>) => {
    organizationMutation.mutate(data);
  };

  if (interviewerMutation.isLoading || organizationMutation.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Pro Analysis Tools</h1>
          <p className="text-xl text-muted-foreground">
            Get deep insights into your potential interviewers and target organizations
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Interviewer Analysis Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Analyze Interviewer</CardTitle>
              </div>
              <CardDescription>
                Get insights about your interviewer and their background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...interviewerForm}>
                <form onSubmit={interviewerForm.handleSubmit(onInterviewerSubmit)} className="space-y-4">
                  <FormField
                    control={interviewerForm.control}
                    name="interviewerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interviewer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={interviewerForm.control}
                    name="interviewerRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="Senior Engineering Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={interviewerForm.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={interviewerForm.control}
                    name="organizationWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Interviewer
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Organization Analysis Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-6 w-6 text-primary" />
                <CardTitle>Analyze Organization</CardTitle>
              </div>
              <CardDescription>
                Get comprehensive insights about the organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...organizationForm}>
                <form onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)} className="space-y-4">
                  <FormField
                    control={organizationForm.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={organizationForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Organization
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {activeAnalysis === "interviewer" && interviewerMutation.data && (
          <Card>
            <CardHeader>
              <CardTitle>Interviewer Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Background</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {interviewerMutation.data.insights.background.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Expertise</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {interviewerMutation.data.insights.expertise.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Recent Activity</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {interviewerMutation.data.insights.recentActivity.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Common Interests</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {interviewerMutation.data.insights.commonInterests.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeAnalysis === "organization" && organizationMutation.data && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Industry Position</h3>
                  <p>{organizationMutation.data.analysis.industryPosition}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Competitors</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {organizationMutation.data.analysis.competitors.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Recent Developments</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {organizationMutation.data.analysis.recentDevelopments.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Company Culture</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {organizationMutation.data.analysis.culture.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Tech Stack</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {organizationMutation.data.analysis.techStack.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}