import { useState } from "react";
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
  Download,
  Eye,
  EyeOff,
  Search,
  BarChart,
  Clock,
  Check,
  X,
  CreditCard,
  Loader2,
} from "lucide-react";

const StandardPlanContent = () => {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Standard Plan
        </CardTitle>
        <CardDescription>
          Transform your CV with AI - £5/month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Advanced CV transformation</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Download transformed CVs</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Keyword optimization</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Basic analytics</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Organization insights</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Interview preparation insights</span>
          </div>
        </div>

        <Link href="/auth">
          <Button className="w-full">
            Get Started - £5/month
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

const ProPlanContent = () => {
  return (
    <Card className="border-primary relative overflow-hidden">
      <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-sm">
        Popular
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-6 w-6" />
          Pro Plan
        </CardTitle>
        <CardDescription>
          £30/month - Unlock premium features and interview insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Everything in Standard plan</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Deep organization insights and company culture analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Detailed CV scoring with industry-specific feedback</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Interview preparation insights and likely questions</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Real-time interview updates as your date approaches</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Unlimited transformations with AI-powered optimization</span>
          </div>
        </div>

        <Link href="/upgrade">
          <Button className="w-full" variant="default">
            Upgrade to Pro - £30/month
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground text-center">
          Already on Standard? Upgrade for just £25 more
        </p>
      </CardContent>
    </Card>
  );
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Select the plan that best fits your career goals
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <StandardPlanContent />
          <ProPlanContent />
        </div>
      </main>
    </div>
  );
}