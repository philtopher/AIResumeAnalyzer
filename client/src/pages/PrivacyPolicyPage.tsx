import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Effective Date: 15/02/2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Welcome to CV Transformer ("we," "us," "our"). We value your privacy and are committed to protecting your personal data. 
              This Privacy Policy explains how we collect, use, and protect your information when you use our CV conversion service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>
            <p>When you use our service, we may collect:</p>
            <ul>
              <li>Uploaded CVs (processed in real-time and automatically deleted after transformation)</li>
              <li>Contact details (if voluntarily provided) for customer support</li>
              <li>Payment information (processed securely through third-party payment providers, we do not store this data)</li>
              <li>Website usage data (e.g., IP address, browser type, and analytics to improve our service)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
            <p>We use your data to:</p>
            <ul>
              <li>Process and transform your CV based on the job description you provide</li>
              <li>Improve and optimize services rendered to you</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Retention and Storage</h2>
            <ul>
              <li>We do not permanently store uploaded CVs—they are automatically deleted after processing.</li>
              <li>We do not sell, share, or distribute personal data to third parties.</li>
              <li>Payment details are handled securely by our payment processor and are never stored by us.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Security Measures</h2>
            <p>We implement appropriate security measures to protect your data, including:</p>
            <ul>
              <li>End-to-end encryption for CV uploads and processing</li>
              <li>Automatic data deletion after processing</li>
              <li>Secure third-party payment handling to prevent unauthorized access to financial data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights (EU/UK Users)</h2>
            <p>If you are a resident of the EU or UK (GDPR-compliant regions), you have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Request deletion of your data</li>
              <li>Restrict processing of your data</li>
              <li>Object to data processing under certain conditions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights (US Users – CCPA Compliance)</h2>
            <p>If you are a resident of California (CCPA compliance), you have the right to:</p>
            <ul>
              <li>Request what personal information we have collected</li>
              <li>Request deletion of your personal data</li>
              <li>Opt-out of any data sharing (though we do not sell user data)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
            <p>
              We may use third-party services (e.g., analytics, payment processors) that adhere to their own privacy policies. 
              We recommend reviewing their policies for further details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy periodically. Any changes will be posted here with an updated "Effective Date."
            </p>
          </section>

          <div className="mt-12 pt-6 border-t">
            <div className="flex justify-center gap-4 mb-4">
              <Link href="/terms-of-service">
                <Button variant="link">Terms & Conditions</Button>
              </Link>
              <Link href="/contact">
                <Button variant="link">Contact Us</Button>
              </Link>
              <Link href="/">
                <Button variant="link">Home</Button>
              </Link>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} CV Transformer. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}