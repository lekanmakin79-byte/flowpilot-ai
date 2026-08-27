"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
};

type Job = {
  id: string;
  title: string;
  customer_id: string;
  estimated_value: number | null;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
};

type SubscriptionAccessResponse = {
  allowed?: boolean;
  remaining?: number | null;
  code?: string;
  error?: string;
};

export default function NewInvoicePage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>(
    []
  );

  const [jobs, setJobs] = useState<Job[]>([]);

  const [businessId, setBusinessId] = useState("");

  const [customerId, setCustomerId] = useState("");

  const [jobId, setJobId] = useState("");

  const [invoiceNumber, setInvoiceNumber] =
    useState("");

  const [title, setTitle] = useState("");

  const [description, setDescription] =
    useState("");

  const [items, setItems] =
    useState<InvoiceItem[]>([
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: "1",
        unit_price: "",
      },
    ]);

  const [tax, setTax] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [limitMessage, setLimitMessage] =
    useState("");

  const [remainingInvoices, setRemainingInvoices] =
    useState<number | null>(null);

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        setError("");
        setLimitMessage("");

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

        setBusinessId(business.id);

        /*
         * Check subscription access before
         * allowing invoice creation.
         *
         * This is only the initial page check.
         * The limit is checked again immediately
         * before the invoice is inserted.
         */
        const accessResponse = await fetch(
          "/api/subscription/check",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              feature: "invoice",
              businessId: business.id,
            }),
          }
        );

        let access: SubscriptionAccessResponse =
          {};

        try {
          access = await accessResponse.json();
        } catch (jsonError) {
          console.error(
            "Subscription access response parsing error:",
            jsonError
          );
        }

        if (
          !accessResponse.ok ||
          !access.allowed
        ) {
          setLimitMessage(
            access.error ||
              "You have reached your invoice limit."
          );

          if (
            access.code ===
            "UNAUTHENTICATED"
          ) {
            router.replace("/login");
            return;
          }
        } else {
          setRemainingInvoices(
            access.remaining ?? null
          );
        }

        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(
            "id, first_name, last_name, company_name"
          )
          .eq(
            "business_id",
            business.id
          )
          .order("first_name", {
            ascending: true,
          });

        if (customerError) {
          console.error(
            "Customer loading error:",
            customerError
          );

          setError(
            customerError.message ||
              "Unable to load customers."
          );

          return;
        }

        const {
          data: jobData,
          error: jobError,
        } = await supabase
          .from("jobs")
          .select(
            "id, title, customer_id, estimated_value"
          )
          .eq(
            "business_id",
            business.id
          )
          .order("created_at", {
            ascending: false,
          });

        if (jobError) {
          console.error(
            "Job loading error:",
            jobError
          );

          setError(
            jobError.message ||
              "Unable to load jobs."
          );

          return;
        }

        setCustomers(
          customerData ?? []
        );

        setJobs(
          jobData ?? []
        );

        /*
         * Generate invoice number.
         *
         * Example:
         * INV-2026-0001
         */
        const year =
          new Date().getFullYear();

        const {
          count,
          error: countError,
        } = await supabase
          .from("invoices")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "business_id",
            business.id
          );

        if (countError) {
          console.error(
            "Invoice count error:",
            countError
          );
        }

        const nextNumber =
          (count ?? 0) + 1;

        setInvoiceNumber(
          `INV-${year}-${String(
            nextNumber
          ).padStart(4, "0")}`
        );
      } catch (loadError) {
        console.error(
          "Invoice form loading error:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load invoice form."
        );
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, [router]);

  const filteredJobs = customerId
    ? jobs.filter(
        (job) =>
          job.customer_id ===
          customerId
      )
    : [];

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => {
        const quantity =
          Number(item.quantity) || 0;

        const unitPrice =
          Number(item.unit_price) || 0;

        return (
          sum +
          quantity * unitPrice
        );
      },
      0
    );
  }, [items]);

  const taxNumber =
    Number(tax) || 0;

  const total =
    subtotal + taxNumber;

  function handleCustomerChange(
    value: string
  ) {
    setCustomerId(value);

    const selectedJobStillMatches =
      jobs.some(
        (job) =>
          job.id === jobId &&
          job.customer_id ===
            value
      );

    if (
      !selectedJobStillMatches
    ) {
      setJobId("");
    }
  }

  function addItem() {
    setItems(
      (currentItems) => [
        ...currentItems,
        {
          id: crypto.randomUUID(),
          description: "",
          quantity: "1",
          unit_price: "",
        },
      ]
    );
  }

  function removeItem(
    id: string
  ) {
    if (items.length === 1) {
      return;
    }

    setItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.id !== id
        )
    );
  }

  function updateItem(
    id: string,
    field: keyof Omit<
      InvoiceItem,
      "id"
    >,
    value: string
  ) {
    setItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        )
    );
  }

  async function checkInvoiceAccess(
    businessIdToCheck: string
  ): Promise<SubscriptionAccessResponse | null> {
    const response = await fetch(
      "/api/subscription/check",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          feature: "invoice",
          businessId:
            businessIdToCheck,
        }),
      }
    );

    let data: SubscriptionAccessResponse =
      {};

    try {
      data = await response.json();
    } catch (jsonError) {
      console.error(
        "Subscription response parsing error:",
        jsonError
      );
    }

    if (
      !response.ok &&
      !data.error
    ) {
      data.error =
        "Unable to verify your subscription access.";
    }

    return data;
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setLimitMessage("");

    if (!customerId) {
      setError(
        "Please select a customer."
      );
      return;
    }

    if (!invoiceNumber.trim()) {
      setError(
        "Please enter an invoice number."
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter an invoice title."
      );
      return;
    }

    if (items.length === 0) {
      setError(
        "Please add at least one invoice item."
      );
      return;
    }

    const hasInvalidItem =
      items.some(
        (item) => {
          const quantity =
            Number(
              item.quantity
            );

          const unitPrice =
            Number(
              item.unit_price
            );

          return (
            !item.description.trim() ||
            !Number.isFinite(
              quantity
            ) ||
            quantity <= 0 ||
            !Number.isFinite(
              unitPrice
            ) ||
            unitPrice < 0
          );
        }
      );

    if (hasInvalidItem) {
      setError(
        "Please complete every invoice item. Quantity must be greater than zero and price cannot be negative."
      );
      return;
    }

    if (
      !Number.isFinite(
        subtotal
      ) ||
      subtotal < 0
    ) {
      setError(
        "Subtotal cannot be negative."
      );
      return;
    }

    if (
      !Number.isFinite(
        taxNumber
      ) ||
      taxNumber < 0
    ) {
      setError(
        "Tax cannot be negative."
      );
      return;
    }

    if (!businessId) {
      setError(
        "Unable to identify your business."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      /*
       * IMPORTANT:
       *
       * Check the subscription limit again
       * immediately before creating the invoice.
       *
       * This prevents a user from opening the
       * page while they have an available invoice
       * and then exceeding the limit before saving.
       */
      const access =
        await checkInvoiceAccess(
          businessId
        );

      if (
        !access ||
        !access.allowed
      ) {
        setLimitMessage(
          access?.error ||
            "You have reached the Free plan invoice limit."
        );

        if (
          access?.code ===
          "UNAUTHENTICATED"
        ) {
          router.replace("/login");
          return;
        }

        setSaving(false);
        return;
      }

      setRemainingInvoices(
        access.remaining ?? null
      );

      /*
       * Create invoice.
       */
      const {
        data: invoice,
        error: insertError,
      } = await supabase
        .from("invoices")
        .insert({
          business_id:
            businessId,
          customer_id:
            customerId,
          job_id:
            jobId || null,
          quote_id:
            null,
          invoice_number:
            invoiceNumber.trim(),
          title:
            title.trim(),
          description:
            description.trim() ||
            null,
          status:
            "draft",
          subtotal,
          tax:
            taxNumber,
          total,
          due_date:
            dueDate ||
            null,
          notes:
            notes.trim() ||
            null,
        })
        .select("id")
        .single();

      if (
        insertError ||
        !invoice
      ) {
        console.error(
          "Invoice creation error:",
          insertError
        );

        setError(
          insertError?.message ||
            "Unable to create invoice."
        );

        setSaving(false);
        return;
      }

      /*
       * Create invoice items.
       */
      const invoiceItems =
        items.map(
          (item) => {
            const quantity =
              Number(
                item.quantity
              );

            const unitPrice =
              Number(
                item.unit_price
              );

            return {
              invoice_id:
                invoice.id,
              description:
                item.description.trim(),
              quantity,
              unit_price:
                unitPrice,
              amount:
                quantity *
                unitPrice,
            };
          }
        );

      const {
        error: itemsError,
      } = await supabase
        .from(
          "invoice_items"
        )
        .insert(
          invoiceItems
        );

      if (itemsError) {
        console.error(
          "Invoice items creation error:",
          itemsError
        );

        /*
         * Remove the invoice if
         * its line items fail.
         *
         * The business_id condition makes
         * the cleanup safer.
         */
        await supabase
          .from("invoices")
          .delete()
          .eq(
            "id",
            invoice.id
          )
          .eq(
            "business_id",
            businessId
          );

        setError(
          itemsError.message ||
            "Unable to save invoice items."
        );

        setSaving(false);
        return;
      }

      /*
       * Invoice and invoice items were
       * created successfully.
       */
      router.push(
        `/dashboard/invoices/${invoice.id}`
      );
    } catch (submitError) {
      console.error(
        "Invoice submission error:",
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create invoice."
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400">
          Loading invoice form...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/invoices"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to invoices
        </Link>

        <div className="mt-5">
          <h1 className="text-4xl font-bold">
            New Invoice
          </h1>

          <p className="mt-2 text-slate-400">
            Create a new invoice
            for your customer.
          </p>
        </div>

        {limitMessage && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="font-semibold text-amber-300">
              Invoice limit reached
            </h2>

            <p className="mt-2 text-sm text-amber-200/80">
              {limitMessage}
            </p>

            <Link
              href="/dashboard/settings/billing"
              className="mt-4 inline-flex rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Upgrade to Professional
            </Link>
          </div>
        )}

        {remainingInvoices !==
          null &&
          !limitMessage && (
            <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
              You have{" "}
              <span className="font-semibold">
                {remainingInvoices}
              </span>{" "}
              invoice
              {remainingInvoices ===
              1
                ? ""
                : "s"}{" "}
              remaining on the
              Free plan.
            </div>
          )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          {/* Customer & Job */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Customer & Job
            </h2>

            <div className="mt-6 grid gap-6">
              <div>
                <label
                  htmlFor="customer"
                  className="mb-2 block text-sm font-medium"
                >
                  Customer *
                </label>

                <select
                  id="customer"
                  value={
                    customerId
                  }
                  onChange={(
                    event
                  ) =>
                    handleCustomerChange(
                      event
                        .target
                        .value
                    )
                  }
                  required
                  disabled={
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    Select a customer
                  </option>

                  {customers.map(
                    (
                      customer
                    ) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {
                          customer.first_name
                        }{" "}
                        {
                          customer.last_name ??
                          ""
                        }
                        {customer.company_name
                          ? ` — ${customer.company_name}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="job"
                  className="mb-2 block text-sm font-medium"
                >
                  Related job
                </label>

                <select
                  id="job"
                  value={jobId}
                  onChange={(
                    event
                  ) =>
                    setJobId(
                      event
                        .target
                        .value
                    )
                  }
                  disabled={
                    !customerId ||
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    No related job
                  </option>

                  {filteredJobs.map(
                    (job) => (
                      <option
                        key={
                          job.id
                        }
                        value={
                          job.id
                        }
                      >
                        {
                          job.title
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Invoice Information */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Invoice information
            </h2>

            <div className="mt-6 grid gap-6">
              <div>
                <label
                  htmlFor="invoiceNumber"
                  className="mb-2 block text-sm font-medium"
                >
                  Invoice number
                </label>

                <input
                  id="invoiceNumber"
                  type="text"
                  value={
                    invoiceNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setInvoiceNumber(
                      event
                        .target
                        .value
                    )
                  }
                  required
                  disabled={
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium"
                >
                  Invoice title *
                </label>

                <input
                  id="title"
                  type="text"
                  placeholder="Property maintenance work"
                  value={title}
                  onChange={(
                    event
                  ) =>
                    setTitle(
                      event
                        .target
                        .value
                    )
                  }
                  required
                  disabled={
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  rows={4}
                  placeholder="Describe the overall work or services..."
                  value={
                    description
                  }
                  onChange={(
                    event
                  ) =>
                    setDescription(
                      event
                        .target
                        .value
                    )
                  }
                  disabled={
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Invoice Items */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">
                  Invoice items
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Add the services
                  or products
                  included in
                  this invoice.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  addItem
                }
                disabled={
                  Boolean(
                    limitMessage
                  )
                }
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add item
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {items.map(
                (
                  item,
                  index
                ) => {
                  const quantity =
                    Number(
                      item.quantity
                    ) || 0;

                  const unitPrice =
                    Number(
                      item.unit_price
                    ) || 0;

                  const amount =
                    quantity *
                    unitPrice;

                  return (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-xl border border-white/10 bg-slate-950 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-300">
                          Item{" "}
                          {index +
                            1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              item.id
                            )
                          }
                          disabled={
                            items.length ===
                              1 ||
                            Boolean(
                              limitMessage
                            )
                          }
                          className="text-sm font-medium text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[1fr_120px_160px_140px]">
                        <div>
                          <label
                            htmlFor={`description-${item.id}`}
                            className="mb-2 block text-xs font-medium text-slate-400"
                          >
                            Description
                          </label>

                          <input
                            id={`description-${item.id}`}
                            type="text"
                            placeholder="Labour, materials, call-out..."
                            value={
                              item.description
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                item.id,
                                "description",
                                event
                                  .target
                                  .value
                              )
                            }
                            disabled={
                              Boolean(
                                limitMessage
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`quantity-${item.id}`}
                            className="mb-2 block text-xs font-medium text-slate-400"
                          >
                            Quantity
                          </label>

                          <input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                item.id,
                                "quantity",
                                event
                                  .target
                                  .value
                              )
                            }
                            disabled={
                              Boolean(
                                limitMessage
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`price-${item.id}`}
                            className="mb-2 block text-xs font-medium text-slate-400"
                          >
                            Unit price (£)
                          </label>

                          <input
                            id={`price-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.unit_price
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                item.id,
                                "unit_price",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="0.00"
                            disabled={
                              Boolean(
                                limitMessage
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-400">
                            Amount
                          </label>

                          <div className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 font-semibold">
                            £
                            {amount.toFixed(
                              2
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Pricing Summary */}

            <div className="mt-8 ml-auto max-w-sm space-y-4 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Subtotal
                </span>

                <span className="font-medium">
                  £
                  {subtotal.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="tax"
                  className="text-sm text-slate-400"
                >
                  Tax (£)
                </label>

                <input
                  id="tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(
                    event
                  ) =>
                    setTax(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="0.00"
                  disabled={
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-32 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-right outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-lg font-semibold">
                  Total
                </span>

                <span className="text-3xl font-bold">
                  £
                  {total.toFixed(
                    2
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Information */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Additional information
            </h2>

            <div className="mt-6 grid gap-6">
              <div>
                <label
                  htmlFor="dueDate"
                  className="mb-2 block text-sm font-medium"
                >
                  Due date
                </label>

                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(
                    event
                  ) =>
                    setDueDate(
                      event
                        .target
                        .value
                    )
                  }
                  disabled={
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  rows={5}
                  placeholder="Payment instructions or additional notes..."
                  value={notes}
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      event
                        .target
                        .value
                    )
                  }
                  disabled={
                    Boolean(
                      limitMessage
                    )
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Actions */}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/invoices"
              className="rounded-lg border border-white/10 px-6 py-3 text-center font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                Boolean(
                  limitMessage
                )
              }
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating invoice..."
                : "Create invoice"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
