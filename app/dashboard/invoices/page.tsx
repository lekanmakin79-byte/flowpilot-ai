"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Invoice = {
  id: string;
  customer_id: string;
  invoice_number: string;
  title: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  due_date: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
};

type InvoiceWithCustomer = Invoice & {
  customer: Customer | null;
};

export default function InvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<
    InvoiceWithCustomer[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function loadInvoices() {
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

      if (businessError || !business) {
        console.error(
          "Business loading error:",
          businessError
        );

        router.replace("/onboarding");
        return;
      }

      const {
        data: invoiceData,
        error: invoiceError,
      } = await supabase
        .from("invoices")
        .select(
          `
            id,
            customer_id,
            invoice_number,
            title,
            status,
            subtotal,
            tax,
            total,
            due_date,
            created_at
          `
        )
        .eq("business_id", business.id)
        .order("created_at", {
          ascending: false,
        });

      if (invoiceError) {
        console.error(
          "INVOICE ERROR FULL:",
          JSON.stringify(invoiceError, null, 2)
        );

        console.error(
          "INVOICE ERROR MESSAGE:",
          invoiceError.message
        );

        console.error(
          "INVOICE ERROR CODE:",
          invoiceError.code
        );

        console.error(
          "INVOICE ERROR DETAILS:",
          invoiceError.details
        );

        console.error(
          "INVOICE ERROR HINT:",
          invoiceError.hint
        );

        setError(
          invoiceError.message ||
            "Unable to load invoices."
        );

        setLoading(false);
        return;
      }

      const invoiceRows = invoiceData ?? [];

      if (invoiceRows.length === 0) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      const customerIds = [
        ...new Set(
          invoiceRows.map(
            (invoice) => invoice.customer_id
          )
        ),
      ];

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id, first_name, last_name, company_name"
        )
        .in("id", customerIds)
        .eq("business_id", business.id);

      if (customerError) {
        console.error(
          "Customer loading error:",
          customerError
        );

        setError(
          customerError.message ||
            "Unable to load customers."
        );

        setLoading(false);
        return;
      }

      const customerMap = new Map(
        (customerData ?? []).map((customer) => [
          customer.id,
          customer,
        ])
      );

      const combinedInvoices: InvoiceWithCustomer[] =
        invoiceRows.map((invoice) => ({
          ...invoice,
          customer:
            customerMap.get(invoice.customer_id) ??
            null,
        }));

      setInvoices(combinedInvoices);
      setLoading(false);
    }

    loadInvoices();
  }, [router]);

  function getDisplayStatus(
    status: string,
    dueDate: string | null
  ) {
    if (
      status === "sent" &&
      dueDate &&
      new Date(`${dueDate}T23:59:59`) < new Date()
    ) {
      return "overdue";
    }

    return status;
  }

  function getStatusClasses(status: string) {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-300";

      case "sent":
        return "bg-blue-500/10 text-blue-300";

      case "overdue":
        return "bg-red-500/10 text-red-300";

      case "cancelled":
        return "bg-slate-500/10 text-slate-400";

      default:
        return "bg-slate-500/10 text-slate-400";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "paid":
        return "Paid";

      case "sent":
        return "Sent";

      case "overdue":
        return "Overdue";

      case "cancelled":
        return "Cancelled";

      default:
        return "Draft";
    }
  }

  const filteredInvoices = invoices.filter(
    (invoice) => {
      const displayStatus = getDisplayStatus(
        invoice.status,
        invoice.due_date
      );

      const search = searchTerm
        .trim()
        .toLowerCase();

      const customerName = invoice.customer
        ? `${invoice.customer.first_name} ${
            invoice.customer.last_name ?? ""
          }`
        : "";

      const companyName =
        invoice.customer?.company_name ?? "";

      const matchesSearch =
        search === "" ||
        invoice.invoice_number
          .toLowerCase()
          .includes(search) ||
        invoice.title
          .toLowerCase()
          .includes(search) ||
        customerName
          .toLowerCase()
          .includes(search) ||
        companyName
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        displayStatus === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading invoices...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-4 text-4xl font-bold">
              Invoices
            </h1>

            <p className="mt-2 text-slate-400">
              Manage your invoices and payments.
            </p>
          </div>

          <Link
            href="/dashboard/invoices/new"
            className="rounded-lg bg-blue-600 px-5 py-3 text-center text-sm font-semibold transition hover:bg-blue-500"
          >
            + New Invoice
          </Link>

        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Search and filters */}
        {invoices.length > 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5">

            <div className="flex flex-col gap-4 md:flex-row">

              {/* Search */}
              <div className="flex-1">
                <label
                  htmlFor="invoice-search"
                  className="mb-2 block text-sm font-medium text-slate-400"
                >
                  Search invoices
                </label>

                <input
                  id="invoice-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Invoice number, customer or title..."
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

            </div>

            {/* Status filters */}
            <div className="mt-5 flex flex-wrap gap-2">

              {[
                {
                  value: "all",
                  label: "All",
                },
                {
                  value: "draft",
                  label: "Draft",
                },
                {
                  value: "sent",
                  label: "Sent",
                },
                {
                  value: "overdue",
                  label: "Overdue",
                },
                {
                  value: "paid",
                  label: "Paid",
                },
                {
                  value: "cancelled",
                  label: "Cancelled",
                },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      filter.value
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    statusFilter ===
                    filter.value
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}

            </div>

            <p className="mt-4 text-xs text-slate-500">
              Showing{" "}
              {filteredInvoices.length} of{" "}
              {invoices.length} invoice
              {invoices.length === 1
                ? ""
                : "s"}
            </p>

          </div>
        )}

        {/* No invoices */}
        {invoices.length === 0 ? (

          <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-12 text-center">

            <h2 className="text-xl font-semibold">
              No invoices yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Create your first invoice or
              turn an accepted quote into an
              invoice.
            </p>

            <Link
              href="/dashboard/invoices/new"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Create your first invoice
            </Link>

          </div>

        ) : (

          /* Invoice table */
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px]">

                <thead className="border-b border-white/10 bg-white/[0.02]">

                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">

                    <th className="px-6 py-4">
                      Invoice
                    </th>

                    <th className="px-6 py-4">
                      Customer
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4">
                      Due
                    </th>

                    <th className="px-6 py-4 text-right">
                      Total
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-white/10">

                  {filteredInvoices.length === 0 ? (

                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center"
                      >
                        <p className="font-medium text-slate-300">
                          No invoices found
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Try a different search
                          term or status filter.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter(
                              "all"
                            );
                          }}
                          className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500"
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>

                  ) : (

                    filteredInvoices.map(
                      (invoice) => {

                        const displayStatus =
                          getDisplayStatus(
                            invoice.status,
                            invoice.due_date
                          );

                        return (
                          <tr
                            key={invoice.id}
                            className="transition hover:bg-white/[0.02]"
                          >

                            {/* Invoice */}
                            <td className="px-6 py-5">

                              <Link
                                href={`/dashboard/invoices/${invoice.id}`}
                                className="font-semibold text-blue-400 hover:text-blue-300"
                              >
                                {
                                  invoice.invoice_number
                                }
                              </Link>

                              <p className="mt-1 text-sm text-slate-400">
                                {
                                  invoice.title
                                }
                              </p>

                            </td>

                            {/* Customer */}
                            <td className="px-6 py-5">

                              {invoice.customer ? (
                                <>
                                  <p className="font-medium">
                                    {
                                      invoice
                                        .customer
                                        .first_name
                                    }{" "}
                                    {
                                      invoice
                                        .customer
                                        .last_name ??
                                      ""
                                    }
                                  </p>

                                  {invoice
                                    .customer
                                    .company_name && (
                                    <p className="mt-1 text-sm text-slate-500">
                                      {
                                        invoice
                                          .customer
                                          .company_name
                                      }
                                    </p>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-500">
                                  Customer unavailable
                                </span>
                              )}

                            </td>

                            {/* Status */}
                            <td className="px-6 py-5">

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                                  displayStatus
                                )}`}
                              >
                                {
                                  getStatusLabel(
                                    displayStatus
                                  )
                                }
                              </span>

                            </td>

                            {/* Due date */}
                            <td className="px-6 py-5 text-sm text-slate-400">

                              {invoice.due_date
                                ? new Date(
                                    `${invoice.due_date}T00:00:00`
                                  ).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "—"}

                            </td>

                            {/* Total */}
                            <td className="px-6 py-5 text-right font-semibold">
                              £
                              {Number(
                                invoice.total
                              ).toFixed(2)}
                            </td>

                          </tr>
                        );
                      }
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>
    </main>
  );
}