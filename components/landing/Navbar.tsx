"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-8 py-5">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            width={50}
            height={50}
            alt="FlowPilot AI"
            className="h-auto"
          />

          <span className="text-2xl font-bold text-slate-900">
            ✦ FlowPilot AI
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-slate-600">

          <a href="/#features" className="hover:text-green-600">
            Features
          </a>

          <a href="/#how-it-works" className="hover:text-green-600">
            How It Works
          </a>

          <a href="/#pricing" className="hover:text-green-600">
            Pricing
          </a>

          <Link href="/roadmap" className="hover:text-green-600">
            Roadmap
          </Link>

          <Link href="/about" className="hover:text-green-600">
            About
          </Link>

          <Link href="/contact" className="hover:text-green-600">
            Contact
          </Link>
        </div>

        {/* Desktop CTA */}
        <a
          href="/#waitlist"
          className="hidden md:block rounded-xl bg-green-500 px-5 py-3 font-semibold text-white hover:bg-green-600"
        >
          Join Early Access
        </a>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="text-3xl md:hidden"
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t bg-white shadow-lg md:hidden">
          <div className="flex flex-col">

            <a
              href="/#features"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              🚀 Features
            </a>

            <a
              href="/#how-it-works"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              ⚙️ How It Works
            </a>

            <a
              href="/#pricing"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              💷 Pricing
            </a>

            <Link
              href="/roadmap"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              🗺️ Roadmap
            </Link>

            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              ℹ️ About
            </Link>

            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              ✉️ Contact
            </Link>

            <Link
              href="/privacy"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              🔒 Privacy Policy
            </Link>

            <Link
              href="/terms"
              onClick={() => setOpen(false)}
              className="border-b px-6 py-4"
            >
              📄 Terms of Service
            </Link>

            <a
              href="/#waitlist"
              onClick={() => setOpen(false)}
              className="m-4 rounded-xl bg-green-500 py-3 text-center font-semibold text-white"
            >
              Join Early Access
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}