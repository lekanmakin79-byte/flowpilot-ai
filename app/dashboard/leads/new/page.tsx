"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NewLeadPage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("manual");

  useEffect(() => {
    async function loadBusiness() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: business, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setError("Unable to load your business.");
        setLoading(false);
        return;
      }

      if (!business) {
        router.replace("/onboarding");
        return;
      }

      setBusinessId(business.id);
      setLoading(false);
    }

    loadBusiness();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Please enter the customer's name.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("leads")
      .insert({
        business_id: businessId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        description: description.trim() || null,
        source,
        status: "new",
      });

    if (error) {
      console.error(error);
      setError(
        "Unable to create the enquiry. Please try again."
      );
      setSaving(false);
      return;
    }

    router.push("/dashboard/leads");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/dashboard/leads"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to enquiries
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          New Enquiry
        </h1>

        <p className="mt-2 text-slate-400">
          Add a new customer enquiry to your sales pipeline.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6"
        >

          <div className="grid gap-6 sm:grid-cols-2">

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Customer name *
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. Sarah Jones"
                required
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="customer@example.com"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Phone
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="07700 000000"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Source
              </label>

              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="manual">
                  Manual
                </option>

                <option value="website">
                  Website
                </option>

                <option value="phone">
                  Phone
                </option>

                <option value="email">
                  Email
                </option>

                <option value="referral">
                  Referral
                </option>

                <option value="social">
                  Social media
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Enquiry details
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={6}
                placeholder="What does the customer need help with?"
                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/dashboard/leads"
              className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating enquiry..."
                : "Create enquiry"}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}