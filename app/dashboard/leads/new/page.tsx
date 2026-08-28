"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    let mounted = true;

    async function loadBusiness() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (mounted) {
          router.replace("/login");
        }
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

        if (mounted) {
          setError("Unable to load your business.");
          setLoading(false);
        }

        return;
      }

      if (!business) {
        router.replace("/onboarding");
        return;
      }

      if (mounted) {
        setBusinessId(business.id);
        setLoading(false);
      }
    }

    loadBusiness();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Please enter the customer's name.");
      return;
    }

    if (!businessId) {
      setError("Business information is missing.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Your session has expired. Please sign in again.");
        setSaving(false);
        router.replace("/login");
        return;
      }

      /*
       * Check subscription access BEFORE creating the enquiry.
       */
      const subscriptionResponse = await fetch(
        "/api/subscription/check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            feature: "lead",
            businessId,
          }),
        }
      );

      let access: {
        allowed?: boolean;
        error?: string;
        code?: string;
      };

      try {
        access = await subscriptionResponse.json();
      } catch {
        access = {
          allowed: false,
          error: "Unable to verify subscription access.",
        };
      }

      if (!subscriptionResponse.ok || !access.allowed) {
        setError(
          access.error ||
            "Free plan limit reached. Please upgrade to Professional."
        );
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("leads")
        .insert({
          business_id: businessId,
          name: trimmedName,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
          description: trimmedDescription || null,
          source,
          status: "new",
        });

      if (insertError) {
        console.error(insertError);

        setError(
          "Unable to create the enquiry. Please try again."
        );
        setSaving(false);
        return;
      }

      router.push("/dashboard/leads");
      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Unable to create the enquiry. Please try again."
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/leads"
          className="text-sm text-blue-400 transition hover:text-blue-300"
        >
          ← Back to enquiries
        </Link>

        <div className="mt-4">
          <h1 className="text-4xl font-bold">New Enquiry</h1>

          <p className="mt-2 text-slate-400">
            Add a new customer enquiry to your sales pipeline.
          </p>
        </div>

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
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-300"
              >
                Customer name *
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Sarah Jones"
                required
                autoComplete="name"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-300"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="customer@example.com"
                autoComplete="email"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="text-sm font-medium text-slate-300"
              >
                Phone
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="07700 000000"
                autoComplete="tel"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="source"
                className="text-sm font-medium text-slate-300"
              >
                Source
              </label>

              <select
                id="source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="website">Website</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="referral">Referral</option>
                <option value="social">Social media</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-slate-300"
              >
                Enquiry details
              </label>

              <textarea
                id="description"
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
              {saving ? "Creating enquiry..." : "Create enquiry"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}