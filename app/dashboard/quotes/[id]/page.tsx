"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Quote = {
  id: string;
  business_id: string;
  customer_id: string;
  job_id: string | null;
  quote_number: string;
  title: string;
  description: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  subtotal: number;
  tax: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
};

type Job = {
  id: string;
  title: string;
  status: string;
};

export default function QuoteDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadQuote() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: businessData, error: businessError } =
        await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

      if (businessError || !businessData) {
        console.error("Business loading error:", businessError);
        router.replace("/onboarding");
        return;
      }

      const { data: quoteData, error: quoteError } =
        await supabase
          .from("quotes")
          .select("*")
          .eq("id", quoteId)
          .eq("business_id", businessData.id)
          .maybeSingle();

      if (quoteError) {
        console.error("Quote loading error:", quoteError);

        setError(
          quoteError.message || "Unable to load quote."
        );

        setLoading(false);
        return;
      }

      if (!quoteData) {
        setError("Quote not found.");
        setLoading(false);
        return;
      }

      setQuote(quoteData);

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select(
            `
              id,
              first_name,
              last_name,
              company_name,
              email,
              phone
            `
          )
          .eq("id", quoteData.customer_id)
          .eq("business_id", businessData.id)
          .maybeSingle();

      if (customerError) {
        console.error(
          "Customer loading error:",
          customerError
        );
      }

      setCustomer(customerData);

      if (quoteData.job_id) {
        const { data: jobData, error: jobError } =
          await supabase
            .from("jobs")
            .select("id, title, status")
            .eq("id", quoteData.job_id)
            .eq("business_id", businessData.id)
            .maybeSingle();

        if (jobError) {
          console.error(
            "Job loading error:",
            jobError
          );
        }

        setJob(jobData);
      }

      setLoading(false);
    }

    if (quoteId) {
      loadQuote();
    }
  }, [quoteId, router]);

  function formatCurrency(
    value: number | string | null | undefined
  ) {
    const amount = Number(value ?? 0);

    return `£${amount.toFixed(2)}`;
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "Not set";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatCreatedDate(date: string) {
    return new Date(date).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  function getStatusLabel(
    status: Quote["status"]
  ) {
    switch (status) {
      case "sent":
        return "SENT";

      case "accepted":
        return "ACCEPTED";

      case "rejected":
        return "REJECTED";

      case "expired":
        return "EXPIRED";

      default:
        return "DRAFT";
    }
  }

  function getStatusClasses(
    status: Quote["status"]
  ) {
    switch (status) {
      case "sent":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";

      case "accepted":
        return "bg-green-500/10 text-green-400 border-green-500/20";

      case "rejected":
        return "bg-red-500/10 text-red-400 border-red-500/20";

      case "expired":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";

      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    }
  }

  async function handleDelete() {
    if (!quote) {
      return;
    }

    const confirmed = window.confirm(
      `Delete quote ${quote.quote_number}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: businessData } =
        await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

      if (!businessData) {
        throw new Error(
          "Business account not found."
        );
      }

      const { error: deleteError } =
        await supabase
          .from("quotes")
          .delete()
          .eq("id", quote.id)
          .eq("business_id", businessData.id);

      if (deleteError) {
        throw deleteError;
      }

      router.replace("/dashboard/quotes");
    } catch (err) {
      console.error("Delete quote error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete quote."
      );

      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-400">
            Loading quote...
          </p>
        </div>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">

          <Link
            href="/dashboard/quotes"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to quotes
          </Link>

          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-xl font-semibold">
              Quote unavailable
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error || "Unable to load quote."}
            </p>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">

      <div className="mx-auto max-w-6xl">

        {/* Top navigation */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <Link
            href="/dashboard/quotes"
            className="text-sm text-blue-400 transition hover:text-blue-300"
          >
            ← Back to quotes
          </Link>

          <div className="flex flex-wrap gap-3">

            <Link
              href={`/dashboard/quotes/${quote.id}/edit`}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Edit Quote
            </Link>

            <Link
              href={`/dashboard/quotes/${quote.id}/print`}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Print / Save PDF
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Deleting..."
                : "Delete Quote"}
            </button>

          </div>

        </div>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* Quote header */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">

            <div>

              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Quote
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                {quote.quote_number}
              </h1>

              <p className="mt-2 text-lg font-semibold text-slate-200">
                {quote.title}
              </p>

              {quote.description && (
                <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {quote.description}
                </p>
              )}

            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">

              <span
                className={`inline-flex rounded-full border px-4 py-2 text-xs font-bold tracking-wide ${getStatusClasses(
                  quote.status
                )}`}
              >
                {getStatusLabel(
                  quote.status
                )}
              </span>

              <p className="text-sm text-slate-500">
                Created{" "}
                {formatCreatedDate(
                  quote.created_at
                )}
              </p>

            </div>

          </div>

        </section>

        {/* Customer + job */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* Customer */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Customer
            </h2>

            {customer ? (
              <div className="mt-4">

                <p className="text-lg font-bold text-white">
                  {customer.first_name}{" "}
                  {customer.last_name ?? ""}
                </p>

                {customer.company_name && (
                  <p className="mt-1 text-sm text-slate-400">
                    {customer.company_name}
                  </p>
                )}

                {customer.email && (
                  <p className="mt-4 text-sm text-slate-400">
                    {customer.email}
                  </p>
                )}

                {customer.phone && (
                  <p className="mt-1 text-sm text-slate-400">
                    {customer.phone}
                  </p>
                )}

              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Customer information unavailable.
              </p>
            )}

          </section>

          {/* Job */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Related job
            </h2>

            {job ? (
              <div className="mt-4">

                <p className="text-lg font-bold text-white">
                  {job.title}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Job status:{" "}
                  <span className="font-medium text-slate-300">
                    {job.status}
                  </span>
                </p>

                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
                >
                  View job →
                </Link>

              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No job is linked to this quote.
              </p>
            )}

          </section>

        </div>

        {/* Quote dates */}

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Quote information
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Quote date
              </p>

              <p className="mt-2 font-semibold text-white">
                {formatCreatedDate(
                  quote.created_at
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Valid until
              </p>

              <p className="mt-2 font-semibold text-white">
                {formatDate(
                  quote.valid_until
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Status
              </p>

              <p className="mt-2 font-semibold text-white">
                {getStatusLabel(
                  quote.status
                )}
              </p>
            </div>

          </div>

        </section>

        {/* Financial summary */}

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">

            <div className="flex-1">

              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Quote summary
              </h2>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-5">

                <div className="flex justify-between gap-4">

                  <div>
                    <p className="font-semibold text-white">
                      {quote.title}
                    </p>

                    {quote.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {quote.description}
                      </p>
                    )}
                  </div>

                  <p className="font-semibold text-white">
                    {formatCurrency(
                      quote.subtotal
                    )}
                  </p>

                </div>

              </div>

            </div>

            <div className="w-full lg:max-w-sm">

              <div className="flex justify-between border-b border-slate-800 py-3 text-sm">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-medium text-white">
                  {formatCurrency(
                    quote.subtotal
                  )}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 py-3 text-sm">
                <span className="text-slate-500">
                  Tax
                </span>

                <span className="font-medium text-white">
                  {formatCurrency(
                    quote.tax
                  )}
                </span>
              </div>

              <div className="mt-3 flex justify-between rounded-xl bg-blue-600 px-5 py-4 text-white">
                <span className="font-semibold">
                  Total
                </span>

                <span className="text-xl font-bold">
                  {formatCurrency(
                    quote.total
                  )}
                </span>
              </div>

            </div>

          </div>

        </section>

        {/* Notes */}

        {quote.notes && (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Notes
            </h2>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {quote.notes}
            </p>

          </section>
        )}

        {/* Bottom action */}

        <div className="mt-8 flex flex-wrap justify-end gap-3">

          <Link
            href="/dashboard/quotes"
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Back to Quotes
          </Link>

          <Link
            href={`/dashboard/quotes/${quote.id}/edit`}
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Edit Quote
          </Link>
		  
		  <Link
          href={`/dashboard/quotes/${quote.id}/follow-up`}
           className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
          🤖 AI Follow-Up
          </Link>

          <Link
            href={`/dashboard/quotes/${quote.id}/print`}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Print / Save PDF
          </Link>

        </div>

      </div>

    </main>
  );
}