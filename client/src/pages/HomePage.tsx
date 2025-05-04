import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Star,
  HelpCircle,
  ChevronDown,
  Play,
  MessageCircle
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-5xl font-bold mb-6">
                  Transform Your CV with{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    AI Precision
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Our advanced AI analyzes and enhances your professional experience, delivering role-optimized CVs that highlight your true potential while maintaining complete accuracy. Get instant feedback and improve your chances of landing your dream job.
                </p>
                <div className="flex gap-4">
                  <Link href="/auth">
                    <Button size="lg">Get Started</Button>
                  </Link>
                  <Link href="/how-it-works">
                    <Button variant="outline" size="lg">
                      <Play className="w-4 h-4 mr-2" />
                      See Example
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 blur-xl rounded-xl" />
                <Card className="relative">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="font-medium">Real-time Optimization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <span className="font-medium">Instant AI Feedback</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-primary" />
                        <span className="font-medium">ATS-Friendly Format</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Simple 3-Step Process
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">1. Upload Your CV</h3>
                  <p className="text-muted-foreground">
                    Upload your existing CV in PDF or DOCX format. Your document is processed securely and deleted after transformation.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">2. Specify Target Role</h3>
                  <p className="text-muted-foreground">
                    Enter your desired job role and description for precise targeting.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">3. Get Results</h3>
                  <p className="text-muted-foreground">
                    Receive your transformed CV with detailed feedback and insights.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Service Limitations & Call to Action */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-bold mb-6">
              Start Your Career Transformation
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              Stand out from hundreds of thousands of applicants with an AI-optimized CV that highlights your true potential
            </p>
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl mx-auto">
              Note: While our AI significantly improves your CV's impact, results may vary based on your experience and target role. We enhance real experience only - we never generate fake credentials or experience.
            </p>
            <Link href="/auth">
              <Button size="lg">Get Started Now</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-4">CV Transformer</h3>
              <p className="text-sm text-muted-foreground">
                Transform your CV with AI-powered optimization
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/features">
                  <Button variant="link" className="text-muted-foreground">Features</Button>
                </Link>
                <Link href="/how-it-works">
                  <Button variant="link" className="text-muted-foreground">How It Works</Button>
                </Link>
                <Link href="/contact">
                  <Button variant="link" className="text-muted-foreground">Contact</Button>
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2">
                <Link href="/privacy-policy">
                  <Button variant="link" className="text-muted-foreground">Privacy Policy</Button>
                </Link>
                <Link href="/terms-of-service">
                  <Button variant="link" className="text-muted-foreground">Terms of Service</Button>
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 CV Transformer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}