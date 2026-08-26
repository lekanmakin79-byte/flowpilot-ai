"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Quote = {
  id: string;
  quote_number: string;
  title: string;
  description: string | null;
  status:
    | "draft"
    | "sent"
    | "accepted"
    | "rejected"
    | "expired";
  subtotal: number;
  tax: number;
  total: number;
  valid_until: string | null;
  created_at: string;
  responded_at: string | null;
  customer_id: string;
  job_id: string | null;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
};

type Job = {
  id: string;
  title: string;
};

type QuoteWithRelations = Quote & {
  customer: Customer | null;
  job: Job | null;
};

type ReminderReason =
  | "waiting"
  | "expiring"
  | "waiting-and-expiring";

type ReminderQuote = QuoteWithRelations & {
  reminderReason: ReminderReason;
  daysWaiting: number;
  daysUntilExpiry: number | null;
};

export default function QuotesPage() {
  const router = useRouter();

  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuotes() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: business, error: businessError } =
        await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

      if (businessError) {
        console.error(businessError);
        setError("Unable to load your business.");
        setLoading(false);
        return;
      }

      if (!business) {
        router.replace("/onboarding");
        return;
      }

      const { data, error: quotesError } = await supabase
        .from("quotes")
        .select(
          `
          id,
          quote_number,
          title,
          description,
          status,
          subtotal,
          tax,
          total,
          valid_until,
          created_at,
          responded_at,
          customer_id,
          job_id,
          customers (
            id,
            first_name,
            last_name,
            company_name
          ),
          jobs (
            id,
            title
          )
        `
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (quotesError) {
        console.error(quotesError);
        setError("Unable to load quotes.");
        setLoading(false);
        return;
      }

      const formattedQuotes: QuoteWithRelations[] =
        (data ?? []).map((quote: any) => ({
          ...quote,

          customer: Array.isArray(quote.customers)
            ? quote.customers[0] ?? null
            : quote.customers ?? null,

          job: Array.isArray(quote.jobs)
            ? quote.jobs[0] ?? null
            : quote.jobs ?? null,
        }));

      setQuotes(formattedQuotes);
      setLoading(false);
    }

    loadQuotes();
  }, [router]);

  // ----------------------------------------
  // DATE HELPERS
  // ----------------------------------------

  function getStartOfToday() {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return today;
  }

  function getDaysBetween(
    earlierDate: string | Date,
    laterDate: string | Date
  ) {
    const earlier = new Date(earlierDate);
    const later = new Date(laterDate);

    earlier.setHours(0, 0, 0, 0);
    later.setHours(0, 0, 0, 0);

    const difference =
      later.getTime() - earlier.getTime();

    return Math.floor(
      difference / (1000 * 60 * 60 * 24)
    );
  }

  // ----------------------------------------
  // QUOTE REMINDER LOGIC
  // ----------------------------------------

  function getReminderQuote(
    quote: QuoteWithRelations
  ): ReminderQuote | null {
    /*
     * Only sent quotes should normally require
     * customer follow-up.
     *
     * Accepted, rejected, expired and draft quotes
     * are therefore excluded.
     */

    if (quote.status !== "sent") {
      return null;
    }

    /*
     * If the customer has already responded,
     * there is no need to remind them.
     */

    if (quote.responded_at) {
      return null;
    }

    const today = getStartOfToday();

    const createdDate = new Date(quote.created_at);
    createdDate.setHours(0, 0, 0, 0);

    const daysWaiting = getDaysBetween(
      createdDate,
      today
    );

    /*
     * A quote becomes a follow-up candidate after
     * three days without a response.
     */

    const waitingForResponse = daysWaiting >= 3;

    let daysUntilExpiry: number | null = null;

    let expiringSoon = false;

    if (quote.valid_until) {
      const expiryDate = new Date(
        `${quote.valid_until}T00:00:00`
      );

      daysUntilExpiry = getDaysBetween(
        today,
        expiryDate
      );

      /*
       * Only future quotes that expire within
       * three days are considered "expiring soon".
       */

      expiringSoon =
        daysUntilExpiry >= 0 &&
        daysUntilExpiry <= 3;
    }

    if (
      !waitingForResponse &&
      !expiringSoon
    ) {
      return null;
    }

    let reminderReason: ReminderReason;

    if (
      waitingForResponse &&
      expiringSoon
    ) {
      reminderReason = "waiting-and-expiring";
    } else if (waitingForResponse) {
      reminderReason = "waiting";
    } else {
      reminderReason = "expiring";
    }

    return {
      ...quote,
      reminderReason,
      daysWaiting,
      daysUntilExpiry,
    };
  }

  const reminderQuotes: ReminderQuote[] =
    quotes
      .map(getReminderQuote)
      .filter(
        (
          quote
        ): quote is ReminderQuote =>
          quote !== null
      );

  // ----------------------------------------
  // STATUS LABEL
  // ----------------------------------------

  function getStatusLabel(status: Quote["status"]) {
    switch (status) {
      case "sent":
        return "Sent";

      case "accepted":
        return "Accepted";

      case "rejected":
        return "Rejected";

      case "expired":
        return "Expired";

      case "draft":
        return "Draft";

      default:
        return status;
    }
  }

  // ----------------------------------------
  // STATUS COLOURS
  // ----------------------------------------

  function getStatusClasses(
    status: Quote["status"]
  ) {
    switch (status) {
      case "accepted":
        return "bg-green-500/10 text-green-300";

      case "sent":
        return "bg-blue-500/10 text-blue-300";

      case "rejected":
        return "bg-red-500/10 text-red-300";

      case "expired":
        return "bg-orange-500/10 text-orange-300";

      default:
        return "bg-slate-500/10 text-slate-400";
    }
  }

  // ----------------------------------------
  // REMINDER MESSAGE
  // ----------------------------------------

  function getReminderMessage(
    quote: ReminderQuote
  ) {
    if (
      quote.reminderReason ===
      "waiting-and-expiring"
    ) {
      return `Waiting ${quote.daysWaiting} days and expires in ${quote.daysUntilExpiry} ${
        quote.daysUntilExpiry === 1
          ? "day"
          : "days"
      }.`;
    }

    if (
      quote.reminderReason === "waiting"
    ) {
      return `No customer response for ${quote.daysWaiting} ${
        quote.daysWaiting === 1
          ? "day"
          : "days"
      }.`;
    }

    if (
      quote.daysUntilExpiry === 0
    ) {
      return "Expires today.";
    }

    return `Expires in ${quote.daysUntilExpiry} ${
      quote.daysUntilExpiry === 1
        ? "day"
        : "days"
    }.`;
  }

  // ----------------------------------------
  // PAGE LOADING
  // ----------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading quotes...
        </p>
      </main>
    );
  }

  // ----------------------------------------
  // PAGE
  // ----------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-3 text-4xl font-bold">
              Quotes
            </h1>

            <p className="mt-2 text-slate-400">
              Create and manage quotes for your
              customers.
            </p>
          </div>

          <Link
            href="/dashboard/quotes/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            + New Quote
          </Link>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* -------------------------------------- */}
        {/* QUOTE REMINDERS */}
        {/* -------------------------------------- */}

        {reminderQuotes.length > 0 && (
          <section className="mt-8">

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                <div>
                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-xl">
                      🔔
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold">
                        Quote Follow-Ups
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        {reminderQuotes.length}{" "}
                        {reminderQuotes.length === 1
                          ? "quote needs"
                          : "quotes need"}{" "}
                        your attention.
                      </p>
                    </div>

                  </div>
                </div>

              </div>

              <div className="mt-5 space-y-3">

                {reminderQuotes.map(
                  (quote) => (
                    <div
                      key={quote.id}
                      className="rounded-xl border border-white/10 bg-slate-900/80 p-5"
                    >

                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-3">

                            <span className="text-sm font-semibold text-blue-400">
                              {quote.quote_number}
                            </span>

                            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                              Needs attention
                            </span>

                          </div>

                          <h3 className="mt-2 text-lg font-semibold">
                            {quote.title}
                          </h3>

                          {quote.customer && (
                            <p className="mt-1 text-sm text-slate-300">
                              {quote.customer.first_name}{" "}
                              {quote.customer.last_name ?? ""}
                              {quote.customer.company_name
                                ? ` · ${quote.customer.company_name}`
                                : ""}
                            </p>
                          )}

                          <p className="mt-2 text-sm text-amber-300/80">
                            {getReminderMessage(
                              quote
                            )}
                          </p>

                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">

                          <Link
                            href={`/dashboard/quotes/${quote.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                          >
                            View Quote
                          </Link>

                          <Link
                            href={`/dashboard/quotes/${quote.id}/follow-up`}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                          >
                            🤖 Generate Follow-Up
                          </Link>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>

          </section>
        )}

        {/* -------------------------------------- */}
        {/* NO QUOTES */}
        {/* -------------------------------------- */}

        {quotes.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-10 text-center">

            <h2 className="text-xl font-semibold">
              No quotes yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Create your first quote and connect
              it to a customer or job.
            </p>

            <Link
              href="/dashboard/quotes/new"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Create your first quote
            </Link>

          </div>
        ) : (
          /* -------------------------------------- */
          /* ALL QUOTES */
          /* -------------------------------------- */

          <div className="mt-8">

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-semibold">
                  All Quotes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {quotes.length}{" "}
                  {quotes.length === 1
                    ? "quote"
                    : "quotes"}{" "}
                  in your system.
                </p>
              </div>

            </div>

            <div className="space-y-4">

              {quotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/quotes/${quote.id}`}
                  className="block rounded-2xl border border-white/10 bg-slate-900 p-6 transition hover:border-blue-500/40 hover:bg-slate-900/80"
                >

                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-3">

                        <span className="text-sm font-medium text-blue-400">
                          {quote.quote_number}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                            quote.status
                          )}`}
                        >
                          {getStatusLabel(
                            quote.status
                          )}
                        </span>

                        {reminderQuotes.some(
                          (reminder) =>
                            reminder.id ===
                            quote.id
                        ) && (
                          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                            🔔 Follow-up needed
                          </span>
                        )}

                      </div>

                      <h2 className="mt-2 text-xl font-semibold">
                        {quote.title}
                      </h2>

                      {quote.customer && (
                        <p className="mt-2 text-sm text-slate-300">
                          Customer:{" "}
                          {quote.customer.first_name}{" "}
                          {quote.customer.last_name ??
                            ""}
                          {quote.customer
                            .company_name
                            ? ` · ${quote.customer.company_name}`
                            : ""}
                        </p>
                      )}

                      {quote.job && (
                        <p className="mt-1 text-sm text-slate-400">
                          Job: {quote.job.title}
                        </p>
                      )}

                      {quote.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                          {quote.description}
                        </p>
                      )}

                    </div>

                    <div className="shrink-0 text-left md:text-right">

                      <p className="text-2xl font-bold">
                        £
                        {Number(
                          quote.total
                        ).toFixed(2)}
                      </p>

                      {quote.valid_until && (
                        <p className="mt-2 text-sm text-slate-400">
                          Valid until{" "}
                          {new Date(
                            `${quote.valid_until}T00:00:00`
                          ).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      )}

                    </div>

                  </div>

                </Link>
              ))}

            </div>

          </div>
        )}

      </div>
    </main>
  );
}