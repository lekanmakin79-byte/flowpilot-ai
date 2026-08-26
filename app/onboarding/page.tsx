"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("GBP");

  useEffect(() => {
    async function loadBusiness() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: business, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setError("Unable to load your business information.");
        setLoading(false);
        return;
      }

      if (business) {
        setBusinessName(business.business_name ?? "");
        setBusinessType(business.business_type ?? "");
        setPhone(business.phone ?? "");
        setAddress(business.address ?? "");
        setWebsite(business.website ?? "");
        setCurrency(business.currency ?? "GBP");
      }

      setLoading(false);
    }

    loadBusiness();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!businessName.trim()) {
      setError("Please enter your business name.");
      setSaving(false);
      return;
    }

    const { data: existingBusiness, error: lookupError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error(lookupError);
      setError("Unable to check your business profile.");
      setSaving(false);
      return;
    }

    let saveError;

    if (existingBusiness) {
      const { error } = await supabase
        .from("businesses")
        .update({
          business_name: businessName.trim(),
          business_type: businessType.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          website: website.trim() || null,
          currency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBusiness.id);

      saveError = error;
    } else {
      const { error } = await supabase.from("businesses").insert({
        owner_id: user.id,
        business_name: businessName.trim(),
        business_type: businessType.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
        currency,
      });

      saveError = error;
    }

    if (saveError) {
      console.error(saveError);
      setError(saveError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading your business profile...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="mb-8">
            <p className="text-sm font-semibold tracking-wider text-blue-400">
              FLOWPILOT AI
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Set up your business
            </h1>

            <p className="mt-3 text-slate-400">
              Tell us a little about your business so FlowPilot AI
              can personalise your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="businessName"
                className="mb-2 block text-sm font-medium"
              >
                Business name *
              </label>

              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="e.g. Smith Electrical Services"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="businessType"
                className="mb-2 block text-sm font-medium"
              >
                Business type
              </label>

              <select
                id="businessType"
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              >
                <option value="">Select a business type</option>
                <option value="Electrician">Electrician</option>
                <option value="Plumber">Plumber</option>
                <option value="Builder">Builder</option>
                <option value="Cleaning Company">
                  Cleaning Company
                </option>
                <option value="Property Services">
                  Property Services
                </option>
                <option value="Consultant">Consultant</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Business email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="business@example.com"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Phone number
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+44..."
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium"
              >
                Business address
              </label>

              <textarea
                id="address"
                rows={3}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Business address"
                className="w-full resize-none rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="mb-2 block text-sm font-medium"
              >
                Website
              </label>

              <input
                id="website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-medium"
              >
                Currency
              </label>

              <select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              >
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="NGN">NGN (₦) — Nigerian Naira</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Save business and continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}