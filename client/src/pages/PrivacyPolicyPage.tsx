import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Collection and Usage</h2>
            <p>
              We collect and process the following information when you use our CV transformation service:
            </p>
            <ul>
              <li>Uploaded CV documents (temporarily during processing)</li>
              <li>Email address (for account management and communications)</li>
              <li>Payment details (processed securely through our payment provider)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
            <p>
              Your privacy is important to us. Here's how we handle your data:
            </p>
            <ul>
              <li>CV documents are automatically deleted after processing</li>
              <li>Account information is retained while your account is active</li>
              <li>Payment information is not stored on our servers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
            <p>
              We do not sell or share your personal information with third parties. Your data is only used to provide our CV transformation service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Security Measures</h2>
            <p>
              We implement several security measures to protect your information:
            </p>
            <ul>
              <li>Secure SSL/TLS encryption for all data transfers</li>
              <li>Regular security audits and updates</li>
              <li>Limited employee access to user data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Request access to your personal data</li>
              <li>Request correction or deletion of your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p>
              For any privacy-related questions or requests, please contact us through our{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact form
              </Link>
              .
            </p>
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
