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

          {/* Subscription Plans */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">
              Choose Your Plan
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Standard Plan */}
              <motion.div
                initial={{ opacity:
 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Standard Plan</CardTitle>
                    <CardDescription>£5/month - Essential CV tools</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Basic CV transformation</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Download transformed CVs</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Basic keyword optimization</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pro Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card className="border-primary relative">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-bl">
                    Best Value
                  </div>
                  <CardHeader>
                    <CardTitle>Pro Plan</CardTitle>
                    <CardDescription>£15/month - Premium features</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>All Standard Plan features</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Advanced CV Analysis</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Employer Competition Analysis</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Interviewer LinkedIn Insights</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Payment Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold mb-8 text-center">
              Multiple Payment Options
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-center items-center gap-8 py-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">Credit Card</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" fill="#000000" />
                        <path d="M17.5 12C17.5 10.07 16.43 8.32 14.95 7.4C13.87 6.73 12.57 6.5 11.26 6.7C8.46 7.15 6.3 9.65 6.5 12.5C6.7 15.35 9.01 17.7 11.86 17.95C12.31 18 12.76 17.99 13.21 17.93C15.39 17.67 17.17 16.15 17.47 13.95C17.5 13.55 17.5 12.61 17.5 12Z" fill="#ffffff" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Apple Pay</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.97 7.94H13.96V9.76H18.97C19.68 9.76 20.11 10.31 20.11 11.02C20.11 11.47 19.95 11.86 19.68 12.05C19.47 12.23 19.2 12.31 18.91 12.31H16.74C15.85 12.31 15.04 12.69 14.51 13.32C14.03 13.89 13.81 14.59 13.81 15.31C13.81 16.13 14.1 16.95 14.61 17.55C15.1 18.13 15.79 18.46 16.52 18.46H20.16V20.27H16.5C15.27 20.27 14.12 19.76 13.29 18.82C12.47 17.87 12.03 16.63 12.03 15.34C12.03 14.2 12.36 13.11 12.99 12.23C13.84 11.04 15.17 10.36 16.58 10.36H18.92C19.31 10.4 19.4 10.11 19.4 10.02C19.4 9.93 19.38 9.63 18.97 9.63H13.95C13.84 8.41 13.26 7.28 12.32 6.46C11.2 5.48 9.74 5 8.29 5.12C5.92 5.32 3.9 7.04 3.26 9.34C2.5 12.08 3.58 14.97 5.8 16.58C6.76 17.26 7.9 17.63 9.07 17.63H11.89V19.44H9.05C7.54 19.44 6.1 18.96 4.87 18.08C3.37 17 2.31 15.43 1.82 13.66C1.32 11.88 1.44 10.01 2.15 8.31C3.01 6.22 4.59 4.55 6.64 3.58C8.68 2.6 11 2.42 13.19 3.06C15.36 3.7 17.18 5.11 18.29 7C18.63 7.57 18.89 8.18 19.08 8.82C19.1 8.89 19.11 8.95 19.12 9.02C19.09 9.01 19.06 9 19.02 9H18.97V7.94Z" fill="#5F6368" />
                        <path d="M19.5 9H13.5V10.5H19.5C20.5 10.5 20.5 12 19.5 12H16.5C14 12 13.5 15.5 16 16.5H21V18H16.5C13 18 12 14 14.5 12.5C14 12.5 13.5 12 13.5 10.5C13.5 9 14 8 14.5 7.5C13 6 12 3 15 2.5C18.5 2 19.5 5 19.5 6V9Z" fill="#4285F4" />
                        <path d="M3 8C3 6.5 5 4 8.5 4C12 4 13 7 11.5 8.5C14 10 12.5 14 9 14H4C2 14 2 11.5 3 10C2.33333 9.83333 3 8.6 3 8Z" fill="#4285F4" />
                        <path d="M9 14H12V19H9C6.5 19 4.99996 17.5 4.99999 15.5C5.00001 14 6 14 9 14Z" fill="#34A853" />
                        <path d="M4.99999 15.5C4.99996 17.5 6.5 19 9 19H12V14H9C6 14 5.00001 14 4.99999 15.5Z" fill="#FBBC04" />
                        <path d="M3 8C3 6.5 5 4 8.5 4C12 4 13 7 11.5 8.5C14 10 12.5 14 9 14H4C2 14 2 11.5 3 10C2.33333 9.83333 3 8.6 3 8Z" fill="#EA4335" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Google Pay</span>
                  </div>
                </div>
                <p className="text-center text-muted-foreground mt-4">
                  Secure your subscription with your preferred payment method.
                  All transactions are securely processed through Stripe.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-6">Ready to Transform Your CV?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/public-cv">
                <Button size="lg" variant="outline">
                  Try It First
                </Button>
              </Link>
              <Link href="/upgrade">
                <Button size="lg" className="animate-pulse">
                  View Subscription Options
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}