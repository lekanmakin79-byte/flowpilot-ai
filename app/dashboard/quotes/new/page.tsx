"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


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

export default function NewQuotePage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [jobId, setJobId] = useState("");

  const [quoteNumber, setQuoteNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

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
        console.error(customerError);
        setError("Unable to load customers.");
        setLoading(false);
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
        .eq("business_id", business.id)
        .order("created_at", {
          ascending: false,
        });

      if (jobError) {
        console.error(jobError);
        setError("Unable to load jobs.");
        setLoading(false);
        return;
      }

      setCustomers(customerData ?? []);
      setJobs(jobData ?? []);

      const nextQuoteNumber =
        `Q-${Date.now().toString().slice(-6)}`;

      setQuoteNumber(nextQuoteNumber);

      setLoading(false);
    }

    loadData();
  }, [router]);

  const filteredJobs = customerId
    ? jobs.filter(
        (job) => job.customer_id === customerId
      )
    : [];

  const subtotalNumber =
    Number(subtotal) || 0;

  const taxNumber =
    Number(tax) || 0;

  const total =
    subtotalNumber + taxNumber;

  function handleCustomerChange(
    value: string
  ) {
    setCustomerId(value);
    setJobId("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a quote title.");
      return;
    }

    if (subtotalNumber < 0) {
      setError("Subtotal cannot be negative.");
      return;
    }

    if (taxNumber < 0) {
      setError("Tax cannot be negative.");
      return;
    }

    setSaving(true);

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

      if (businessError || !business) {
        setError(
          "Unable to find your business."
        );
        setSaving(false);
        return;
      }

      /*
       * Check subscription access BEFORE creating the quote.
       */
     
const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.access_token) {
  setError(
    "Your session has expired. Please log in again."
  );
  setSaving(false);
  return;
}

const subscriptionResponse = await fetch(
  "/api/subscription/check",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      resource: "quote",
    }),
  }
);

const subscriptionResult =
  await subscriptionResponse.json();

if (
  !subscriptionResponse.ok ||
  !subscriptionResult.allowed
) {
  setError(
    subscriptionResult.error ||
      "Free plan limit reached. Please upgrade to Professional."
  );
  setSaving(false);
  return;
}
      const {
        data,
        error: insertError,
      } = await supabase
        .from("quotes")
        .insert({
          business_id: business.id,
          customer_id: customerId,
          job_id: jobId || null,
          quote_number: quoteNumber.trim(),
          title: title.trim(),
          description:
            description.trim() || null,
          status: "draft",
          subtotal: subtotalNumber,
          tax: taxNumber,
          total,
          valid_until:
            validUntil || null,
          notes:
            notes.trim() || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error(insertError);
        setError(insertError.message);
        setSaving(false);
        return;
      }

      router.push(
        `/dashboard/quotes/${data.id}`
      );
    } catch (error) {
      console.error(error);

      setError(
        "Unable to create the quote. Please try again."
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading quote form...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/quotes"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to quotes
        </Link>

        <div className="mt-5">
          <h1 className="text-4xl font-bold">
            New Quote
          </h1>

          <p className="mt-2 text-slate-400">
            Create a professional quote for your customer.
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
                  value={customerId}
                  onChange={(event) =>
                    handleCustomerChange(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select a customer
                  </option>

                  {customers.map((customer) => (
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
                  ))}
                </select>

                {customers.length === 0 && (
                  <p className="mt-2 text-sm text-yellow-400">
                    You need to create a customer first.
                  </p>
                )}
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
                  onChange={(event) =>
                    setJobId(event.target.value)
                  }
                  disabled={!customerId}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    No related job
                  </option>

                  {filteredJobs.map((job) => (
                    <option
                      key={job.id}
                      value={job.id}
                    >
                      {job.title}
                      {job.estimated_value !== null
                        ? ` — £${Number(
                            job.estimated_value
                          ).toFixed(2)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Quote information
            </h2>

            <div className="mt-6 grid gap-6">
              <div>
                <label
                  htmlFor="quoteNumber"
                  className="mb-2 block text-sm font-medium"
                >
                  Quote number
                </label>

                <input
                  id="quoteNumber"
                  type="text"
                  value={quoteNumber}
                  onChange={(event) =>
                    setQuoteNumber(event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium"
                >
                  Quote title *
                </label>

                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Electrical installation"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
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
                  placeholder="Describe the work included in this quote..."
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Pricing
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="subtotal"
                  className="mb-2 block text-sm font-medium"
                >
                  Subtotal (£)
                </label>

                <input
                  id="subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={subtotal}
                  onChange={(event) =>
                    setSubtotal(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="tax"
                  className="mb-2 block text-sm font-medium"
                >
                  Tax (£)
                </label>

                <input
                  id="tax"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tax}
                  onChange={(event) =>
                    setTax(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-slate-950 p-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Total
                </span>

                <span className="text-3xl font-bold">
                  £{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Additional information
            </h2>

            <div className="mt-6 grid gap-6">
              <div>
                <label
                  htmlFor="validUntil"
                  className="mb-2 block text-sm font-medium"
                >
                  Valid until
                </label>

                <input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(event) =>
                    setValidUntil(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
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
                  rows={4}
                  placeholder="Payment terms, additional information, etc."
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/quotes"
              className="rounded-lg border border-white/10 px-6 py-3 text-center font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                customers.length === 0
              }
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating quote..."
                : "Create quote"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}