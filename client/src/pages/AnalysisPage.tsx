import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AnalysisResult = {
  interviewers: {
    name: string;
    specialization: string[];
    interests: string[];
    likelyQuestions: string[];
    answerExpectations: string[];
  }[];
  organization: {
    competitors: {
      name: string;
      strengths: string[];
      weaknesses: string[];
    }[];
    marketPosition: {
      leadingAreas: string[];
      improvementAreas: string[];
    };
  };
};

export default function AnalysisPage() {
  const { user } = useUser();
  const [interviewer1, setInterviewer1] = useState("");
  const [interviewer2, setInterviewer2] = useState("");
  const [interviewer3, setInterviewer3] = useState("");
  const [organization, setOrganization] = useState("");

  const isPro = user?.subscription?.status === "active";

  const analysisMutation = useMutation({
    mutationFn: async (data: {
      interviewers: string[];
      organization: string;
    }) => {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to perform analysis");
      }
      return response.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const interviewers = [interviewer1, interviewer2, interviewer3].filter(
      Boolean
    );
    if (!organization || interviewers.length === 0) {
      return;
    }

    analysisMutation.mutate({
      interviewers,
      organization,
    });
  };

  if (!isPro) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pro Feature: Advanced Analysis</CardTitle>
            <CardDescription>
              This feature is only available to Pro Plan users. Please upgrade to
              access detailed interviewer and competitor analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" onClick={() => window.location.href = "/upgrade"}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Advanced Interview & Competition Analysis
            </CardTitle>
            <CardDescription>
              Get detailed insights about your interviewers and organizational
              competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="interviewer1">First Interviewer Name</Label>
                  <Input
                    id="interviewer1"
                    value={interviewer1}
                    onChange={(e) => setInterviewer1(e.target.value)}
                    placeholder="Enter interviewer name"
                  />
                </div>
                <div>
                  <Label htmlFor="interviewer2">Second Interviewer Name</Label>
                  <Input
                    id="interviewer2"
                    value={interviewer2}
                    onChange={(e) => setInterviewer2(e.target.value)}
                    placeholder="Enter interviewer name (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="interviewer3">Third Interviewer Name</Label>
                  <Input
                    id="interviewer3"
                    value={interviewer3}
                    onChange={(e) => setInterviewer3(e.target.value)}
                    placeholder="Enter interviewer name (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="organization">Organization Name</Label>
                  <Input
                    id="organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Enter organization name"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={analysisMutation.isPending || !organization}
                className="w-full"
              >
                {analysisMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Perform Analysis"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {analysisMutation.isSuccess && (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Interviewer Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {analysisMutation.data.interviewers.map((interviewer, index) => (
                  <div key={index} className="space-y-4">
                    <h3 className="text-lg font-semibold">{interviewer.name}</h3>
                    <div>
                      <h4 className="font-medium">Areas of Specialization</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewer.specialization.map((spec, i) => (
                          <li key={i}>{spec}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium">Professional Interests</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewer.interests.map((interest, i) => (
                          <li key={i}>{interest}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium">Likely Questions</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewer.likelyQuestions.map((question, i) => (
                          <li key={i}>{question}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium">Expected Answer Characteristics</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewer.answerExpectations.map((expectation, i) => (
                          <li key={i}>{expectation}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Competitor Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Market Position</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-green-600">Leading Areas</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysisMutation.data.organization.marketPosition.leadingAreas.map(
                          (area, i) => (
                            <li key={i}>{area}</li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-amber-600">Areas for Improvement</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysisMutation.data.organization.marketPosition.improvementAreas.map(
                          (area, i) => (
                            <li key={i}>{area}</li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Competitor Breakdown</h3>
                  <div className="space-y-4">
                    {analysisMutation.data.organization.competitors.map(
                      (competitor, index) => (
                        <div key={index} className="border p-4 rounded-lg">
                          <h4 className="font-medium">{competitor.name}</h4>
                          <div className="grid md:grid-cols-2 gap-4 mt-2">
                            <div>
                              <h5 className="text-sm font-medium text-green-600">
                                Strengths
                              </h5>
                              <ul className="list-disc pl-5 space-y-1">
                                {competitor.strengths.map((strength, i) => (
                                  <li key={i}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-amber-600">
                                Weaknesses
                              </h5>
                              <ul className="list-disc pl-5 space-y-1">
                                {competitor.weaknesses.map((weakness, i) => (
                                  <li key={i}>{weakness}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {analysisMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to perform analysis. Please try again later.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
