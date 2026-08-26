"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
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
  customer_id: string;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
};

type JobWithCustomer = Job & {
  customer: Customer | null;
};

export default function JobsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<JobWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJobs() {
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

      const { data, error: jobsError } = await supabase
        .from("jobs")
        .select(
          `
          id,
          title,
          description,
          status,
          scheduled_date,
          address,
          estimated_value,
          notes,
          created_at,
          customer_id,
          customers (
            id,
            first_name,
            last_name,
            company_name
          )
        `
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (jobsError) {
        console.error(jobsError);
        setError("Unable to load jobs.");
        setLoading(false);
        return;
      }

      const formattedJobs: JobWithCustomer[] =
        (data ?? []).map((job) => ({
          ...job,
          customer: Array.isArray(job.customers)
            ? job.customers[0] ?? null
            : job.customers ?? null,
        }));

      setJobs(formattedJobs);
      setLoading(false);
    }

    loadJobs();
  }, [router]);

  function getStatusLabel(status: Job["status"]) {
    switch (status) {
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
        return status;
    }
  }

  function getStatusClasses(status: Job["status"]) {
    switch (status) {
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
          Loading jobs...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-3 text-4xl font-bold">
              Jobs
            </h1>

            <p className="mt-2 text-slate-400">
              Manage your jobs and keep track of scheduled work.
            </p>
          </div>

          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            + New Job
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <h2 className="text-xl font-semibold">
              No jobs yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Create your first job and connect it to one
              of your customers.
            </p>

            <Link
              href="/dashboard/jobs/new"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Create your first job
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="block rounded-2xl border border-white/10 bg-slate-900 p-6 transition hover:border-blue-500/40 hover:bg-slate-900/80"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">
                        {job.title}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                          job.status
                        )}`}
                      >
                        {getStatusLabel(job.status)}
                      </span>
                    </div>

                    {job.customer && (
                      <p className="mt-2 text-sm text-slate-300">
                        Customer:{" "}
                        {job.customer.first_name}{" "}
                        {job.customer.last_name ?? ""}
                        {job.customer.company_name
                          ? ` · ${job.customer.company_name}`
                          : ""}
                      </p>
                    )}

                    {job.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                        {job.description}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-left md:text-right">
                    {job.scheduled_date && (
                      <p className="text-sm text-slate-300">
                        {new Date(
                          `${job.scheduled_date}T00:00:00`
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}

                    {job.estimated_value !== null && (
                      <p className="mt-2 text-lg font-semibold text-white">
                        £
                        {Number(
                          job.estimated_value
                        ).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}