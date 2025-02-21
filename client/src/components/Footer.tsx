import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">CV Transformer</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered CV transformation and career intelligence platform.
            </p>
            <div className="flex space-x-4">
              <a href="https://twitter.com/cvtransformer" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com/company/cvtransformer" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://facebook.com/cvtransformer" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="mailto:support@cvanalyzer.freindel.com" className="text-muted-foreground hover:text-primary">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features">
                  <a className="text-sm text-muted-foreground hover:text-primary">Features</a>
                </Link>
              </li>
              <li>
                <Link href="/how-it-works">
                  <a className="text-sm text-muted-foreground hover:text-primary">How It Works</a>
                </Link>
              </li>
              <li>
                <Link href="/public-cv">
                  <a className="text-sm text-muted-foreground hover:text-primary">Try Demo</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms-of-service">
                  <a className="text-sm text-muted-foreground hover:text-primary">Terms of Service</a>
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy">
                  <a className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact">
                  <a className="text-sm text-muted-foreground hover:text-primary">Contact Us</a>
                </Link>
              </li>
              <li>
                <a href="mailto:support@cvanalyzer.freindel.com" className="text-sm text-muted-foreground hover:text-primary">
                  support@cvanalyzer.freindel.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} CV Transformer. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
