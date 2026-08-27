"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Reminder = {
  id: string;
  quote_id: string;
  business_id: string;
  reminder_type: string;
  status: string;
  generated_message: string | null;
  due_at: string;
  completed_at: string | null;

  quote: {
    id: string;
    quote_number: string | null;
    title: string | null;
    total: number | null;
    status: string;
    created_at: string;
    valid_until: string | null;

    customer: {
      first_name: string;
      last_name: string | null;
      email: string | null;
      company_name: string | null;
    } | null;
  } | null;
};

export default function QuoteRemindersPage() {
  const router = useRouter();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        console.error(
          "Business loading error:",
          businessError
        );

        throw new Error(
          "Unable to load your business."
        );
      }

      if (!business) {
        router.replace("/onboarding");
        return;
      }

      const {
        data,
        error: remindersError,
      } = await supabase
        .from("quote_follow_ups")
        .select(`
          id,
          quote_id,
          business_id,
          reminder_type,
          status,
          generated_message,
          due_at,
          completed_at,
          quotes (
            id,
            quote_number,
            title,
            total,
            status,
            created_at,
            valid_until,
            customers (
              first_name,
              last_name,
              email,
              company_name
            )
          )
        `)
        .eq("business_id", business.id)
        .eq("status", "pending")
        .order("due_at", {
          ascending: true,
        });

      if (remindersError) {
        console.error(
          "Quote reminders loading error:",
          remindersError
        );

        throw new Error(
          "Unable to load quote reminders."
        );
      }

      const formattedReminders: Reminder[] =
        (data ?? []).map((reminder: any) => {
          const quoteData = Array.isArray(
            reminder.quotes
          )
            ? reminder.quotes[0] ?? null
            : reminder.quotes ?? null;

          let customer = null;

          if (quoteData?.customers) {
            customer = Array.isArray(
              quoteData.customers
            )
              ? quoteData.customers[0] ?? null
              : quoteData.customers;
          }

          return {
            id: reminder.id,
            quote_id: reminder.quote_id,
            business_id: reminder.business_id,
            reminder_type:
              reminder.reminder_type,
            status: reminder.status,
            generated_message:
              reminder.generated_message,
            due_at: reminder.due_at,
            completed_at:
              reminder.completed_at,

            quote: quoteData
              ? {
                  id: quoteData.id,
                  quote_number:
                    quoteData.quote_number,
                  title: quoteData.title,
                  total:
                    Number(quoteData.total) || 0,
                  status: quoteData.status,
                  created_at:
                    quoteData.created_at,
                  valid_until:
                    quoteData.valid_until,
                  customer,
                }
              : null,
          };
        });

      console.log(
        "QUOTE REMINDERS:",
        formattedReminders
      );

      setReminders(formattedReminders);
    } catch (err) {
      console.error(
        "Quote reminders page error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load quote reminders."
      );
    } finally {
      setLoading(false);
    }
  }

  async function markCompleted(
    reminderId: string
  ) {
    if (completingId) {
      return;
    }

    setError("");
    setCompletingId(reminderId);

    try {
      const now =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("quote_follow_ups")
        .update({
          status: "completed",
          completed_at: now,
        })
        .eq("id", reminderId)
        .eq("status", "pending");

      if (updateError) {
        console.error(
          "Reminder completion error:",
          updateError
        );

        throw updateError;
      }

      setReminders((current) =>
        current.filter(
          (reminder) =>
            reminder.id !== reminderId
        )
      );
    } catch (err) {
      console.error(
        "Complete reminder error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the reminder."
      );
    } finally {
      setCompletingId(null);
    }
  }

  function formatDate(
    dateString: string | null
  ) {
    if (!dateString) {
      return "—";
    }

    return new Date(
      dateString
    ).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatDateTime(
    dateString: string
  ) {
    return new Date(
      dateString
    ).toLocaleString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function getCustomerName(
  customer: NonNullable<Reminder["quote"]>["customer"]
) {
  if (!customer) {
    return "Unknown customer";
  }

  const fullName = [
    customer.first_name,
    customer.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    customer.company_name ||
    fullName ||
    "Customer"
  );
}

  function getDaysWaiting(
    createdAt: string
  ) {
    const created =
      new Date(createdAt);

    const now = new Date();

    const difference =
      now.getTime() -
      created.getTime();

    return Math.max(
      0,
      Math.floor(
        difference /
          (1000 * 60 * 60 * 24)
      )
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-white/10 bg-slate-900 p-8">
            <p className="text-slate-400">
              Loading quote reminders...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8">

          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>
              <h1 className="text-3xl font-bold">
                Quote Reminders
              </h1>

              <p className="mt-2 text-slate-400">
                Follow up with customers who
                are waiting to respond to your
                quotes.
              </p>
            </div>

            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              View all quotes
            </Link>

          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-xl border border-yellow-500/20 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Pending reminders
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-300">
              {reminders.length}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Quotes waiting
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                reminders.filter(
                  (reminder) =>
                    reminder.quote
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Action required
            </p>

            <p className="mt-2 text-3xl font-bold">
              {reminders.length > 0
                ? "Yes"
                : "No"}
            </p>
          </div>

        </div>

        {/* NO REMINDERS */}

        {reminders.length === 0 && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-10 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-2xl">
              ✓
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              You're all caught up
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              There are currently no quote
              reminders waiting for your
              attention.
            </p>

            <Link
              href="/dashboard/quotes"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500"
            >
              View quotes
            </Link>

          </div>
        )}

        {/* REMINDERS */}

        {reminders.length > 0 && (
          <div className="space-y-4">

            {reminders.map(
              (reminder) => {
                const quote =
                  reminder.quote;

                const customer =
                  quote?.customer;

                const customerName =
  getCustomerName(
    customer ?? null
  );

                const daysWaiting =
                  quote
                    ? getDaysWaiting(
                        quote.created_at
                      )
                    : 0;

                return (
                  <div
                    key={reminder.id}
                    className="rounded-xl border border-yellow-500/20 bg-slate-900 p-6"
                  >

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                      {/* QUOTE INFO */}

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-3">

                          <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                            Follow-up needed
                          </span>

                          {quote?.quote_number && (
                            <span className="text-sm text-slate-500">
                              {quote.quote_number}
                            </span>
                          )}

                        </div>

                        <h2 className="mt-3 text-xl font-semibold">
                          {quote?.title ||
                            "Quote"}
                        </h2>

                        <p className="mt-2 text-sm text-slate-300">
                          {customerName}
                        </p>

                        {customer?.email && (
                          <p className="mt-1 text-sm text-slate-500">
                            {customer.email}
                          </p>
                        )}

                        <div className="mt-5 grid gap-4 sm:grid-cols-3">

                          <div>
                            <p className="text-xs text-slate-500">
                              Quote total
                            </p>

                            <p className="mt-1 font-semibold">
                              £
                              {Number(
                                quote?.total ||
                                  0
                              ).toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Sent / created
                            </p>

                            <p className="mt-1 font-semibold">
                              {formatDate(
                                quote?.created_at ||
                                  null
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Waiting
                            </p>

                            <p className="mt-1 font-semibold text-yellow-300">
                              {daysWaiting}{" "}
                              {daysWaiting ===
                              1
                                ? "day"
                                : "days"}
                            </p>
                          </div>

                        </div>

                        <div className="mt-5 rounded-lg border border-white/5 bg-slate-950/60 p-4">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Reminder due
                          </p>

                          <p className="mt-1 text-sm text-slate-300">
                            {formatDateTime(
                              reminder.due_at
                            )}
                          </p>

                        </div>

                      </div>

                      {/* ACTIONS */}

                      <div className="flex w-full flex-col gap-3 lg:w-56">

                        {quote && (
                          <Link
                            href={`/dashboard/quotes/${quote.id}/follow-up`}
                            className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold hover:bg-blue-500"
                          >
                            Generate follow-up
                          </Link>
                        )}

                        {quote && (
                          <Link
                            href={`/dashboard/quotes/${quote.id}`}
                            className="rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-center text-sm font-semibold hover:bg-slate-700"
                          >
                            View quote
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            markCompleted(
                              reminder.id
                            )
                          }
                          disabled={
                            completingId ===
                            reminder.id
                          }
                          className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-300 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {completingId ===
                          reminder.id
                            ? "Completing..."
                            : "Mark completed"}
                        </button>

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