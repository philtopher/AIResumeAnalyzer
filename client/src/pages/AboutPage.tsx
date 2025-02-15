import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Brain,
  Target,
  BarChart,
  Shield,
  Users,
} from "lucide-react";

export default function AboutPage() {
  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Transformation",
      description: "Advanced natural language processing optimizes your CV for specific roles while maintaining accuracy.",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Role-Targeted Optimization",
      description: "Intelligent matching of your experience with job requirements for better application success.",
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Comprehensive Analytics",
      description: "Detailed feedback and scoring to help improve your CV's impact.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Ethical AI Practices",
      description: "We enhance real experience only - never generating fake credentials or experience.",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "ATS-Friendly Format",
      description: "Optimized formatting to ensure your CV passes through Applicant Tracking Systems.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "User-Centric Design",
      description: "Intuitive interface with seamless experience from upload to transformation.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-6">
              About CV Transformer
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              An advanced AI-powered platform that provides intelligent, role-targeted resume optimization 
              for professionals, focusing on accuracy and ethical transformation.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/public-cv">
                <Button size="lg">Try Demo</Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" size="lg">View Features</Button>
              </Link>
            </div>
          </div>

          {/* Core Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              Our Core Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Mission Statement */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              To empower professionals in their career journey by providing ethical, 
              AI-driven CV optimization that enhances their real experiences and 
              achievements for better job opportunities.
            </p>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Link href="/how-it-works">
              <Button size="lg" variant="outline" className="mr-4">
                See How It Works
              </Button>
            </Link>
            <Link href="/public-cv">
              <Button size="lg">
                Transform Your CV
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
