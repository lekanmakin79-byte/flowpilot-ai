"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const plans = [
  {
    name: "Free",
    price: "£0",
    description: "Try FlowPilot and manage your business basics.",
    features: [
      "Business dashboard",
      "Customers",
      "Leads & enquiries",
      "Jobs",
      "Quotes",
      "Invoices",
    ],
    button: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "£19",
    description: "The complete AI office assistant for small businesses.",
    features: [
      "Everything in Free",
      "FlowPilot AI",
      "AI enquiry analysis",
      "AI customer response drafting",
      "AI business assistant",
      "AI follow-up assistance",
    ],
    button: "Upgrade to Professional",
    highlighted: true,
  },
  {
    name: "Business",
    price: "£39",
    description: "For businesses that need more capacity and automation.",
    features: [
      "Everything in Professional",
      "Higher AI usage limits",
      "More advanced automation",
      "Priority features",
      "Business-focused AI tools",
    ],
    button: "Choose Business",
    highlighted: false,
  },
];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");

  async function handleUpgrade(planName: string) {
    if (planName !== "Professional") {
      return;
    }

    setError("");
    setLoadingPlan(planName);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href =
          "/login?redirect=/pricing";
        return;
      }

      const response = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            plan: "professional",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to start Stripe Checkout."
        );
      }

      if (!result.url) {
        throw new Error(
          "Stripe Checkout URL was not returned."
        );
      }

      window.location.href = result.url;
    } catch (err) {
      console.error(
        "Professional upgrade error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start the upgrade."
      );

      setLoadingPlan("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-blue-400">
            FLOWPILOT AI
          </p>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Simple pricing for your business
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Start managing your business for free, then upgrade when you
            want FlowPilot AI to take more of the office work off your hands.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-6 md:grid-cols-3">

          {plans.map((plan) => (
            <section
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                plan.highlighted
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 bg-slate-900"
              }`}
            >

              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold">
                  MOST POPULAR
                </div>
              )}

              <h2 className="text-2xl font-bold">
                {plan.name}
              </h2>

              <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-400">
                {plan.description}
              </p>

              <div className="mt-6">
                <span className="text-4xl font-bold">
                  {plan.price}
                </span>

                <span className="ml-2 text-sm text-slate-500">
                  / month
                </span>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm text-slate-300"
                  >
                    <span className="text-emerald-400">
                      ✓
                    </span>

                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.name === "Professional" ? (
                <button
                  type="button"
                  onClick={() =>
                    handleUpgrade(plan.name)
                  }
                  disabled={
                    loadingPlan === plan.name
                  }
                  className="mt-8 rounded-lg bg-blue-600 px-5 py-3 text-center text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingPlan === plan.name
                    ? "Opening Checkout..."
                    : plan.button}
                </button>
              ) : (
                <Link
                  href="/signup"
                  className={`mt-8 rounded-lg px-5 py-3 text-center text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {plan.button}
                </Link>
              )}

            </section>
          ))}

        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to FlowPilot
          </Link>
        </div>

      </div>
    </main>
  );
}