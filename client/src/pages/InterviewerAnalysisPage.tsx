import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building, Users, Target, Briefcase, TrendingUp } from "lucide-react";

export default function InterviewerAnalysisPage() {
  // Fetch company and interviewer insights
  const { data: insights, isLoading } = useQuery({
    queryKey: ["/api/interviewer-insights"],
    queryFn: async () => {
      const response = await fetch("/api/interviewer-insights", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch insights");
      return response.json();
    },
  });

  if (isLoading) {
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
          <h1 className="text-4xl font-bold mb-4">Interviewer Analysis</h1>
          <p className="text-xl text-muted-foreground">
            Gain deep insights into your target companies and potential interviewers
          </p>
        </div>

        {/* Company Culture Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              <CardTitle>Company Culture Analysis</CardTitle>
            </div>
            <CardDescription>
              Understanding the company's values and work environment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Core Values</h3>
                <ul className="space-y-2">
                  <li>Innovation-driven culture</li>
                  <li>Emphasis on collaboration</li>
                  <li>Work-life balance focus</li>
                </ul>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Work Environment</h3>
                <ul className="space-y-2">
                  <li>Hybrid work model</li>
                  <li>Agile methodology</li>
                  <li>Continuous learning emphasis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Process Insights */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>Interview Process Insights</CardTitle>
            </div>
            <CardDescription>
              Detailed breakdown of the company's interview stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-semibold">1</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold">Initial Screening</h4>
                    <p className="text-sm text-muted-foreground">
                      30-minute call with HR focusing on background and experience
                    </p>
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-semibold">2</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold">Technical Assessment</h4>
                    <p className="text-sm text-muted-foreground">
                      Coding challenge or technical discussion
                    </p>
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold">Team Interview</h4>
                    <p className="text-sm text-muted-foreground">
                      Meet with potential team members and discuss collaboration
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Career Growth Opportunities */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <CardTitle>Career Growth Opportunities</CardTitle>
            </div>
            <CardDescription>
              Understanding potential career paths and advancement opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Development Programs</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Mentorship programs
                  </li>
                  <li className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Leadership training
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cross-functional projects
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Advancement Paths</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Technical specialist track
                  </li>
                  <li className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Management track
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Architecture track
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-8">
          <Button size="lg" className="mr-4">
            Download Full Report
          </Button>
          <Button variant="outline" size="lg">
            Schedule Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}