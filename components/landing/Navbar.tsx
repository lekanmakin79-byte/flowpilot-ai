"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">

        {/* Text Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="text-2xl font-bold text-green-600"
        >
          ✦ FlowPilot AI
        </Link>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <a
            href="/#features"
            className="transition hover:text-green-600"
          >
            Features
          </a>

          <a
            href="/#how-it-works"
            className="transition hover:text-green-600"
          >
            How It Works
          </a>

          <a
            href="/#pricing"
            className="transition hover:text-green-600"
          >
            Pricing
          </a>

          <Link
            href="/roadmap"
            className="transition hover:text-green-600"
          >
            Roadmap
          </Link>

          <Link
            href="/about"
            className="transition hover:text-green-600"
          >
            About
          </Link>

          <Link
            href="/contact"
            className="transition hover:text-green-600"
          >
            Contact
          </Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Log In
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-green-500 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-green-600"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span className="sr-only">
            {open ? "Close menu" : "Open menu"}
          </span>

          {open ? (
            <span className="text-2xl leading-none">×</span>
          ) : (
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-6 bg-slate-700" />
              <span className="block h-0.5 w-6 bg-slate-700" />
              <span className="block h-0.5 w-6 bg-slate-700" />
            </span>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="fixed inset-x-0 top-[73px] bottom-0 z-40 overflow-y-auto border-t border-slate-200 bg-white shadow-2xl md:hidden">
          <div className="mx-auto max-w-7xl px-5 py-5 pb-10">

            {/* Account Actions */}
            <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Account
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  Log In
                </Link>

                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="flex min-h-[52px] items-center justify-center rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600 active:scale-[0.98]"
                >
                  Start Free
                </Link>
              </div>
            </div>

            {/* Main Navigation */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">

              <a
                href="/#features"
                onClick={closeMenu}
                className="flex min-h-[52px] items-center gap-3 border-b border-slate-200 px-5 py-4 font-medium text-slate-700 transition hover:bg-white hover:text-green-600"
              >
                <span className="text-lg">🚀</span>
                <span>Features</span>
              </a>

              <a
                href="/#how-it-works"
                onClick={closeMenu}
                className="flex min-h-[52px] items-center gap-3 border-b border-slate-200 px-5 py-4 font-medium text-slate-700 transition hover:bg-white hover:text-green-600"
              >
                <span className="text-lg">⚙️</span>
                <span>How It Works</span>
              </a>

              <a
                href="/#pricing"
                onClick={closeMenu}
                className="flex min-h-[52px] items-center gap-3 border-b border-slate-200 px-5 py-4 font-medium text-slate-700 transition hover:bg-white hover:text-green-600"
              >
                <span className="text-lg">💷</span>
                <span>Pricing</span>
              </a>

              <Link
                href="/roadmap"
                onClick={closeMenu}
                className="flex min-h-[52px] items-center gap-3 border-b border-slate-200 px-5 py-4 font-medium text-slate-700 transition hover:bg-white hover:text-green-600"
              >
                <span className="text-lg">🗺️</span>
                <span>Roadmap</span>
              </Link>

              <Link
                href="/about"
                onClick={closeMenu}
                className="flex min-h-[52px] items-center gap-3 border-b border-slate-200 px-5 py-4 font-medium text-slate-700 transition hover:bg-white hover:text-green-600"
              >
                <span className="text-lg">ℹ️</span>
                <span>About</span>
              </Link>

              <Link
                href="/contact"
                onClick={closeMenu}
                className="flex min-h-[52px] items-center gap-3 px-5 py-4 font-medium text-slate-700 transition hover:bg-white hover:text-green-600"
              >
                <span className="text-lg">✉️</span>
                <span>Contact</span>
              </Link>
            </div>

            {/* Secondary Links */}
            <div className="mt-5 flex items-center justify-center gap-5 pb-4 text-xs text-slate-400">
              <Link
                href="/privacy"
                onClick={closeMenu}
                className="transition hover:text-slate-600"
              >
                Privacy
              </Link>

              <span>•</span>

              <Link
                href="/terms"
                onClick={closeMenu}
                className="transition hover:text-slate-600"
              >
                Terms
              </Link>
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}