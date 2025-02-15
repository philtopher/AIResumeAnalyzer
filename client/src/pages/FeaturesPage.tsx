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
  Search,
  BarChart,
  Clock,
  Check,
} from "lucide-react";


const PricingPlanContent = () => {
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
          £5/month - Unlock premium features
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
            <span>Organization insights from web scraping</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Detailed CV scoring and analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Full CV generation option</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span>Unlimited transformations</span>
          </div>
        </div>

        <Button className="w-full">
          Subscribe - Coming Soon
        </Button>

        <p className="text-sm text-muted-foreground text-center mt-4">
          Payment system temporarily unavailable. Check back soon!
        </p>
      </CardContent>
    </Card>
  );
};

export default function PricingPlansPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <PricingPlanContent />
      </main>
    </div>
  );
}