import Link from "next/link";

export default function PageFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">

        <div className="flex flex-col md:flex-row justify-between gap-10">

          <div>
            <Link
              href="/"
              className="text-2xl font-bold text-white"
            >
              ✦ FlowPilot AI
            </Link>

            <p className="mt-4 max-w-sm text-slate-400">
              The AI Office Manager for Small Businesses.
              Helping service businesses spend less time on paperwork and more
              time growing.
            </p>
          </div>

          <div className="space-y-2">
            <Link href="/" className="block hover:text-white">
              Home
            </Link>

            <Link href="/about" className="block hover:text-white">
              About
            </Link>

            <Link href="/contact" className="block hover:text-white">
              Contact
            </Link>

            <Link href="/privacy" className="block hover:text-white">
              Privacy Policy
            </Link>

            <Link href="/terms" className="block hover:text-white">
              Terms of Service
            </Link>
          </div>

        </div>

        <div className="border-t border-slate-700 mt-10 pt-6 text-center text-slate-500">
          © 2026 FlowPilot AI. All rights reserved.
        </div>

      </div>
    </footer>
  );
}