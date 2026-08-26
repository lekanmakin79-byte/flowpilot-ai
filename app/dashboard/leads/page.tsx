"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type LeadStatus =
  | "new"
  | "contacted"
  | "quoted"
  | "won"
  | "lost";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
};

const statuses: {
  value: "all" | LeadStatus;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadLeads() {
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

      const { data, error: leadsError } = await supabase
        .from("leads")
        .select(
          `
          id,
          name,
          email,
          phone,
          description,
          source,
          status,
          created_at
        `
        )
        .eq("business_id", business.id)
        .order("created_at", {
          ascending: false,
        });

      if (leadsError) {
        console.error(leadsError);
        setError("Unable to load your leads.");
        setLoading(false);
        return;
      }

      setLeads((data ?? []) as Lead[]);
      setLoading(false);
    }

    loadLeads();
  }, [router]);

  async function updateLeadStatus(
    leadId: string,
    status: LeadStatus
  ) {
    setUpdatingLeadId(leadId);

    const { error } = await supabase
      .from("leads")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (error) {
      console.error(error);
      setError("Unable to update the lead.");
      setUpdatingLeadId(null);
      return;
    }

    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status,
            }
          : lead
      )
    );

    setUpdatingLeadId(null);
  }

  function getStatusClasses(status: LeadStatus) {
    switch (status) {
      case "new":
        return "bg-blue-500/10 text-blue-300";

      case "contacted":
        return "bg-yellow-500/10 text-yellow-300";

      case "quoted":
        return "bg-purple-500/10 text-purple-300";

      case "won":
        return "bg-green-500/10 text-green-300";

      case "lost":
        return "bg-red-500/10 text-red-300";

      default:
        return "bg-slate-500/10 text-slate-400";
    }
  }

  function getStatusLabel(status: LeadStatus) {
    switch (status) {
      case "new":
        return "New";

      case "contacted":
        return "Contacted";

      case "quoted":
        return "Quoted";

      case "won":
        return "Won";

      case "lost":
        return "Lost";

      default:
        return status;
    }
  }

  const filteredLeads =
    filter === "all"
      ? leads
      : leads.filter((lead) => lead.status === filter);

  const newCount = leads.filter(
    (lead) => lead.status === "new"
  ).length;

  const contactedCount = leads.filter(
    (lead) => lead.status === "contacted"
  ).length;

  const quotedCount = leads.filter(
    (lead) => lead.status === "quoted"
  ).length;

  const wonCount = leads.filter(
    (lead) => lead.status === "won"
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading enquiries...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-3 text-4xl font-bold">
              Leads & Enquiries
            </h1>

            <p className="mt-2 text-slate-400">
              Track new enquiries and turn opportunities
              into customers.
            </p>
          </div>

          <Link
            href="/dashboard/leads/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            + New Enquiry
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              New enquiries
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-400">
              {newCount}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Contacted
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {contactedCount}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Quoted
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-400">
              {quotedCount}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Won
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {wonCount}
            </p>
          </div>

        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap gap-2">
          {statuses.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === item.value
                  ? "bg-blue-600 text-white"
                  : "border border-white/10 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredLeads.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-2xl">
              📩
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              {filter === "all"
                ? "No enquiries yet"
                : `No ${getStatusLabel(filter).toLowerCase()} enquiries`}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              New customer enquiries will appear here so
              you can follow them through your sales
              pipeline.
            </p>

            {filter === "all" && (
              <Link
                href="/dashboard/leads/new"
                className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Create your first enquiry
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-4">

            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-2xl border border-white/10 bg-slate-900 p-6 transition hover:border-blue-500/30"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">
                        {lead.name}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                          lead.status
                        )}`}
                      >
                        {getStatusLabel(lead.status)}
                      </span>
                    </div>

                    {(lead.email || lead.phone) && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                        {lead.email && (
                          <span>{lead.email}</span>
                        )}

                        {lead.phone && (
                          <span>{lead.phone}</span>
                        )}
                      </div>
                    )}

                    {lead.description && (
                      <p className="mt-3 max-w-2xl text-sm text-slate-400">
                        {lead.description}
                      </p>
                    )}

                    {lead.source && (
                      <p className="mt-3 text-xs text-slate-500">
                        Source: {lead.source}
                      </p>
                    )}

                  </div>

                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">

                    <select
                      value={lead.status}
                      disabled={updatingLeadId === lead.id}
                      onChange={(event) =>
                        updateLeadStatus(
                          lead.id,
                          event.target.value as LeadStatus
                        )
                      }
                      className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="new">
                        New
                      </option>

                      <option value="contacted">
                        Contacted
                      </option>

                      <option value="quoted">
                        Quoted
                      </option>

                      <option value="won">
                        Won
                      </option>

                      <option value="lost">
                        Lost
                      </option>
                    </select>

                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      View enquiry
                    </Link>

                  </div>
                </div>

                <div className="mt-5 border-t border-white/5 pt-4 text-xs text-slate-500">
                  Added{" "}
                  {new Date(
                    lead.created_at
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </main>
  );
}