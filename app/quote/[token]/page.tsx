"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Quote = {
  id: string;
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
  responded_at: string | null;
};

type Business = {
  id: string;
  business_name?: string | null;
  business_type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  currency?: string | null;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
};

type ApiResponse = {
  success: boolean;
  quote: Quote;
  business: Business | null;
  customer: Customer | null;
  message?: string;
};

export default function PublicQuotePage() {
  const params = useParams();

  const token = params.token as string;

  const [data, setData] =
    useState<ApiResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [responding, setResponding] =
    useState(false);

  const [responseMessage, setResponseMessage] =
    useState("");

  useEffect(() => {
    async function loadQuote() {
      if (!token) {
        setError("Invalid quote link.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/public/quotes/${encodeURIComponent(token)}`,
          {
            cache: "no-store",
          }
        );

        const text = await response.text();

        let result: ApiResponse;

        try {
          result = JSON.parse(text);
        } catch {
          console.error(
            "Public quote API returned non-JSON:",
            text
          );

          throw new Error(
            "Unable to load quote."
          );
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Unable to load quote."
          );
        }

        setData(result);
      } catch (err) {
        console.error(
          "Public quote loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load quote."
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuote();
  }, [token]);

  async function respond(
    action: "accepted" | "rejected"
  ) {
    if (!token || !data?.quote) {
      return;
    }

    const confirmed = window.confirm(
      action === "accepted"
        ? "Are you sure you want to accept this quote?"
        : "Are you sure you want to reject this quote?"
    );

    if (!confirmed) {
      return;
    }

    setResponding(true);
    setResponseMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/public/quotes/${encodeURIComponent(
          token
        )}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: action,
          }),
        }
      );

      const text = await response.text();

      let result: {
        success: boolean;
        message?: string;
        quote?: Quote;
      };

      try {
        result = JSON.parse(text);
      } catch {
        console.error(
          "Quote response API returned non-JSON:",
          text
        );

        throw new Error(
          "Unable to process your response."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to process your response."
        );
      }

      if (result.quote) {
        setData((current) =>
          current
            ? {
                ...current,
                quote: result.quote!,
              }
            : current
        );
      }

      setResponseMessage(
        action === "accepted"
          ? "Thank you. You have accepted this quote."
          : "Thank you. You have rejected this quote."
      );
    } catch (err) {
      console.error(
        "Quote response error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to process your response."
      );
    } finally {
      setResponding(false);
    }
  }

  function formatCurrency(
    value: number | string | null | undefined
  ) {
    return `£${Number(
      value ?? 0
    ).toFixed(2)}`;
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "Not specified";
    }

    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatCreatedDate(
    value: string
  ) {
    return new Date(value).toLocaleDateString(
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
      case "accepted":
        return "Accepted";

      case "rejected":
        return "Rejected";

      case "expired":
        return "Expired";

      case "sent":
        return "Awaiting response";

      default:
        return "Draft";
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Loading your quote...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data?.quote) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Quote unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error ||
              "This quote could not be loaded."}
          </p>

        </div>
      </main>
    );
  }

  const quote = data.quote;
  const business = data.business;
  const customer = data.customer;

  const isFinal =
    quote.status === "accepted" ||
    quote.status === "rejected" ||
    quote.status === "expired";

  const businessAddress =
  business?.address || "";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-4xl">

        {/* Header */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">

          <div className="border-b border-slate-200 px-6 py-8 sm:px-10">

            <div className="flex flex-col justify-between gap-8 sm:flex-row">

              <div>

                <div className="inline-flex rounded-xl bg-slate-900 px-4 py-3">
                  <span className="text-lg font-bold tracking-wide text-white">
                    FLOWPILOT AI
                  </span>
                </div>

                <h1 className="mt-5 text-3xl font-bold text-slate-900">
                  {business?.business_name ||
                    "Your Business"}
                </h1>

                {business?.business_type && (
                  <p className="mt-1 text-sm text-slate-500">
                    {business.business_type}
                  </p>
                )}

                <div className="mt-4 space-y-1 text-sm text-slate-500">

                  {businessAddress && (
                    <p>
                      {businessAddress}
                    </p>
                  )}

                  {business?.email && (
                    <p>
                      {business.email}
                    </p>
                  )}

                  {business?.phone && (
                    <p>
                      {business.phone}
                    </p>
                  )}

                  {business?.website && (
                    <p>
                      {business.website}
                    </p>
                  )}

                </div>

              </div>

              <div className="sm:text-right">

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Quote
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {quote.quote_number}
                </p>

                <span className="mt-4 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                  {getStatusLabel(
                    quote.status
                  )}
                </span>

              </div>

            </div>

          </div>

          {/* Customer information */}

          <div className="grid gap-8 border-b border-slate-200 px-6 py-8 sm:grid-cols-3 sm:px-10">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Prepared for
              </p>

              {customer ? (
                <div className="mt-3">

                  <p className="font-bold text-slate-900">
                    {customer.first_name}{" "}
                    {customer.last_name ?? ""}
                  </p>

                  {customer.company_name && (
                    <p className="mt-1 text-sm text-slate-600">
                      {customer.company_name}
                    </p>
                  )}

                  {customer.email && (
                    <p className="mt-2 text-sm text-slate-500">
                      {customer.email}
                    </p>
                  )}

                  {customer.phone && (
                    <p className="mt-1 text-sm text-slate-500">
                      {customer.phone}
                    </p>
                  )}

                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Customer information unavailable.
                </p>
              )}

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quote date
              </p>

              <p className="mt-3 font-semibold text-slate-900">
                {formatCreatedDate(
                  quote.created_at
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Valid until
              </p>

              <p className="mt-3 font-semibold text-slate-900">
                {formatDate(
                  quote.valid_until
                )}
              </p>

            </div>

          </div>

          {/* Quote */}

          <div className="px-6 py-8 sm:px-10">

            <h2 className="text-3xl font-bold text-slate-900">
              {quote.title}
            </h2>

            {quote.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-500">
                {quote.description}
              </p>
            )}

            {/* Pricing */}

            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">

              <div className="flex justify-between bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">

                <span>
                  Description
                </span>

                <span>
                  Amount
                </span>

              </div>

              <div className="flex justify-between border-t border-slate-200 px-5 py-5">

                <span className="font-medium text-slate-900">
                  {quote.title}
                </span>

                <span className="font-semibold text-slate-900">
                  {formatCurrency(
                    quote.subtotal
                  )}
                </span>

              </div>

            </div>

            {/* Totals */}

            <div className="mt-8 flex justify-end">

              <div className="w-full max-w-sm">

                <div className="flex justify-between border-b border-slate-200 py-3 text-sm">

                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-medium text-slate-900">
                    {formatCurrency(
                      quote.subtotal
                    )}
                  </span>

                </div>

                <div className="flex justify-between border-b border-slate-200 py-3 text-sm">

                  <span className="text-slate-500">
                    Tax
                  </span>

                  <span className="font-medium text-slate-900">
                    {formatCurrency(
                      quote.tax
                    )}
                  </span>

                </div>

                <div className="mt-2 flex justify-between rounded-xl bg-slate-900 px-5 py-4 text-white">

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

            {/* Notes */}

            {quote.notes && (
              <div className="mt-8 rounded-xl bg-slate-50 p-5">

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Notes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {quote.notes}
                </p>

              </div>
            )}

          </div>

          {/* Response */}

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-8 sm:px-10">

            {responseMessage && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-700">
                {responseMessage}
              </div>
            )}

            {!isFinal && !responseMessage && (
              <div className="text-center">

                <h3 className="text-lg font-bold text-slate-900">
                  Ready to respond to this quote?
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Please choose whether you would like to accept or reject this quote.
                </p>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">

                  <button
                    type="button"
                    disabled={responding}
                    onClick={() =>
                      respond("accepted")
                    }
                    className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {responding
                      ? "Processing..."
                      : "Accept Quote"}
                  </button>

                  <button
                    type="button"
                    disabled={responding}
                    onClick={() =>
                      respond("rejected")
                    }
                    className="rounded-lg border border-red-200 bg-white px-8 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject Quote
                  </button>

                </div>

              </div>
            )}

            {isFinal && (
              <div className="text-center">

                <p className="text-sm font-semibold text-slate-700">
                  This quote has been{" "}
                  {quote.status}.
                </p>

              </div>
            )}

          </div>

          {/* Footer */}

          <div className="border-t border-slate-200 px-6 py-6 text-center sm:px-10">

            <p className="text-sm font-semibold text-slate-700">
              Thank you for considering our services.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Powered by FlowPilot AI
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}