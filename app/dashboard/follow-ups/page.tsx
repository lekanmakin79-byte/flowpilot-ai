"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type Business = {
  id: string;
  business_name: string;
  currency: string;
};

type QuoteFollowUp = {
  id: string;
  business_id: string;
  quote_id: string;
  reminder_type: string;
  status: string;
  generated_message: string | null;
  due_at: string;
  quote: {
    id: string;
    quote_number: string;
    title: string;
    total: number;
    customer: {
      first_name: string;
      last_name: string | null;
      company_name: string | null;
    } | null;
  } | null;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatCurrency(
  amount: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
}

function formatDueDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getCustomerName(
  customer: NonNullable<QuoteFollowUp["quote"]>["customer"]
) {
  if (!customer) {
    return "Customer";
  }

  const fullName = `${customer.first_name} ${
    customer.last_name ?? ""
  }`.trim();

  if (customer.company_name) {
    return fullName
      ? `${fullName} · ${customer.company_name}`
      : customer.company_name;
  }

  return fullName || "Customer";
}

function getReminderLabel(
  reminderType: string
) {
  switch (reminderType) {
    case "first":
      return "First follow-up";

    case "second":
      return "Second follow-up";

    case "final":
      return "Final follow-up";

    case "manual":
      return "Manual follow-up";

    default:
      return reminderType
        ? reminderType
            .replaceAll("_", " ")
            .replace(
              /\b\w/g,
              (letter) =>
                letter.toUpperCase()
            )
        : "Quote follow-up";
  }
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function FollowUpsPage() {
  const router = useRouter();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [followUps, setFollowUps] =
    useState<QuoteFollowUp[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD FOLLOW-UPS
  |--------------------------------------------------------------------------
  */

  async function loadFollowUps(
    showRefresh = false
  ) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      /*
      |--------------------------------------------------------------------------
      | AUTHENTICATION
      |--------------------------------------------------------------------------
      */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        router.replace("/login");
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | BUSINESS
      |--------------------------------------------------------------------------
      */

      const {
        data: businessData,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select(
          "id, business_name, currency"
        )
        .eq(
          "owner_id",
          user.id
        )
        .maybeSingle();

      if (businessError) {
        console.error(
          "Follow-ups business lookup error:",
          businessError
        );

        setError(
          "Unable to load your business."
        );

        return;
      }

      if (!businessData) {
        router.replace(
          "/onboarding"
        );

        return;
      }

      setBusiness(
        businessData
      );

      /*
      |--------------------------------------------------------------------------
      | LOAD PENDING FOLLOW-UPS
      |--------------------------------------------------------------------------
      */

      const {
        data: followUpData,
        error: followUpError,
      } = await supabase
        .from("quote_follow_ups")
        .select(
          `
            id,
            business_id,
            quote_id,
            reminder_type,
            status,
            generated_message,
            due_at
          `
        )
        .eq(
          "business_id",
          businessData.id
        )
        .eq(
          "status",
          "pending"
        )
        .order(
          "due_at",
          {
            ascending: true,
          }
        );

      if (followUpError) {
        console.error(
          "Follow-up loading error:",
          followUpError
        );

        setError(
          "Unable to load your follow-ups."
        );

        setFollowUps([]);

        return;
      }

      if (
        !followUpData ||
        followUpData.length === 0
      ) {
        setFollowUps([]);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD RELATED QUOTES
      |--------------------------------------------------------------------------
      */

      const quoteIds =
        followUpData
          .map(
            (followUp) =>
              followUp.quote_id
          )
          .filter(Boolean);

      if (
        quoteIds.length === 0
      ) {
        setFollowUps([]);

        return;
      }

      const {
        data: relatedQuoteData,
        error: quoteError,
      } = await supabase
        .from("quotes")
        .select(
          `
            id,
            quote_number,
            title,
            total,
            customer_id
          `
        )
        .in(
          "id",
          quoteIds
        );

      if (quoteError) {
        console.error(
          "Related quote loading error:",
          quoteError
        );

        setError(
          "Unable to load the related quotes."
        );

        setFollowUps([]);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD CUSTOMERS
      |--------------------------------------------------------------------------
      */

      const customerIds =
        (relatedQuoteData ?? [])
          .map(
            (quote) =>
              quote.customer_id
          )
          .filter(Boolean);

      let customerData: {
        id: string;
        first_name: string;
        last_name: string | null;
        company_name: string | null;
      }[] = [];

      if (
        customerIds.length > 0
      ) {
        const {
          data: customers,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(
            `
              id,
              first_name,
              last_name,
              company_name
            `
          )
          .in(
            "id",
            customerIds
          );

        if (customerError) {
          console.error(
            "Customer loading error:",
            customerError
          );
        } else {
          customerData =
            customers ?? [];
        }
      }

      /*
      |--------------------------------------------------------------------------
      | COMBINE DATA
      |--------------------------------------------------------------------------
      */

      const formattedFollowUps: QuoteFollowUp[] =
        followUpData.map(
          (followUp) => {
            const quote =
              (
                relatedQuoteData ??
                []
              ).find(
                (item) =>
                  item.id ===
                  followUp.quote_id
              );

            const customer =
              quote?.customer_id
                ? customerData.find(
                    (item) =>
                      item.id ===
                      quote.customer_id
                  )
                : null;

            return {
              id: followUp.id,

              business_id:
                followUp.business_id,

              quote_id:
                followUp.quote_id,

              reminder_type:
                followUp.reminder_type,

              status:
                followUp.status,

              generated_message:
                followUp.generated_message,

              due_at:
                followUp.due_at,

              quote: quote
                ? {
                    id: quote.id,

                    quote_number:
                      quote.quote_number,

                    title:
                      quote.title,

                    total:
                      Number(
                        quote.total
                      ) || 0,

                    customer:
                      customer
                        ? {
                            first_name:
                              customer.first_name,

                            last_name:
                              customer.last_name,

                            company_name:
                              customer.company_name,
                          }
                        : null,
                  }
                : null,
            };
          }
        );

      setFollowUps(
        formattedFollowUps
      );
    } catch (loadError) {
      console.error(
        "Unexpected follow-up page error:",
        loadError
      );

      setError(
        "Something went wrong while loading your follow-ups."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    void loadFollowUps();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOADING STATE
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 w-64 rounded bg-slate-800" />

            <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-800" />

            <div className="mt-8 space-y-4">
              <div className="h-48 rounded-xl bg-slate-900" />
              <div className="h-48 rounded-xl bg-slate-900" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              AI Follow-ups
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Manage customers who need a follow-up on an outstanding quote and generate personalised AI follow-up messages.
            </p>

            {business && (
              <p className="mt-2 text-xs text-slate-500">
                {business.business_name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() =>
                void loadFollowUps(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <Link
              href="/dashboard/ai-assistant"
              className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
            >
              Open AI Assistant
            </Link>

          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-5">
            <h2 className="font-semibold text-red-300">
              Unable to load follow-ups
            </h2>

            <p className="mt-2 text-sm text-red-200/80">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadFollowUps(
                  true
                )
              }
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              Try again
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Pending follow-ups
            </p>

            <p className="mt-2 text-3xl font-bold">
              {followUps.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Quotes currently needing attention
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              AI messages generated
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                followUps.filter(
                  (item) =>
                    Boolean(
                      item.generated_message
                    )
                ).length
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Ready to review or send
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Awaiting AI generation
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                followUps.filter(
                  (item) =>
                    !item.generated_message
                ).length
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Follow-ups without an AI message
            </p>
          </div>

        </div>

        {/* EMPTY STATE */}

        {followUps.length === 0 && !error && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-10 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-3xl">
              ✨
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              No pending follow-ups
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              You currently have no outstanding quote follow-ups needing attention. When a quote becomes due for follow-up, it will appear here.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">

              <Link
                href="/dashboard/quotes"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                View quotes
              </Link>

              <Link
                href="/dashboard/quote-reminders"
                className="rounded-lg border border-white/10 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Quote reminders
              </Link>

            </div>
          </div>
        )}

        {/* FOLLOW-UP LIST */}

        {followUps.length > 0 && (
          <div className="mt-8 space-y-5">

            {followUps.map(
              (followUp) => {

                const quote =
                  followUp.quote;

                const customerName =
                  getCustomerName(
                    quote?.customer ??
                      null
                  );

                return (
                  <div
                    key={
                      followUp.id
                    }
                    className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
                  >

                    {/* CARD HEADER */}

                    <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-start">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                            {getReminderLabel(
                              followUp.reminder_type
                            )}
                          </span>

                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                            Pending
                          </span>

                        </div>

                        <h2 className="mt-3 text-lg font-semibold">
                          {customerName}
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                          {quote
                            ? `${quote.quote_number} · ${quote.title}`
                            : "Quote information unavailable"}
                        </p>

                      </div>

                      <div className="text-left sm:text-right">

                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Follow-up due
                        </p>

                        <p className="mt-1 text-sm font-semibold text-yellow-300">
                          {formatDueDate(
                            followUp.due_at
                          )}
                        </p>

                      </div>

                    </div>

                    {/* CARD BODY */}

                    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.3fr]">

                      {/* QUOTE DETAILS */}

                      <div>

                        <h3 className="text-sm font-semibold text-slate-200">
                          Quote details
                        </h3>

                        {quote ? (
                          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">

                            <div className="flex items-start justify-between gap-4">

                              <div className="min-w-0">

                                <p className="text-sm font-semibold text-blue-400">
                                  {
                                    quote.quote_number
                                  }
                                </p>

                                <p className="mt-1 text-sm text-slate-300">
                                  {
                                    quote.title
                                  }
                                </p>

                              </div>

                              <p className="shrink-0 text-sm font-bold text-white">
                                {formatCurrency(
                                  quote.total,
                                  business?.currency ??
                                    "GBP"
                                )}
                              </p>

                            </div>

                            <div className="mt-4 border-t border-white/10 pt-4">

                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Customer
                              </p>

                              <p className="mt-1 text-sm text-slate-300">
                                {customerName}
                              </p>

                            </div>

                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                            The quote associated with this follow-up could not be found.
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3">

                          {quote && (
                            <>
                              <Link
                                href={`/dashboard/quotes/${quote.id}`}
                                className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                              >
                                View quote
                              </Link>

                              <Link
                                href={`/dashboard/quotes/${quote.id}/follow-up`}
                                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
                              >
                                ✨ Generate AI follow-up
                              </Link>
                            </>
                          )}

                        </div>

                      </div>

                      {/* AI MESSAGE */}

                      <div>

                        <div className="flex items-center justify-between gap-3">

                          <h3 className="text-sm font-semibold text-slate-200">
                            AI follow-up message
                          </h3>

                          {followUp.generated_message && (
                            <span className="text-xs font-medium text-green-400">
                              Generated
                            </span>
                          )}

                        </div>

                        {followUp.generated_message ? (
                          <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">

                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                              {
                                followUp.generated_message
                              }
                            </p>

                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-5">

                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-xl">
                              ✨
                            </div>

                            <h4 className="mt-4 font-semibold">
                              No AI message yet
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              Generate a personalised follow-up message for this customer based on the quote and follow-up context.
                            </p>

                            {quote && (
                              <Link
                                href={`/dashboard/quotes/${quote.id}/follow-up`}
                                className="mt-4 inline-flex rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
                              >
                                Generate message →
                              </Link>
                            )}

                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>
    </main>
  );
}
