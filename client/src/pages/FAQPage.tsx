import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export default function FAQPage() {
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
    {
      question: "What file formats do you support?",
      answer: "We support PDF and DOCX file formats for CV uploads. The transformed CV can be downloaded in DOCX format for easy editing.",
    },
    {
      question: "How do you handle my personal data?",
      answer: "We process your CV data securely and delete it immediately after transformation. We comply with data protection regulations and never share your information with third parties.",
    },
    {
      question: "Can I customize the transformation?",
      answer: "Yes! You can provide specific job descriptions and target roles to customize how your CV is optimized. The AI will tailor the content accordingly.",
    },
    {
      question: "What's included in the Basic Plan?",
      answer: "The Basic Plan costs £3/month and includes 10 CV transformations per month with download capability and basic keyword optimization. For more features like enhanced optimization and unlimited transformations, consider our Standard (£5/month) or Pro (£30/month) plans.",
    },
    {
      question: "How do I cancel my subscription?",
      answer: "You can cancel your subscription anytime from your dashboard. If you cancel within 14 days of subscribing, you're eligible for a full refund.",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground">
              Find answers to common questions about our CV transformation service
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-muted-foreground mb-6">
              We're here to help! Contact our support team for assistance.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/contact">
                <Button>Contact Support</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}