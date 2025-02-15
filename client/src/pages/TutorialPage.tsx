import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Upload, 
  Download, 
  Star, 
  Zap, 
  CheckCircle, 
  Brain,
  Search,
  Shield,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

export default function TutorialPage() {
  // Process steps for the flow diagram
  const processSteps = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Upload CV",
      description: "Upload your current CV",
      color: "text-blue-500",
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI Analysis",
      description: "AI analyzes content and structure",
      color: "text-purple-500",
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Optimization",
      description: "Content is optimized for target role",
      color: "text-green-500",
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "Download",
      description: "Get your transformed CV",
      color: "text-orange-500",
    },
  ];

  // Example CV transformation
  const beforeAfterExample = {
    before: {
      title: "Software Developer",
      experience: [
        "Worked on web applications using React",
        "Helped team with code reviews",
        "Fixed bugs in the system"
      ]
    },
    after: {
      title: "Senior Frontend Engineer",
      experience: [
        "Led development of mission-critical React applications, improving performance by 40%",
        "Implemented robust code review processes, reducing production bugs by 60%",
        "Orchestrated system-wide bug fixes, resulting in 99.9% uptime"
      ]
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl font-bold mb-4">
              See the Transformation Process
            </h1>
            <p className="text-xl text-muted-foreground">
              Watch how our AI transforms your CV while maintaining accuracy
            </p>
          </motion.div>

          {/* Flow Diagram */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">
              The Transformation Flow
            </h2>
            <div className="relative">
              {/* Process Steps */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {processSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                  >
                    <Card className="relative h-full">
                      {index < processSteps.length - 1 && (
                        <div className="hidden md:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                          <ArrowRight className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent className="pt-6">
                        <div className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 ${step.color}`}>
                          {step.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Before/After Example */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">
              Before & After Example
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Before CV */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Original CV</CardTitle>
                    <CardDescription>Basic job description and experience</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Job Title</h4>
                        <p className="text-muted-foreground">{beforeAfterExample.before.title}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Experience</h4>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                          {beforeAfterExample.before.experience.map((exp, index) => (
                            <li key={index}>{exp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* After CV */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle>AI-Optimized CV</CardTitle>
                    <CardDescription>Enhanced with quantifiable achievements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Enhanced Job Title</h4>
                        <p className="text-muted-foreground">{beforeAfterExample.after.title}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Optimized Experience</h4>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                          {beforeAfterExample.after.experience.map((exp, index) => (
                            <li key={index}>{exp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-6">Ready to Transform Your CV?</h2>
            <Link href="/public-cv">
              <Button size="lg" className="animate-pulse">
                Try It Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}