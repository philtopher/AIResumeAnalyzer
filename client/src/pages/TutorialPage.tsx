import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Star, Zap, CheckCircle } from "lucide-react";

export default function TutorialPage() {
  const features = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Upload Your CV",
      description: "Start by uploading your current CV in PDF or DOCX format.",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Target Role",
      description: "Specify your desired job position and paste the job description.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "AI Transformation",
      description: "Our AI analyzes and optimizes your CV for the target role.",
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Instant Feedback",
      description: "Receive detailed feedback and suggestions for improvement.",
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "Download & Apply",
      description: "Get your transformed CV ready for submission.",
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Track Progress",
      description: "Monitor your CV versions and improvements over time.",
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          How It Works
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transform your CV instantly with our AI-powered platform. Follow these simple steps to optimize your CV for your dream job.
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-6">Ready to Transform Your CV?</h2>
        <Button size="lg" className="animate-pulse">
          Try Demo Now
        </Button>
      </motion.div>

      <div className="mt-16 bg-muted rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Pro Tips</h2>
        <div className="grid gap-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-2">Prepare Your Information</h3>
              <p className="text-muted-foreground">
                Before uploading, ensure your current CV includes your most recent work experience,
                skills, and achievements. The more detailed your input, the better the transformation.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-2">Job Description Details</h3>
              <p className="text-muted-foreground">
                Copy the complete job description from the posting. Include requirements,
                responsibilities, and any specific skills mentioned. This helps our AI align your
                CV perfectly with the role.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-2">Review and Customize</h3>
              <p className="text-muted-foreground">
                After transformation, review the changes and make any necessary adjustments. While our
                AI is powerful, your personal touch can make the CV even more impactful.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
