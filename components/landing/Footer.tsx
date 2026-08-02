import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white mt-24">

      <div className="max-w-7xl mx-auto px-6 py-16">

        <div className="grid md:grid-cols-4 gap-10">
		
				 
  <Image
  src="/logo.png"
  alt="FlowPilot AI"
  width={42}
  height={42}
/>

          <div>

            <h2 className="text-2xl font-bold mb-4">
              <span>FlowPilot AI</span>
            </h2>

            <p className="text-slate-400 leading-7">
              The AI Office Manager built for small businesses.
              Helping service businesses spend less time on paperwork
              and more time growing.
            </p>

          </div>

          <div>

            <h3 className="font-semibold mb-4">
              Product
            </h3>

            <ul className="space-y-3 text-slate-400">

              <li><a href="#features">Features</a></li>

              <li><a href="#how-it-works">How It Works</a></li>

              <li><a href="#pricing">Pricing</a></li>

              <li><a href="#waitlist">Early Access</a></li>

            </ul>

          </div>

          <div>

            <h3 className="font-semibold mb-4">
              Company
            </h3>

            <ul className="space-y-3 text-slate-400">

              <li>
                <Link href="/about">
                  About
                </Link>
              </li>

              <li>
                <Link href="/roadmap">
                  Roadmap
                </Link>
              </li>

              <li>
                <Link href="/contact">
                  Contact
                </Link>
              </li>

            </ul>

          </div>

          <div>

            <h3 className="font-semibold mb-4">
              Legal
            </h3>

            <ul className="space-y-3 text-slate-400">

              <li>
                <Link href="/privacy">
                  Privacy Policy
                </Link>
              </li>

              <li>
                <Link href="/terms">
                  Terms of Service
                </Link>
              </li>

            </ul>

          </div>

        </div>

        <div className="border-t border-slate-800 mt-12 pt-8">

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">

            <p className="text-slate-500">
              © 2026 FlowPilot AI. All rights reserved.
            </p>

            <div className="flex gap-6 text-sm">

              <span>🔒 Secure Signup</span>

              <span>🚀 Free Early Access</span>

              <span>✉️ No Spam</span>

            </div>

          </div>

        </div>

      </div>

    </footer>
  );
}