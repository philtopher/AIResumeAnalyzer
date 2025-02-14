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
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";

export default function TutorialPage() {
  const features = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Upload Your CV",
      description: "Start by uploading your current CV in PDF or DOCX format. Your document is processed securely and deleted after transformation.",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Target Role",
      description: "Specify your desired job position and paste the job description for precise targeting.",
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI Analysis",
      description: "Our AI analyzes your CV's content, structure, and alignment with the job requirements.",
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Keyword Optimization",
      description: "We identify and optimize relevant keywords from your experience to match job requirements.",
    },
    {
      icon: <RefreshCw className="w-6 h-6" />,
      title: "Content Enhancement",
      description: "Your existing experience is reworded for better impact while maintaining accuracy.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Ethical Transformation",
      description: "We never generate fake experience - only optimize your actual achievements.",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Example CV transformation
  const exampleTransformation = {
    original: {
      role: "Software Developer",
      bullet: "Worked on web applications using React and Node.js",
    },
    transformed: {
      role: "Senior Frontend Engineer",
      bullet: "Led development of mission-critical web applications using React.js and Node.js, improving performance by 40%",
    },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          How Our AI Works
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Our advanced AI technology optimizes your CV through natural language processing
          and deep learning, while maintaining complete accuracy and ethical standards.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
      >
        {features.map((feature, index) => (
          <motion.div key={index} variants={item}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Example CV Transformation Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-16"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">See the Transformation</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Original CV Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Role</h4>
                  <p className="text-muted-foreground">{exampleTransformation.original.role}</p>
                </div>
                <div>
                  <h4 className="font-medium">Experience Description</h4>
                  <p className="text-muted-foreground">{exampleTransformation.original.bullet}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI-Optimized Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Enhanced Role</h4>
                  <p className="text-muted-foreground">{exampleTransformation.transformed.role}</p>
                </div>
                <div>
                  <h4 className="font-medium">Optimized Description</h4>
                  <p className="text-muted-foreground">{exampleTransformation.transformed.bullet}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="text-2xl font-bold mb-6">Ready to Transform Your CV?</h2>
        <Link href="/public-cv">
          <Button size="lg" className="animate-pulse">
            Try Demo Now
          </Button>
        </Link>
      </motion.div>

      <div className="mt-16 bg-muted rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Our AI Technology</h2>
        <div className="grid gap-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-2">Natural Language Processing</h3>
              <p className="text-muted-foreground">
                Our AI uses advanced NLP to understand the context and meaning of your experience,
                matching it with job requirements while preserving the original intent.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-2">Keyword Optimization</h3>
              <p className="text-muted-foreground">
                The system identifies industry-specific keywords and phrases from the job description,
                ensuring your CV passes through Applicant Tracking Systems (ATS) while maintaining
                natural language flow.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-2">Ethical AI Practices</h3>
              <p className="text-muted-foreground">
                Our AI is designed to enhance your existing experience, not fabricate new ones.
                We maintain strict ethical guidelines to ensure all transformations are based on
                your actual achievements and capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}