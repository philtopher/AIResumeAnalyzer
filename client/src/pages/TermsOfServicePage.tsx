import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service Usage</h2>
            <p>
              By using our CV transformation service, you agree to these terms:
            </p>
            <ul>
              <li>You must provide accurate information in your CV</li>
              <li>You must not upload CVs containing false or misleading information</li>
              <li>You must not use the service for any illegal purposes</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Subscription and Refunds</h2>
            <p>
              Our subscription terms are as follows:
            </p>
            <ul>
              <li>Monthly subscription of £5 for premium features</li>
              <li>Refund requests must be submitted within 14 days of purchase</li>
              <li>Refunds are processed at our discretion based on service usage</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service Limitations</h2>
            <p>
              Please be aware of the following limitations:
            </p>
            <ul>
              <li>We do not guarantee job interviews or employment</li>
              <li>The AI transformation process optimizes existing content but does not generate false experience</li>
              <li>Service availability may vary due to maintenance or technical issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
            <p>
              While you retain ownership of your CV content, you grant us the right to:
            </p>
            <ul>
              <li>Process and transform your CV using our AI technology</li>
              <li>Store necessary data for service provision</li>
              <li>Improve our AI models using anonymized data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Dispute Resolution</h2>
            <p>
              Any disputes will be resolved through:
            </p>
            <ul>
              <li>Initial informal communication</li>
              <li>Formal mediation if necessary</li>
              <li>Legal proceedings as a last resort</li>
            </ul>
          </section>

          <div className="mt-8">
            <Link href="/">
              <Button variant="ghost">Back to Home</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
