import { useState, useRef } from "react";
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

const FreePlanContent = () => {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Free Plan
        </CardTitle>
        <CardDescription>
          Get started with basic features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Basic CV transformation</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>View transformed CVs in browser</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Basic keyword optimization</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Download transformed CVs</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Organization insights</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Advanced CV analysis</span>
          </div>
        </div>

        <Link href="/auth">
          <Button variant="outline" className="w-full">
            Start Free
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
          £5/month - Unlock premium features and interview insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Download transformed CVs</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Preview transformed CVs in browser</span>
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
          <Button className="w-full">
            Upgrade to Pro
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <FreePlanContent />
          <ProPlanContent />
        </div>
      </main>
    </div>
  );
}