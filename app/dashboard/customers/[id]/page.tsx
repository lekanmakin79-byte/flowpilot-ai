"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();

  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadCustomer() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError || !business) {
        router.replace("/onboarding");
        return;
      }

      const { data, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .eq("business_id", business.id)
        .maybeSingle();

      if (customerError) {
        console.error(customerError);
        setError("Unable to load customer.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Customer not found.");
        setLoading(false);
        return;
      }

      setCustomer(data);

      setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? "");
      setCompanyName(data.company_name ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setNotes(data.notes ?? "");

      setLoading(false);
    }

    if (customerId) {
      loadCustomer();
    }
  }, [customerId, router]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("customers")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        company_name: companyName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setCustomer(data);
    setEditing(false);
    setSaving(false);
  }

  async function handleReactivate() {
    const { data, error: updateError } = await supabase
      .from("customers")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      setError("Unable to reactivate customer.");
      return;
    }

    setCustomer(data);
  }

  async function handleArchive() {
    const confirmed = window.confirm(
      "Are you sure you want to archive this customer?"
    );

    if (!confirmed) {
      return;
    }

    const { data, error: updateError } = await supabase
      .from("customers")
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      setError("Unable to archive customer.");
      return;
    }

    setCustomer(data);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading customer...
        </p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard/customers"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to customers
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-8">
            <h1 className="text-xl font-semibold">
              Customer not found
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
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              href="/dashboard/customers"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to customers
            </Link>

            <h1 className="mt-3 text-4xl font-bold">
              {customer.first_name} {customer.last_name ?? ""}
            </h1>

            {customer.company_name && (
              <p className="mt-2 text-slate-400">
                {customer.company_name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                customer.status === "active"
                  ? "bg-green-500/10 text-green-300"
                  : "bg-slate-500/10 text-slate-400"
              }`}
            >
              {customer.status === "active"
                ? "Active"
                : "Inactive"}
            </span>

            {!editing && customer.status === "active" && (
              <button
                type="button"
                onClick={handleArchive}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Archive
              </button>
            )}

            {!editing && customer.status === "inactive" && (
              <button
                type="button"
                onClick={handleReactivate}
                className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-500/20"
              >
                Reactivate
              </button>
            )}

            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500"
              >
                Edit customer
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
            className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h2 className="text-xl font-semibold">
              Edit customer
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium"
                >
                  First name *
                </label>

                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium"
                >
                  Last name
                </label>

                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="companyName"
                  className="mb-2 block text-sm font-medium"
                >
                  Company
                </label>

                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(event) =>
                    setCompanyName(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="mb-2 block text-sm font-medium"
                >
                  Address
                </label>

                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(event) =>
                    setAddress(event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  rows={5}
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-white/10 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold">
                Contact information
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Email
                  </p>

                  <p className="mt-1 text-slate-200">
                    {customer.email || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Phone
                  </p>

                  <p className="mt-1 text-slate-200">
                    {customer.phone || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Address
                  </p>

                  <p className="mt-1 text-slate-200">
                    {customer.address || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold">
                Notes
              </h2>

              <p className="mt-5 whitespace-pre-wrap text-slate-300">
                {customer.notes || "No notes added."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:col-span-2">
              <h2 className="text-lg font-semibold">
                Customer information
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Status
                  </p>

                  <p className="mt-1 capitalize text-slate-200">
                    {customer.status}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Added
                  </p>

                  <p className="mt-1 text-slate-200">
                    {new Date(
                      customer.created_at
                    ).toLocaleDateString("en-GB")}
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