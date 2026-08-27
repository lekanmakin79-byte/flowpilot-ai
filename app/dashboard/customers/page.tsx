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
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  
  const [canAddCustomer, setCanAddCustomer] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
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

    setBusinessId(business.id);

    const { data, error: customersError } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name, company_name, email, phone, address, notes, status, created_at"
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (customersError) {
      console.error(customersError);
      setError("Unable to load customers.");
      setLoading(false);
      return;
    }

    setCustomers(data ?? []);

const { data: sessionData } =
  await supabase.auth.getSession();

const accessToken =
  sessionData.session?.access_token;

if (!accessToken) {
  setCanAddCustomer(false);
  setSubscriptionLoading(false);
  setLoading(false);
  return;
}

const subscriptionResponse =
  await fetch("/api/subscription/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      feature: "customer",
      businessId: business.id,
    }),
  });

const access =
  await subscriptionResponse.json();

if (
  subscriptionResponse.ok &&
  access.allowed
) {
  setCanAddCustomer(true);
} else {
  setCanAddCustomer(false);

  if (
    access.code ===
    "FREE_LIMIT_REACHED"
  ) {
    setError(
      access.error ||
        "You have reached the Free plan limit of 5 customers. Upgrade to Professional to add unlimited customers."
    );
  }
}

setSubscriptionLoading(false);
setLoading(false);
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setNotes("");
    setError("");
  }

  async function handleAddCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
	
	if (!canAddCustomer) {
  setError(
    "You have reached the Free plan limit of 5 customers. Upgrade to Professional to add unlimited customers."
  );
  return;
}

    if (!businessId) {
      setError("Business information is missing.");
      return;
    }

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

        setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // ----------------------------------------
// CHECK SUBSCRIPTION ACCESS
// ----------------------------------------

const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.access_token) {
  setError("Your session has expired. Please sign in again.");
  setSaving(false);
  router.replace("/login");
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
      feature: "customer",
      businessId,
    }),
  }
);

const access = await subscriptionResponse.json();

if (!subscriptionResponse.ok || !access.allowed) {
  setError(
    access.error ||
      "Free plan limit reached. Please upgrade to Professional."
  );

  setSaving(false);
  return;
}

    // ----------------------------------------
    // CREATE CUSTOMER
    // ----------------------------------------

    const { error: insertError } = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        company_name: companyName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

    if (insertError) {
      console.error(insertError);
      setError(insertError.message);
      setSaving(false);
      return;
    }

    resetForm();
    setShowForm(false);
    setSaving(false);

        await loadCustomers();
  }

  async function handleArchiveCustomer(customerId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to archive this customer?"
    );

    if (!confirmed) {
      return;
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (updateError) {
      console.error(updateError);
      setError("Unable to archive customer.");
      return;
    }

    await loadCustomers();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading customers...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-3 text-4xl font-bold">
              Customers
            </h1>

            <p className="mt-2 text-slate-400">
              Manage your customers and their contact information.
            </p>
          </div>

          <div className="flex gap-3">
           {canAddCustomer && !subscriptionLoading && (
  <button
    type="button"
    onClick={() => {
      resetForm();
      setShowForm(true);
    }}
    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
  >
    + Add Customer
  </button>
)}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {showForm && canAddCustomer && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Add customer
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Add a new customer to your business.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={handleAddCustomer}
              className="grid gap-5 md:grid-cols-2"
            >
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
                  placeholder="John"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  placeholder="Smith"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  placeholder="Smith Properties"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  placeholder="john@example.com"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  placeholder="+44 7000 000000"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  placeholder="Customer address"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  rows={4}
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Additional customer information..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save customer"}
                </button>
              </div>
            </form>
          </div>
        )}

        {customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-semibold">
                No customers yet
              </h2>

              <p className="mt-3 text-slate-400">
                Add your first customer to start building your
                FlowPilot customer database.
              </p>

             {canAddCustomer && (
  <button
    type="button"
    onClick={() => {
      resetForm();
      setShowForm(true);
    }}
    className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
  >
    Add your first customer
  </button>
)}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-6 py-4">
              <p className="text-sm text-slate-400">
                {customers.length}{" "}
                {customers.length === 1
                  ? "customer"
                  : "customers"}
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                ><div>
  <Link
    href={`/dashboard/customers/${customer.id}`}
    className="font-semibold hover:text-blue-400"
  >
    {customer.first_name}{" "}
    {customer.last_name ?? ""}
  </Link>

  {customer.company_name && (
    <p className="mt-1 text-sm text-slate-400">
      {customer.company_name}
    </p>
  )}

  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
    {customer.email && (
      <span>{customer.email}</span>
    )}

    {customer.phone && (
      <span>{customer.phone}</span>
    )}
  </div>
</div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        customer.status === "active"
                          ? "bg-green-500/10 text-green-300"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {customer.status === "active"
                        ? "Active"
                        : "Inactive"}
                    </span>

                    {customer.status === "active" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleArchiveCustomer(customer.id)
                        }
                        className="text-sm text-slate-400 hover:text-red-300"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}