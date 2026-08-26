"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
};

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
};

type InvoiceItem = {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();

  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [tax, setTax] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
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
        console.error("Business loading error:", businessError);

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

      setCustomerId(invoiceData.customer_id);
      setInvoiceNumber(invoiceData.invoice_number);
      setTitle(invoiceData.title);
      setDescription(invoiceData.description ?? "");
      setTax(String(invoiceData.tax ?? 0));
      setDueDate(invoiceData.due_date ?? "");
      setNotes(invoiceData.notes ?? "");

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id, first_name, last_name, company_name"
        )
        .eq("business_id", business.id)
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

        setLoading(false);
        return;
      }

      setCustomers(customerData ?? []);

      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("invoice_items")
        .select(
          "id, invoice_id, description, quantity, unit_price, amount"
        )
        .eq("invoice_id", invoiceId)
        .order("created_at", {
          ascending: true,
        });

      if (itemError) {
        console.error(
          "Invoice items loading error:",
          itemError
        );

        setError(
          itemError.message ||
            "Unable to load invoice items."
        );

        setLoading(false);
        return;
      }

      setItems(
        (itemData ?? []).map((item) => ({
          id: item.id,
          invoice_id: item.invoice_id,
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          amount:
            Number(item.quantity || 0) *
            Number(item.unit_price || 0),
        }))
      );

      setLoading(false);
    }

    if (invoiceId) {
      loadData();
    }
  }, [invoiceId, router]);

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        amount: 0,
      },
    ]);
  }

  function updateItem(
    index: number,
    field: keyof InvoiceItem,
    value: string
  ) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "description") {
          return {
            ...item,
            description: value,
          };
        }

        if (field === "quantity") {
          const quantity = Number(value) || 0;

          return {
            ...item,
            quantity,
            amount:
              quantity * Number(item.unit_price || 0),
          };
        }

        if (field === "unit_price") {
          const unitPrice = Number(value) || 0;

          return {
            ...item,
            unit_price: unitPrice,
            amount:
              Number(item.quantity || 0) * unitPrice,
          };
        }

        return item;
      })
    );
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  const calculatedSubtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) *
        Number(item.unit_price || 0),
    0
  );

  const taxNumber = Number(tax || 0);

  const calculatedTotal =
    calculatedSubtotal + taxNumber;

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!invoice) {
      return;
    }

    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!invoiceNumber.trim()) {
      setError("Please enter an invoice number.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter an invoice title.");
      return;
    }

    if (taxNumber < 0) {
      setError("Tax cannot be negative.");
      return;
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      if (!item.description.trim()) {
        setError(
          `Please enter a description for line item ${
            index + 1
          }.`
        );
        return;
      }

      if (Number(item.quantity) <= 0) {
        setError(
          `Quantity for line item ${
            index + 1
          } must be greater than zero.`
        );
        return;
      }

      if (Number(item.unit_price) < 0) {
        setError(
          `Unit price for line item ${
            index + 1
          } cannot be negative.`
        );
        return;
      }
    }

    setSaving(true);

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
      setError(
        "Unable to identify your business."
      );

      setSaving(false);
      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("invoices")
      .update({
        customer_id: customerId,
        invoice_number:
          invoiceNumber.trim(),
        title: title.trim(),
        description:
          description.trim() || null,
        subtotal: calculatedSubtotal,
        tax: taxNumber,
        total: calculatedTotal,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      })
      .eq("id", invoice.id)
      .eq("business_id", business.id);

    if (updateError) {
      console.error(
        "Invoice update error:",
        updateError
      );

      setError(
        updateError.message ||
          "Unable to update invoice."
      );

      setSaving(false);
      return;
    }

    /*
     * Replace the invoice's line items with the
     * current items from the edit form.
     *
     * RLS ensures that only items belonging to
     * the user's own business can be changed.
     */

    const {
      error: deleteItemsError,
    } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoice.id);

    if (deleteItemsError) {
      console.error(
        "Invoice items deletion error:",
        deleteItemsError
      );

      setError(
        deleteItemsError.message ||
          "Unable to update invoice items."
      );

      setSaving(false);
      return;
    }

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount:
          Number(item.quantity) *
          Number(item.unit_price),
      }));

      const {
        error: insertItemsError,
      } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (insertItemsError) {
        console.error(
          "Invoice items insertion error:",
          insertItemsError
        );

        setError(
          insertItemsError.message ||
            "Unable to save invoice items."
        );

        setSaving(false);
        return;
      }
    }

    router.push(
      `/dashboard/invoices/${invoice.id}`
    );

    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          Loading invoice...
        </div>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
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
                "Invoice could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/dashboard/invoices/${invoice.id}`}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to invoice
        </Link>

        <div className="mt-6">
          <h1 className="text-4xl font-bold">
            Edit Invoice
          </h1>

          <p className="mt-2 text-slate-400">
            Update {invoice.invoice_number}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          {/* Invoice information */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Invoice information
            </h2>

            <div className="mt-6 grid gap-5">
              <div>
                <label
                  htmlFor="invoiceNumber"
                  className="block text-sm font-medium text-slate-300"
                >
                  Invoice number
                </label>

                <input
                  id="invoiceNumber"
                  type="text"
                  value={invoiceNumber}
                  onChange={(event) =>
                    setInvoiceNumber(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="customer"
                  className="block text-sm font-medium text-slate-300"
                >
                  Customer
                </label>

                <select
                  id="customer"
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.first_name}{" "}
                        {customer.last_name ?? ""}
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
                  htmlFor="title"
                  className="block text-sm font-medium text-slate-300"
                >
                  Invoice title
                </label>

                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-300"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice items */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">
                  Invoice items
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Edit the services, quantities and prices
                  on this invoice.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
              >
                + Add item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-sm text-slate-400">
                  No invoice items yet.
                </p>

                <button
                  type="button"
                  onClick={addItem}
                  className="mt-4 text-sm font-semibold text-blue-400 hover:text-blue-300"
                >
                  Add your first item →
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {items.map((item, index) => (
                  <div
                    key={
                      item.id ??
                      `new-item-${index}`
                    }
                    className="rounded-xl border border-white/10 bg-slate-950 p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-300">
                        Item {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(index)
                        }
                        className="text-sm font-medium text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-12">
                      <div className="lg:col-span-5">
                        <label
                          htmlFor={`item-description-${index}`}
                          className="block text-sm font-medium text-slate-300"
                        >
                          Description
                        </label>

                        <input
                          id={`item-description-${index}`}
                          type="text"
                          value={item.description}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Labour"
                          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          htmlFor={`item-quantity-${index}`}
                          className="block text-sm font-medium text-slate-300"
                        >
                          Quantity
                        </label>

                        <input
                          id={`item-quantity-${index}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "quantity",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          htmlFor={`item-price-${index}`}
                          className="block text-sm font-medium text-slate-300"
                        >
                          Unit price
                        </label>

                        <div className="relative mt-2">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                            £
                          </span>

                          <input
                            id={`item-price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "unit_price",
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 pl-9 text-white outline-none transition focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-slate-300">
                          Amount
                        </label>

                        <div className="mt-2 flex min-h-[48px] items-center rounded-lg border border-white/10 bg-slate-900 px-4">
                          <span className="font-semibold">
                            £
                            {(
                              Number(
                                item.quantity || 0
                              ) *
                              Number(
                                item.unit_price || 0
                              )
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Subtotal
                  </span>

                  <span className="text-xl font-bold">
                    £
                    {calculatedSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tax and total */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Amounts
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tax"
                  className="block text-sm font-medium text-slate-300"
                >
                  Tax
                </label>

                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    £
                  </span>

                  <input
                    id="tax"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(event) =>
                      setTax(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 pl-9 text-white outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-slate-950 p-5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Subtotal
                  </span>

                  <span>
                    £
                    {calculatedSubtotal.toFixed(
                      2
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Tax
                  </span>

                  <span>
                    £
                    {taxNumber.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      Total
                    </span>

                    <span className="text-3xl font-bold">
                      £
                      {calculatedTotal.toFixed(
                        2
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment details */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Payment details
            </h2>

            <div className="mt-6">
              <label
                htmlFor="dueDate"
                className="block text-sm font-medium text-slate-300"
              >
                Due date
              </label>

              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>
          </div>

          {/* Notes */}

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Notes
            </h2>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={5}
              placeholder="Add payment instructions or other notes..."
              className="mt-5 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* Actions */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/dashboard/invoices/${invoice.id}`}
              className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving changes..."
                : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}