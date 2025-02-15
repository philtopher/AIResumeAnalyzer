import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Star,
  Quote,
  HelpCircle,
  ChevronDown,
  Play,
  MessageCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HomePage() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Software Engineer",
      company: "Tech Solutions Inc",
      content: "The AI transformation made my CV stand out. Secured 3 interviews in my first week!",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Marketing Manager",
      company: "Global Brands",
      content: "Incredible tool that helped me transition industries. The AI understood my transferable skills perfectly.",
      rating: 5,
    },
    {
      name: "Emma Williams",
      role: "Project Manager",
      company: "Construction Plus",
      content: "The before/after difference was remarkable. Worth every penny!",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How does the CV transformation work?",
      answer: "Our AI analyzes your existing CV and the target job description, then optimizes your content while maintaining accuracy. We use natural language processing to enhance your achievements and match them with job requirements.",
    },
    {
      question: "Is my information secure?",
      answer: "Yes! We take security seriously. Your CV is processed securely and automatically deleted after transformation. We never store personal data longer than necessary.",
    },
    {
      question: "What if I'm not satisfied with the results?",
      answer: "We offer a 14-day money-back guarantee if you're not happy with the transformation. Our AI provides multiple versions to choose from, and you can request adjustments.",
    },
    {
      question: "Do you generate fake experience?",
      answer: "Absolutely not. We strictly enhance and optimize your existing experience. Our AI is designed to maintain complete accuracy while improving the presentation of your actual achievements.",
    },
    {
      question: "How long does the transformation take?",
      answer: "The initial transformation takes just a few minutes. You can then review and download the optimized version immediately.",
    },
  ];

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
                  <Link href="/public-cv">
                    <Button size="lg">Start Free Trial</Button>
                  </Link>
                  <Link href="/tutorial">
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

        {/* Testimonials Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Trusted by Professionals
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <Quote className="w-8 h-8 text-primary/40 mb-4" />
                    <p className="text-muted-foreground mb-4">{testimonial.content}</p>
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/50 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible>
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Service Limitations & Call to Action */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-bold mb-6">
              Start Your Career Transformation
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              Join thousands of professionals who have improved their job applications
            </p>
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl mx-auto">
              Note: While our AI significantly improves your CV's impact, results may vary based on your experience and target role. We enhance real experience only - we never generate fake credentials or experience.
            </p>
            <Link href="/auth">
              <Button size="lg">Get Started Now</Button>
            </Link>
          </div>
        </section>

        {/* Footer remains unchanged */}
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
                <Link href="/tutorial">
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