import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose">
          <h1 className="text-4xl font-bold mb-8">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground mb-8">Effective Date: 15/02/2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              These Terms & Conditions ("Terms") govern your use of CV Transformer ("we," "us," "our"). 
              By using our website and services, you agree to these Terms. If you do not agree, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p>CV Transformer provides an AI-powered CV transformation service. Our service:</p>
            <ul>
              <li>Processes and optimizes CVs based on job descriptions</li>
              <li>Does not guarantee job placement or interviews</li>
              <li>Does not store CVs permanently, files are automatically deleted after processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <p>By using our service, you agree that you:</p>
            <ul>
              <li>Will only upload CVs that you own or have permission to modify</li>
              <li>Will not use our service for fraudulent or illegal purposes</li>
              <li>Understand that we do not guarantee employment outcomes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Loss & Security Disclaimer</h2>
            <p>While we take strong security measures, you acknowledge that:</p>
            <ul>
              <li>Data transmission over the internet is not 100% secure</li>
              <li>We are not liable for any data loss, breach, or unintended access due to third-party vulnerabilities</li>
              <li>You should keep backups of your original CV, as we do not store them permanently</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Payment & Refund Policy</h2>
            <ul>
              <li>Our service operates on a subscription/payment basis.</li>
              <li>Payments are processed securely by third-party providers.</li>
              <li>Refunds may be granted under specific conditions, please contact us for eligibility.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, we are not liable for:</p>
            <ul>
              <li>Any loss of employment opportunities due to the use of our service</li>
              <li>Any errors or inaccuracies in the AI generated CV output</li>
              <li>Any indirect, incidental, or consequential damages arising from your use of our website</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Termination of Service</h2>
            <p>We reserve the right to suspend or terminate accounts that:</p>
            <ul>
              <li>Violate these Terms</li>
              <li>Engage in fraudulent or abusive activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Governing Law</h2>
            <ul>
              <li>For UK/EU users, these Terms comply with GDPR regulations and UK consumer protection laws.</li>
              <li>For US users, these Terms comply with applicable federal and state laws (including CCPA).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Changes to These Terms</h2>
            <p>
              We may update these Terms periodically. Continued use of our service means you accept any changes.
            </p>
          </section>

          <div className="mt-12 pt-6 border-t">
            <div className="flex justify-center gap-4 mb-4">
              <Link href="/privacy-policy">
                <Button variant="link">Privacy Policy</Button>
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