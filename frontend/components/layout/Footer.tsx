import Link from 'next/link';
import { Home, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary-900 text-white">
      <div className="container-custom section-padding py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Immo Albania</span>
            </Link>
            <p className="text-secondary-300 mb-4 leading-relaxed">
              Albania's leading digital real estate platform, connecting buyers, sellers, 
              and agents in a trusted marketplace.
            </p>
            <div className="flex items-center space-x-4 text-secondary-300">
              <a href="#" className="hover:text-white transition-colors">
                <span className="sr-only">Facebook</span>
                {/* Add social icons */}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <span className="sr-only">Instagram</span>
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/properties" className="text-secondary-300 hover:text-white transition-colors">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link href="/agents" className="text-secondary-300 hover:text-white transition-colors">
                  Find Agents
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-secondary-300 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-secondary-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* For Agents */}
          <div>
            <h3 className="font-semibold mb-4">For Agents</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/agent/signup" className="text-secondary-300 hover:text-white transition-colors">
                  Become an Agent
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-secondary-300 hover:text-white transition-colors">
                  Agent Dashboard
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-secondary-300 hover:text-white transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-secondary-300 hover:text-white transition-colors">
                  Agent Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-secondary-300">
                <MapPin className="h-5 w-5 flex-shrink-0" />
                <span>Tirana, Albania</span>
              </div>
              <div className="flex items-center space-x-3 text-secondary-300">
                <Phone className="h-5 w-5 flex-shrink-0" />
                <span>+355 4X XXX XXXX</span>
              </div>
              <div className="flex items-center space-x-3 text-secondary-300">
                <Mail className="h-5 w-5 flex-shrink-0" />
                <span>info@immoalbania.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-secondary-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-secondary-400 text-sm">
            © {currentYear} Immo Albania. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-secondary-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-secondary-400 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-secondary-400 hover:text-white text-sm transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
