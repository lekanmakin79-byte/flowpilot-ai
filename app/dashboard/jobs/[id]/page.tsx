"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

type Job = {
  id: string;
  business_id: string;
  customer_id: string;
  title: string;
  description: string | null;
  status:
    | "draft"
    | "scheduled"
    | "in_progress"
    | "completed"
    | "cancelled";
  scheduled_date: string | null;
  address: string | null;
  estimated_value: number | null;
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

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();

  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Job["status"]>("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [address, setAddress] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadJob() {
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

      const { data: jobData, error: jobError } =
        await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .eq("business_id", business.id)
          .maybeSingle();

      if (jobError) {
        console.error(jobError);
        setError("Unable to load this job.");
        setLoading(false);
        return;
      }

      if (!jobData) {
        setError("Job not found.");
        setLoading(false);
        return;
      }

      setJob(jobData);

      setTitle(jobData.title);
      setDescription(jobData.description ?? "");
      setStatus(jobData.status);
      setScheduledDate(jobData.scheduled_date ?? "");
      setAddress(jobData.address ?? "");
      setEstimatedValue(
        jobData.estimated_value !== null
          ? String(jobData.estimated_value)
          : ""
      );
      setNotes(jobData.notes ?? "");

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select(
            "id, first_name, last_name, company_name, email, phone"
          )
          .eq("id", jobData.customer_id)
          .eq("business_id", business.id)
          .maybeSingle();

      if (customerError) {
        console.error(customerError);
      } else {
        setCustomer(customerData);
      }

      setLoading(false);
    }

    if (jobId) {
      loadJob();
    }
  }, [jobId, router]);

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Job title is required.");
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
      setError("Estimated value must be a valid number.");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("jobs")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        status,
        scheduled_date: scheduledDate || null,
        address: address.trim() || null,
        estimated_value: parsedValue,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setJob(data);
    setEditing(false);
    setSaving(false);
  }

  async function updateStatus(
    newStatus: Job["status"]
  ) {
    setError("");

    const { data, error: updateError } = await supabase
      .from("jobs")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      setError("Unable to update job status.");
      return;
    }

    setJob(data);
    setStatus(data.status);
  }

  function getStatusLabel(statusValue: Job["status"]) {
    switch (statusValue) {
      case "in_progress":
        return "In progress";
      case "scheduled":
        return "Scheduled";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "draft":
        return "Draft";
      default:
        return statusValue;
    }
  }

  function getStatusClasses(statusValue: Job["status"]) {
    switch (statusValue) {
      case "completed":
        return "bg-green-500/10 text-green-300";
      case "in_progress":
        return "bg-blue-500/10 text-blue-300";
      case "scheduled":
        return "bg-yellow-500/10 text-yellow-300";
      case "cancelled":
        return "bg-red-500/10 text-red-300";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading job...
        </p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard/jobs"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to jobs
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-8">
            <h1 className="text-xl font-semibold">
              Job not found
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/dashboard/jobs"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to jobs
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold">
                {job.title}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
                  job.status
                )}`}
              >
                {getStatusLabel(job.status)}
              </span>
            </div>

            {customer && (
              <p className="mt-3 text-slate-400">
                Customer:{" "}
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {customer.first_name}{" "}
                  {customer.last_name ?? ""}
                </Link>

                {customer.company_name
                  ? ` · ${customer.company_name}`
                  : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Edit job
              </button>
            )}

            {job.status === "scheduled" && (
              <button
                type="button"
                onClick={() =>
                  updateStatus("in_progress")
                }
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
              >
                Start job
              </button>
            )}

            {job.status === "in_progress" && (
              <button
                type="button"
                onClick={() =>
                  updateStatus("completed")
                }
                className="rounded-lg border border-green-500/30 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-500/20"
              >
                Mark completed
              </button>
            )}

            {(job.status === "draft" ||
              job.status === "scheduled") && (
              <button
                type="button"
                onClick={() =>
                  updateStatus("cancelled")
                }
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Cancel job
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {editing ? (
          <form
            onSubmit={handleSave}
            className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8"
          >
            <h2 className="text-xl font-semibold">
              Edit job
            </h2>

            <div className="mt-6 grid gap-6">

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
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
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
                      setStatus(
                        event.target.value as Job["status"]
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
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
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
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
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
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
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-white/10 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold">
                Job details
              </h2>

              <div className="mt-5 space-y-5">

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Description
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-slate-300">
                    {job.description ||
                      "No description provided."}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Scheduled date
                  </p>

                  <p className="mt-1 text-slate-200">
                    {job.scheduled_date
                      ? new Date(
                          `${job.scheduled_date}T00:00:00`
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Not scheduled"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Job address
                  </p>

                  <p className="mt-1 text-slate-200">
                    {job.address ||
                      "No address provided."}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Estimated value
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {job.estimated_value !== null
                      ? `£${Number(
                          job.estimated_value
                        ).toFixed(2)}`
                      : "Not provided"}
                  </p>
                </div>

              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold">
                Customer
              </h2>

              {customer ? (
                <div className="mt-5 space-y-4">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Name
                    </p>

                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="mt-1 block text-lg font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {customer.first_name}{" "}
                      {customer.last_name ?? ""}
                    </Link>
                  </div>

                  {customer.company_name && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Company
                      </p>

                      <p className="mt-1 text-slate-200">
                        {customer.company_name}
                      </p>
                    </div>
                  )}

                  {customer.email && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Email
                      </p>

                      <p className="mt-1 text-slate-200">
                        {customer.email}
                      </p>
                    </div>
                  )}

                  {customer.phone && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Phone
                      </p>

                      <p className="mt-1 text-slate-200">
                        {customer.phone}
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                  >
                    View customer
                  </Link>

                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-400">
                  Customer information unavailable.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 md:col-span-2">
              <h2 className="text-lg font-semibold">
                Notes
              </h2>

              <p className="mt-5 whitespace-pre-wrap text-slate-300">
                {job.notes || "No notes added."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 md:col-span-2">
              <h2 className="text-lg font-semibold">
                Job timeline
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Created
                  </p>

                  <p className="mt-1 text-slate-200">
                    {new Date(
                      job.created_at
                    ).toLocaleString("en-GB")}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Last updated
                  </p>

                  <p className="mt-1 text-slate-200">
                    {new Date(
                      job.updated_at
                    ).toLocaleString("en-GB")}
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}