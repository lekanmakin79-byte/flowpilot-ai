"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Invoice = {
  id: string;
  business_id: string;
  customer_id: string;
  job_id: string | null;
  quote_id: string | null;
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
  updated_at: string;
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

type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();

  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      const {
        data: business,
        error: businessError,
      } = await supabase
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
        .select("*")
        .eq("id", invoiceId)
        .eq("business_id", business.id)
        .maybeSingle();

      if (invoiceError) {
        console.error(
          "Invoice loading error:",
          invoiceError
        );

        setError(
          invoiceError.message ||
            "Unable to load invoice."
        );

        setLoading(false);
        return;
      }

      if (!invoiceData) {
        setError("Invoice not found.");
        setLoading(false);
        return;
      }

      let currentInvoice: Invoice = invoiceData;

      /*
       * Automatically change a sent invoice to overdue
       * when its due date has passed.
       */
      const today = new Date()
        .toISOString()
        .split("T")[0];

      if (
        invoiceData.status === "sent" &&
        invoiceData.due_date &&
        invoiceData.due_date < today
      ) {
        const {
          data: overdueInvoice,
          error: overdueError,
        } = await supabase
          .from("invoices")
          .update({
            status: "overdue",
          })
          .eq("id", invoiceData.id)
          .eq("business_id", business.id)
          .select("*")
          .single();

        if (overdueError) {
          console.error(
            "Overdue status update error:",
            overdueError
          );
        } else if (overdueInvoice) {
          currentInvoice = overdueInvoice;
        }
      }

      setInvoice(currentInvoice);

      /*
       * Load customer.
       */
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
        .eq(
          "id",
          currentInvoice.customer_id
        )
        .eq(
          "business_id",
          business.id
        )
        .maybeSingle();

      if (customerError) {
        console.error(
          "Customer loading error:",
          customerError
        );
      }

      setCustomer(customerData);

      /*
       * Load related job.
       */
      if (currentInvoice.job_id) {
        const {
          data: jobData,
          error: jobError,
        } = await supabase
          .from("jobs")
          .select(
            "id, title, status"
          )
          .eq(
            "id",
            currentInvoice.job_id
          )
          .eq(
            "business_id",
            business.id
          )
          .maybeSingle();

        if (jobError) {
          console.error(
            "Job loading error:",
            jobError
          );
        }

        setJob(jobData);
      }

      /*
       * Load invoice line items.
       */
      const {
        data: itemData,
        error: itemError,
      } = await supabase
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
        .eq(
          "invoice_id",
          currentInvoice.id
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

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

 async function updateStatus(newStatus: string) {
  if (!invoice) {
    return;
  }

  setUpdatingStatus(true);
  setError("");

  const { data: updatedInvoice, error: updateError } =
  await supabase
    .from("invoices")
    .update({
      status: newStatus,
    })
    .eq("id", invoice.id)
    .eq("business_id", invoice.business_id)
    .select("*")
    .single();

  if (updateError) {
    console.error(
      "Invoice status update error:",
      updateError
    );

    setError(
      updateError.message ||
        "Unable to update invoice status."
    );

    setUpdatingStatus(false);
    return;
  }

  setInvoice(updatedInvoice);
  setUpdatingStatus(false);
}

  async function deleteInvoice() {
    if (!invoice) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this invoice? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    const {
      error: deleteError,
    } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id)
      .eq(
        "business_id",
        invoice.business_id
      );

    if (deleteError) {
      console.error(
        "Invoice deletion error:",
        deleteError
      );

      setError(
        deleteError.message ||
          "Unable to delete invoice."
      );

      setDeleting(false);
      return;
    }

    router.replace(
      "/dashboard/invoices"
    );
  }

  function getStatusClasses(
    status: string
  ) {
    switch (status) {
      case "paid":
        return "border-green-500/20 bg-green-500/10 text-green-300";

      case "sent":
        return "border-blue-500/20 bg-blue-500/10 text-blue-300";

      case "overdue":
        return "border-red-500/20 bg-red-500/10 text-red-300";

      case "cancelled":
        return "border-slate-500/20 bg-slate-500/10 text-slate-400";

      default:
        return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
    }
  }

  function getStatusLabel(
    status: string
  ) {
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

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Not set";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatDateTime(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-slate-400">
            Loading invoice...
          </p>
        </div>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">

          <Link
            href="/dashboard/invoices"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to invoices
          </Link>

          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6">

            <h1 className="text-xl font-semibold">
              Invoice unavailable
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error ||
                "Invoice not found."}
            </p>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Header */}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>

            <Link
              href="/dashboard/invoices"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to invoices
            </Link>

            <h1 className="mt-4 text-4xl font-bold">
              {invoice.invoice_number}
            </h1>

            <p className="mt-2 text-slate-400">
              {invoice.title}
            </p>

          </div>

         <div className="flex flex-wrap gap-3">

  <Link
    href={`/dashboard/invoices/${invoice.id}/print`}
    className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
  >
    Print / PDF
  </Link>

  <Link
    href={`/dashboard/invoices/${invoice.id}/edit`}
    className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
  >
    Edit invoice
  </Link>

  {invoice.status === "draft" && (
    <button
      type="button"
      onClick={() => updateStatus("sent")}
      disabled={updatingStatus}
      className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {updatingStatus
        ? "Updating..."
        : "Mark as sent"}
    </button>
  )}

  {(invoice.status === "sent" ||
    invoice.status === "overdue") && (
    <button
      type="button"
      onClick={() => updateStatus("paid")}
      disabled={updatingStatus}
      className="rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {updatingStatus
        ? "Updating..."
        : "Mark as paid"}
    </button>
  )}

  {invoice.status !== "paid" &&
    invoice.status !== "cancelled" && (
      <button
        type="button"
        onClick={() => updateStatus("cancelled")}
        disabled={updatingStatus}
        className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {updatingStatus
          ? "Updating..."
          : "Cancel invoice"}
      </button>
    )}

  <button
    type="button"
    onClick={deleteInvoice}
    disabled={deleting}
    className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {deleting ? "Deleting..." : "Delete"}
  </button>

</div>

        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Main content */}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2">

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-8">

              {/* Invoice heading */}

              <div className="flex flex-col justify-between gap-5 sm:flex-row">

                <div>

                  <p className="text-sm text-slate-500">
                    Invoice
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {invoice.invoice_number}
                  </h2>

                </div>

                <span
                  className={`inline-flex h-fit rounded-full border px-4 py-2 text-sm font-medium ${getStatusClasses(
                    invoice.status
                  )}`}
                >
                  {getStatusLabel(
                    invoice.status
                  )}
                </span>

              </div>

              <div className="my-8 border-t border-white/10" />

              {/* Customer */}

              <div>

                <p className="text-sm text-slate-500">
                  Bill to
                </p>

                {customer ? (
                  <div className="mt-2">

                    <p className="text-lg font-semibold">
                      {customer.first_name}{" "}
                      {customer.last_name ?? ""}
                    </p>

                    {customer.company_name && (
                      <p className="mt-1 text-slate-400">
                        {customer.company_name}
                      </p>
                    )}

                    {customer.email && (
                      <p className="mt-1 text-sm text-slate-500">
                        {customer.email}
                      </p>
                    )}

                    {customer.phone && (
                      <p className="mt-1 text-sm text-slate-500">
                        {customer.phone}
                      </p>
                    )}

                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
                    >
                      View customer →
                    </Link>

                  </div>
                ) : (
                  <p className="mt-2 text-slate-500">
                    Customer information unavailable
                  </p>
                )}

              </div>

              {/* Invoice information */}

              <div className="mt-8">

                <h3 className="text-lg font-semibold">
                  {invoice.title}
                </h3>

                {invoice.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                    {invoice.description}
                  </p>
                )}

              </div>

              {/* Related job */}

              {job && (
                <div className="mt-8 rounded-xl border border-white/10 bg-slate-950 p-5">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Related job
                  </p>

                  <p className="mt-2 font-semibold">
                    {job.title}
                  </p>

                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {job.status}
                  </p>

                </div>
              )}

              {/* Invoice items */}

              {items.length > 0 && (
                <>
                  <div className="my-8 border-t border-white/10" />

                  <div>

                    <h3 className="text-lg font-semibold">
                      Invoice items
                    </h3>

                    <div className="mt-5 space-y-4">

                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-slate-950 p-5"
                        >

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div>

                              <p className="font-medium">
                                {item.description}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                Qty:{" "}
                                {Number(
                                  item.quantity
                                )}
                              </p>

                            </div>

                            <div className="text-left sm:text-right">

                              <p className="text-sm text-slate-400">
                                £
                                {Number(
                                  item.unit_price
                                ).toFixed(2)}
                              </p>

                              <p className="mt-1 font-semibold">
                                £
                                {Number(
                                  item.amount
                                ).toFixed(2)}
                              </p>

                            </div>

                          </div>

                        </div>
                      ))}

                    </div>

                  </div>
                </>
              )}

              {/* Totals */}

              <div className="my-8 border-t border-white/10" />

              <div className="space-y-4">

                <div className="flex justify-between text-sm">

                  <span className="text-slate-400">
                    Subtotal
                  </span>

                  <span>
                    £
                    {Number(
                      invoice.subtotal
                    ).toFixed(2)}
                  </span>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-slate-400">
                    Tax
                  </span>

                  <span>
                    £
                    {Number(
                      invoice.tax
                    ).toFixed(2)}
                  </span>

                </div>

                <div className="border-t border-white/10 pt-4">

                  <div className="flex justify-between">

                    <span className="text-lg font-semibold">
                      Total
                    </span>

                    <span className="text-3xl font-bold">
                      £
                      {Number(
                        invoice.total
                      ).toFixed(2)}
                    </span>

                  </div>

                </div>

              </div>

              {/* Notes */}

              {invoice.notes && (
                <div className="mt-8 rounded-xl border border-white/10 bg-slate-950 p-5">

                  <p className="text-sm font-semibold">
                    Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                    {invoice.notes}
                  </p>

                </div>
              )}

            </div>

          </div>

          {/* Sidebar */}

          <div className="space-y-6">

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">

              <h2 className="font-semibold">
                Invoice details
              </h2>

              <div className="mt-5 space-y-5">

                <div>

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Status
                  </p>

                  <p className="mt-1">
                    {getStatusLabel(
                      invoice.status
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Due date
                  </p>

                  <p className="mt-1">
                    {formatDate(
                      invoice.due_date
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Created
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {formatDateTime(
                      invoice.created_at
                    )}
                  </p>

                </div>

              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">

              <h2 className="font-semibold">
                Customer
              </h2>

              {customer ? (
                <div className="mt-5">

                  <p className="font-medium">
                    {customer.first_name}{" "}
                    {customer.last_name ?? ""}
                  </p>

                  {customer.company_name && (
                    <p className="mt-1 text-sm text-slate-400">
                      {customer.company_name}
                    </p>
                  )}

                  {customer.email && (
                    <p className="mt-2 text-sm text-slate-500">
                      {customer.email}
                    </p>
                  )}

                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Customer unavailable
                </p>
              )}

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}