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
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
};

type Business = {
  id: string;
  business_name?: string | null;
  business_type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postcode?: string | null;
  postal_code?: string | null;
  website?: string | null;
  vat_number?: string | null;
  registration_number?: string | null;
  currency?: string | null;
  [key: string]: unknown;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
};

type QuoteItem = {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

export default function QuotePrintPage() {
  const router = useRouter();
  const params = useParams();

  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle();

      if (businessError || !businessData) {
        console.error(
          "Business loading error:",
          businessError
        );

        router.replace("/onboarding");
        return;
      }

      setBusiness(businessData);

      const { data: quoteData, error: quoteError } =
        await supabase
          .from("quotes")
          .select("*")
          .eq("id", quoteId)
          .eq("business_id", businessData.id)
          .maybeSingle();

     if (quoteError) {
  console.error("Quote loading error:", {
    message: quoteError.message,
    details: quoteError.details,
    hint: quoteError.hint,
    code: quoteError.code,
  });

  setError(
    quoteError.message ||
      "Unable to load quote."
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

      const {
        data: customerData,
        error: customerError,
      } = await supabase
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

      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("quote_items")
        .select(
          `
            id,
            quote_id,
            description,
            quantity,
            unit_price,
            amount
          `
        )
        .eq("quote_id", quoteData.id)
        .order("created_at", {
          ascending: true,
        });

      if (itemError) {
        console.error(
          "Quote items loading error:",
          itemError
        );
      }

      setItems(itemData ?? []);

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

  function getStatusLabel(status: string) {
    switch (status) {
      case "accepted":
        return "ACCEPTED";

      case "sent":
        return "SENT";

      case "rejected":
        return "REJECTED";

      case "expired":
        return "EXPIRED";

      default:
        return "DRAFT";
    }
  }

  function getBusinessAddress() {
    if (!business) {
      return "";
    }

    const parts = [
      business.address,
      business.address_line_1,
      business.address_line_2,
      business.city,
      business.postcode,
      business.postal_code,
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    return Array.from(
      new Set(parts)
    ).join(", ");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-400">
            Preparing quote...
          </p>
        </div>
      </main>
    );
  }

  if (!quote || !business) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
  href={`/dashboard/quotes/${quoteId}`}
  className="print:hidden text-sm text-blue-400 hover:text-blue-300"
>
  ← Back to quote
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

  const businessAddress =
    getBusinessAddress();

  return (
    <>
     <style jsx global>{`
  @media print {
    @page {
      size: A4 portrait;
      margin: 5mm;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: #0f172a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-hidden {
      display: none !important;
    }

    /*
     * Make the entire quote fit on one A4 page.
     */
    .quote-page {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;

      /*
       * Slightly reduce the whole document when printing.
       * This prevents a second page while keeping the
       * normal screen version unchanged.
       */
      zoom: 0.78;
    }

    /*
     * Compact horizontal spacing
     */
    .quote-page .px-8,
    .quote-page .sm\\:px-12 {
      padding-left: 16px !important;
      padding-right: 16px !important;
    }

    /*
     * Compact vertical spacing
     */
    .quote-page .py-10 {
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }

    .quote-page .py-8 {
      padding-top: 7px !important;
      padding-bottom: 7px !important;
    }

    .quote-page .py-7 {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
    }

    .quote-page .py-6 {
      padding-top: 5px !important;
      padding-bottom: 5px !important;
    }

    .quote-page .py-5 {
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }

    .quote-page .py-4 {
      padding-top: 3px !important;
      padding-bottom: 3px !important;
    }

    .quote-page .pt-10 {
      padding-top: 8px !important;
    }

    .quote-page .pt-7 {
      padding-top: 6px !important;
    }

    .quote-page .pt-5 {
      padding-top: 4px !important;
    }

    .quote-page .pb-10 {
      padding-bottom: 8px !important;
    }

    .quote-page .pb-7 {
      padding-bottom: 6px !important;
    }

    /*
     * Compact gaps
     */
    .quote-page .gap-8 {
      gap: 10px !important;
    }

    .quote-page .gap-6 {
      gap: 8px !important;
    }

    /*
     * Compact margins
     */
    .quote-page .mt-5 {
      margin-top: 5px !important;
    }

    .quote-page .mt-4 {
      margin-top: 4px !important;
    }

    .quote-page .mt-3 {
      margin-top: 3px !important;
    }

    .quote-page .mt-2 {
      margin-top: 2px !important;
    }

    .quote-page .mt-1 {
      margin-top: 1px !important;
    }

    /*
     * Smaller print typography
     */
    .quote-page .text-3xl {
      font-size: 1.25rem !important;
      line-height: 1.4rem !important;
    }

    .quote-page .text-2xl {
      font-size: 1.05rem !important;
      line-height: 1.25rem !important;
    }

    .quote-page .text-xl {
      font-size: 0.9rem !important;
      line-height: 1.1rem !important;
    }

    .quote-page .text-sm {
      font-size: 0.68rem !important;
      line-height: 0.9rem !important;
    }

    .quote-page .text-xs {
      font-size: 0.58rem !important;
      line-height: 0.75rem !important;
    }

    /*
     * Compact table
     */
    .quote-page table {
      font-size: 0.68rem !important;
    }

    .quote-page th,
    .quote-page td {
      padding: 4px 7px !important;
    }

    /*
     * Only keep genuinely small elements together.
     *
     * IMPORTANT:
     * Do NOT apply break-inside: avoid to every
     * direct child of .quote-page. That was causing
     * the second page.
     */
    .print-avoid-break {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .quote-footer {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /*
     * Keep the pricing table together.
     */
    table,
    thead,
    tbody,
    tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /*
     * Keep totals together.
     */
    .max-w-sm {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /*
     * Remove unnecessary rounded corners in print.
     */
    .quote-page .rounded-2xl {
      border-radius: 0 !important;
    }

    .quote-page .rounded-xl {
      border-radius: 3px !important;
    }

    /*
     * Hide anything accidentally marked as screen-only.
     */
    .screen-only {
      display: none !important;
    }
  }
`}</style>

      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
        <div className="print-hidden mx-auto mb-6 flex max-w-5xl items-center justify-between gap-3">
 <button
  type="button"
  onClick={() => {
    window.location.href = `/dashboard/quotes/${quoteId}`;
  }}
  className="text-sm text-blue-400 hover:text-blue-300"
>
  ← Back to quote
</button>

  <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="quote-page mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}

          <div className="border-b border-slate-200 px-8 py-10 sm:px-12">
            <div className="flex flex-col justify-between gap-8 sm:flex-row">
              <div>
                <div className="inline-flex rounded-xl bg-slate-900 px-4 py-3">
                  <span className="text-xl font-bold tracking-wide text-white">
                    FLOWPILOT AI
                  </span>
                </div>

                <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
                  {business.business_name ||
                    "Your Business"}
                </h1>

                {business.business_type && (
                  <p className="mt-1 text-sm text-slate-500">
                    {business.business_type}
                  </p>
                )}

                <div className="mt-4 space-y-1 text-sm text-slate-500">
                  {businessAddress && (
                    <p>{businessAddress}</p>
                  )}

                  {business.email && (
                    <p>{business.email}</p>
                  )}

                  {business.phone && (
                    <p>{business.phone}</p>
                  )}

                  {business.website && (
                    <p>{business.website}</p>
                  )}

                  {business.vat_number && (
                    <p>
                      VAT No:{" "}
                      {business.vat_number}
                    </p>
                  )}

                  {business.registration_number && (
                    <p>
                      Registration No:{" "}
                      {
                        business.registration_number
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Quote
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {quote.quote_number}
                </p>

                <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-600">
                  {getStatusLabel(quote.status)}
                </div>
              </div>
            </div>
          </div>

          {/* Quote information */}

          <div className="grid gap-8 border-b border-slate-200 px-8 py-8 sm:grid-cols-3 sm:px-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Prepared for
              </p>

              {customer && (
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

          {/* Title */}

          <div className="px-8 pt-10 sm:px-12">
            <h2 className="text-2xl font-bold text-slate-900">
              {quote.title}
            </h2>

            {quote.description && (
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                {quote.description}
              </p>
            )}
          </div>

          {/* Items */}

          <div className="px-8 py-8 sm:px-12">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">
                      Description
                    </th>

                    <th className="px-5 py-4 text-right">
                      Qty
                    </th>

                    <th className="px-5 py-4 text-right">
                      Unit price
                    </th>

                    <th className="px-5 py-4 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {item.description}
                        </td>

                        <td className="px-5 py-4 text-right text-slate-600">
                          {Number(
                            item.quantity
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-slate-600">
                          {formatCurrency(
                            item.unit_price
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(
                            item.amount
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No quote items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}

          <div className="flex justify-end px-8 pb-10 sm:px-12">
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
            <div className="border-t border-slate-200 px-8 py-8 sm:px-12">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Notes
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {quote.notes}
              </p>
            </div>
          )}

          {/* Footer */}

          <div className="border-t border-slate-200 bg-slate-50 px-8 py-6 text-center sm:px-12">
            <p className="text-sm font-semibold text-slate-700">
              Thank you for considering our services.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Generated by FlowPilot AI
            </p>
          </div>
        </div>
      </main>
    </>
  );
}