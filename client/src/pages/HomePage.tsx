import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CV Transformer</h1>
          <div className="space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-5xl font-bold mb-6">
                  Transform Your CV with AI
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Automatically tailor your CV for any job role using advanced AI. Get instant feedback and improve your chances of landing your dream job.
                </p>
                <Link href="/dashboard">
                  <Button size="lg">Start Free Trial</Button>
                </Link>
              </div>
              <div>
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c"
                  alt="Professional team working"
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container mx-auto max-w-6xl px-4">
            <h3 className="text-3xl font-bold text-center mb-12">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <h4 className="text-xl font-semibold mb-2">1. Upload Your CV</h4>
                  <p className="text-muted-foreground">
                    Upload your existing CV in PDF or DOCX format
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h4 className="text-xl font-semibold mb-2">2. Specify Target Role</h4>
                  <p className="text-muted-foreground">
                    Enter your desired job role and description
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h4 className="text-xl font-semibold mb-2">3. Get Results</h4>
                  <p className="text-muted-foreground">
                    Receive your transformed CV with detailed feedback
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <h3 className="text-3xl font-bold mb-6">
              Ready to Transform Your Career?
            </h3>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of professionals who have improved their job applications
            </p>
            <Link href="/auth">
              <Button size="lg">Get Started Now</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 CV Transformer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
