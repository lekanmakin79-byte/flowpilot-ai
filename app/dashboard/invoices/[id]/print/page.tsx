"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Invoice = {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  title: string;
  description: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  due_date: string | null;
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

type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

export default function InvoicePrintPage() {
  const router = useRouter();
  const params = useParams();

  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvoice() {
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
        console.error("Business loading error:", businessError);

        router.replace("/onboarding");
        return;
      }

      setBusiness(businessData);

      const { data: invoiceData, error: invoiceError } =
        await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .eq("business_id", businessData.id)
          .maybeSingle();

      if (invoiceError) {
        console.error("Invoice loading error:", invoiceError);

        setError(
          invoiceError.message || "Unable to load invoice."
        );

        setLoading(false);
        return;
      }

      if (!invoiceData) {
        setError("Invoice not found.");
        setLoading(false);
        return;
      }

      setInvoice(invoiceData);

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
  .eq("id", invoiceData.customer_id)
  .eq("business_id", businessData.id)
  .maybeSingle();

      if (customerError) {
        console.error(
          "Customer loading error:",
          customerError
        );
      }

      setCustomer(customerData);

      const { data: itemData, error: itemError } =
        await supabase
          .from("invoice_items")
          .select(
            `
              id,
              invoice_id,
              description,
              quantity,
              unit_price,
              amount
            `
          )
          .eq("invoice_id", invoiceData.id)
          .order("created_at", {
            ascending: true,
          });

      if (itemError) {
        console.error(
          "Invoice items loading error:",
          itemError
        );
      }

      setItems(itemData ?? []);

      setLoading(false);
    }

    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId, router]);

  function formatCurrency(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);

    return `£${amount.toFixed(2)}`;
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "Not set";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatCreatedDate(date: string) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "paid":
        return "PAID";

      case "sent":
        return "SENT";

      case "overdue":
        return "OVERDUE";

      case "cancelled":
        return "CANCELLED";

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
        typeof value === "string" && value.trim().length > 0
    );

    return Array.from(new Set(parts)).join(", ");
  }

 

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-400">
            Preparing invoice...
          </p>
        </div>
      </main>
    );
  }

  if (!invoice || !business) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/dashboard/invoices/${invoiceId}`}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to invoice
          </Link>

          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-xl font-semibold">
              Invoice unavailable
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error || "Unable to load invoice."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const businessAddress = getBusinessAddress();
 

  return (
    <>
      <style jsx global>{`
  @media print {
    @page {
      size: A4;
      margin: 8mm;
    }

    html,
    body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-hidden {
      display: none !important;
    }

    .invoice-page {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
    }

    /* Compact invoice header */
    .invoice-page > div:first-child {
      padding: 18px 24px !important;
    }

    /* Compact invoice information */
    .invoice-page > div:nth-child(2) {
      padding: 14px 24px !important;
      gap: 16px !important;
    }

    /* Compact title section */
    .invoice-page > div:nth-child(3) {
      padding: 18px 24px 0 !important;
    }

    .invoice-page > div:nth-child(3) h2 {
      font-size: 20px !important;
      line-height: 1.25 !important;
    }

    .invoice-page > div:nth-child(3) p {
      margin-top: 4px !important;
      line-height: 1.4 !important;
    }

    /* Compact items section */
    .invoice-page > div:nth-child(4) {
      padding: 14px 24px !important;
    }

    .invoice-page table th,
    .invoice-page table td {
      padding: 8px 12px !important;
    }

    .invoice-page table {
      font-size: 12px !important;
    }

    /* Compact totals */
    .invoice-page > div:nth-child(5) {
      padding: 0 24px 16px !important;
    }

    .invoice-page > div:nth-child(5) > div {
      max-width: 300px !important;
    }

    .invoice-page > div:nth-child(5) .py-3 {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
    }

    .invoice-page > div:nth-child(5) .py-4 {
      padding-top: 10px !important;
      padding-bottom: 10px !important;
    }

    /* Compact notes */
    .invoice-page > div:nth-child(6) {
      padding: 14px 24px !important;
    }

    .invoice-page > div:nth-child(6) p {
      line-height: 1.4 !important;
    }

    /* Compact footer */
    .invoice-page > div:last-child {
      padding: 10px 24px !important;
    }

    .invoice-page > div:last-child p {
      margin-top: 2px !important;
    }

    /* Prevent important invoice sections from splitting */
    .invoice-page table,
    .invoice-page tr,
    .invoice-page > div:nth-child(5),
    .invoice-page > div:nth-child(6),
    .invoice-page > div:last-child {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  }
`}</style>

      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
        <div className="print-hidden mx-auto mb-6 flex max-w-5xl items-center justify-between gap-3">
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to invoice
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="invoice-page mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
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
                      VAT No: {business.vat_number}
                    </p>
                  )}

                  {business.registration_number && (
                    <p>
                      Registration No:{" "}
                      {business.registration_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Invoice
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {invoice.invoice_number}
                </p>

                <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-600">
                  {getStatusLabel(invoice.status)}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice information */}

          <div className="grid gap-8 border-b border-slate-200 px-8 py-8 sm:grid-cols-3 sm:px-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bill to
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
                Invoice date
              </p>

              <p className="mt-3 font-semibold text-slate-900">
                {formatCreatedDate(invoice.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Due date
              </p>

              <p className="mt-3 font-semibold text-slate-900">
                {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {/* Title */}

          <div className="px-8 pt-10 sm:px-12">
            <h2 className="text-2xl font-bold text-slate-900">
              {invoice.title}
            </h2>

            {invoice.description && (
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                {invoice.description}
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
                          {Number(item.quantity)}
                        </td>

                        <td className="px-5 py-4 text-right text-slate-600">
                          {formatCurrency(item.unit_price)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No invoice items.
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
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 py-3 text-sm">
                <span className="text-slate-500">
                  Tax
                </span>

                <span className="font-medium text-slate-900">
                  {formatCurrency(invoice.tax)}
                </span>
              </div>

              <div className="mt-2 flex justify-between rounded-xl bg-slate-900 px-5 py-4 text-white">
                <span className="font-semibold">
                  Total
                </span>

                <span className="text-xl font-bold">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}

          {invoice.notes && (
            <div className="border-t border-slate-200 px-8 py-8 sm:px-12">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Notes
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}

          <div className="border-t border-slate-200 bg-slate-50 px-8 py-6 text-center sm:px-12">
            <p className="text-sm font-semibold text-slate-700">
              Thank you for your business.
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