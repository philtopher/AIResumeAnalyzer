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
            <div className="grid md:grid-cols-3 gap-8">
              {/* Basic Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Plan</CardTitle>
                    <CardDescription>£3/month - Starter CV tools</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>10 CV transformations per month</span>
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

              {/* Standard Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
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
                          <span>20 CV transformations per month</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Download transformed CVs</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Enhanced keyword optimization</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Email support</span>
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
                    <CardDescription>£30/month - Premium features</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>Unlimited CV transformations</span>
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
                <div className="flex flex-col md:flex-row justify-center items-center gap-16 py-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="5" width="20" height="14" rx="2" stroke="#0088cc" strokeWidth="2" fill="#0088cc"/>
                        <rect x="2" y="10" width="20" height="2" fill="black"/>
                        <rect x="14" y="15" width="6" height="2" rx="1" fill="#0088cc" stroke="#ffffff"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Card Payment</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <img src="/attached_assets/apple-pay2.png" alt="Apple Pay" className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">Apple Pay</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <img src="/attached_assets/google-pay.png" alt="Google Pay" className="w-10 h-8" />
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