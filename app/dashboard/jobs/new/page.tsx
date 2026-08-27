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

type Business = {
  id: string;
};

export default function NewJobPage() {
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [address, setAddress] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFormData() {
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
        data: businessData,
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

      if (!businessData) {
        router.replace("/onboarding");
        return;
      }

      setBusiness(businessData);

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id, first_name, last_name, company_name"
        )
        .eq("business_id", businessData.id)
        .eq("status", "active")
        .order("first_name", {
          ascending: true,
        });

      if (customerError) {
        console.error(customerError);
        setError("Unable to load customers.");
        setLoading(false);
        return;
      }

      setCustomers(customerData ?? []);
      setLoading(false);
    }

    loadFormData();
  }, [router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!business) {
      setError("Business information is missing.");
      return;
    }

    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    const parsedValue =
      estimatedValue.trim() !== ""
        ? Number(estimatedValue)
        : null;

    if (
      parsedValue !== null &&
      (Number.isNaN(parsedValue) || parsedValue < 0)
    ) {
      setError(
        "Estimated value must be a valid positive number."
      );
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

      /*
       * Check subscription access BEFORE creating the job.
       */
      const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.access_token) {
  setError("Your session has expired. Please log in again.");
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
      resource: "job",
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
        .from("jobs")
        .insert({
          business_id: business.id,
          customer_id: customerId,
          title: title.trim(),
          description:
            description.trim() || null,
          status,
          scheduled_date:
            scheduledDate || null,
          address:
            address.trim() || null,
          estimated_value: parsedValue,
          notes:
            notes.trim() || null,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(insertError);
        setError(insertError.message);
        setSaving(false);
        return;
      }

      router.push(
        `/dashboard/jobs/${data.id}`
      );
    } catch (error) {
      console.error(error);

      setError(
        "Unable to create the job. Please try again."
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading job form...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/jobs"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to jobs
        </Link>

        <div className="mt-4">
          <h1 className="text-4xl font-bold">
            New Job
          </h1>

          <p className="mt-2 text-slate-400">
            Create a job and connect it to one of your
            customers.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {customers.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6">
            <h2 className="text-lg font-semibold text-yellow-200">
              You need a customer first
            </h2>

            <p className="mt-2 text-sm text-yellow-100/70">
              Create an active customer before creating a
              job.
            </p>

            <Link
              href="/dashboard/customers"
              className="mt-5 inline-flex rounded-lg bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-400"
            >
              Manage customers
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8"
          >
            <div className="grid gap-6">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium"
                >
                  Job title *
                </label>

                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="e.g. Bathroom plumbing repair"
                  required
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

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
                    setCustomerId(event.target.value)
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
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Describe the work that needs to be done..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-medium"
                  >
                    Status
                  </label>

                  <select
                    id="status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="draft">
                      Draft
                    </option>

                    <option value="scheduled">
                      Scheduled
                    </option>

                    <option value="in_progress">
                      In progress
                    </option>

                    <option value="completed">
                      Completed
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="scheduledDate"
                    className="mb-2 block text-sm font-medium"
                  >
                    Scheduled date
                  </label>

                  <input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(event) =>
                      setScheduledDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="mb-2 block text-sm font-medium"
                >
                  Job address
                </label>

                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(event) =>
                    setAddress(event.target.value)
                  }
                  placeholder="Where will the work take place?"
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="estimatedValue"
                  className="mb-2 block text-sm font-medium"
                >
                  Estimated value
                </label>

                <input
                  id="estimatedValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedValue}
                  onChange={(event) =>
                    setEstimatedValue(event.target.value)
                  }
                  placeholder="e.g. 850.00"
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
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
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Additional notes about this job..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Creating job..."
                  : "Create job"}
              </button>

              <Link
                href="/dashboard/jobs"
                className="rounded-lg border border-white/10 px-6 py-3 text-center font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}