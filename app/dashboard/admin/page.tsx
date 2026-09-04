"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type UserSummary = {
  id: string;
  email: string;
  created_at: string;
};

type BusinessSummary = {
  id: string;
  business_name: string;
  business_type: string | null;
  owner_id: string;
};

type SubscriptionSummary = {
  plan: string;
  status: string;
};

type AdminDashboardData = {
  admin: {
    id: string;
    email: string;
  };
  users: UserSummary[];
  businesses: BusinessSummary[];
  subscriptions: SubscriptionSummary[];
  aiUsageCount: number;
  activeSubscriptions: number;
  professionalSubscriptions: number;
  businessSubscriptions: number;
  billingEnabled: boolean;
  startOfMonth: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [data, setData] =
    useState<AdminDashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAdminDashboard() {
      try {
        setLoading(true);
        setError("");

        // Give the browser Supabase client a moment to hydrate
        // the existing authentication session.
        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            `Supabase session error: ${sessionError.message}`
          );
        }

        let session = sessionData.session;

        // Retry once in case Supabase is still hydrating
        // the browser session.
        if (!session) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000)
          );

          const {
            data: retrySessionData,
            error: retrySessionError,
          } = await supabase.auth.getSession();

          if (retrySessionError) {
            throw new Error(
              `Supabase session retry error: ${retrySessionError.message}`
            );
          }

          session = retrySessionData.session;
        }

        if (!session) {
          throw new Error(
            "No Supabase session was found in the browser. Please sign out and sign in again."
          );
        }

        const user = session.user;

        if (!user) {
          throw new Error(
            "The Supabase session exists, but no authenticated user was found."
          );
        }

        const accessToken =
          session.access_token;

        if (!accessToken) {
          throw new Error(
            "The Supabase session exists, but no access token was found."
          );
        }

        const response = await fetch(
          "/api/admin/dashboard",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

        const result =
          await response.json();

        if (response.status === 401) {
          throw new Error(
            "Admin API returned 401 Unauthorized. The Supabase session exists, but the Admin API rejected the access token."
          );
        }

        if (response.status === 403) {
          throw new Error(
            `Admin API returned 403 Forbidden. Authenticated user ID: ${user.id}`
          );
        }

        if (!response.ok) {
          throw new Error(
            result.error ||
              `Admin API returned HTTP ${response.status}.`
          );
        }

        if (mounted) {
          setData(result);
        }
      } catch (err) {
        console.error(
          "Admin dashboard loading error:",
          err
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load admin dashboard."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAdminDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-blue-500">
              FLOWPILOT AI
            </p>

            <h1 className="mt-3 text-2xl font-bold">
              Loading Admin Dashboard...
            </h1>

            <p className="mt-2 text-sm opacity-60">
              Verifying administrator access.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-red-500">
              Admin Dashboard Diagnostic
            </p>

            <h1 className="mt-3 text-2xl font-bold">
              Authentication/API Check Failed
            </h1>

            <p className="mt-4 break-words text-sm opacity-80">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="ml-3 mt-6 rounded-lg border border-black/10 bg-black/5 px-5 py-3 text-sm font-semibold transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              User Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const recentUsers =
    data.users.slice(0, 10);

  const recentBusinesses =
    data.businesses
      .slice(-10)
      .reverse();

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold tracking-widest text-blue-500">
              FLOWPILOT AI
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Admin Dashboard
            </h1>

            <p className="mt-3 text-sm opacity-60">
              Manage and monitor the FlowPilot AI platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-lg border border-black/10 bg-black/5 px-4 py-3 text-sm font-semibold transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              User Dashboard
            </a>

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
              Admin Access
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-300">
                Billing Status
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Monetisation Paused
              </h2>

              <p className="mt-2 text-sm opacity-70">
                FlowPilot AI is currently operating as a free service.
                Stripe subscriptions remain dormant.
              </p>
            </div>

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-700 dark:text-yellow-300">
              FREE MODE
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-black/10 bg-black/5 p-6 dark:border-white/10 dark:bg-white/5">
            <p className="text-sm opacity-60">
              Registered Users
            </p>

            <p className="mt-2 text-3xl font-bold">
              {data.users.length}
            </p>

            <p className="mt-2 text-xs opacity-50">
              Supabase authentication users
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-black/5 p-6 dark:border-white/10 dark:bg-white/5">
            <p className="text-sm opacity-60">
              Businesses
            </p>

            <p className="mt-2 text-3xl font-bold">
              {data.businesses.length}
            </p>

            <p className="mt-2 text-xs opacity-50">
              Registered business workspaces
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-6">
            <p className="text-sm text-blue-600 dark:text-blue-300">
              AI Usage This Month
            </p>

            <p className="mt-2 text-3xl font-bold">
              {data.aiUsageCount}
            </p>

            <p className="mt-2 text-xs opacity-60">
              Successful AI usage records
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <p className="text-sm text-emerald-600 dark:text-emerald-300">
              Active Subscriptions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {data.activeSubscriptions}
            </p>

            <p className="mt-2 text-xs opacity-60">
              Currently dormant while billing is paused
            </p>
          </div>

        </div>

        <section className="mt-8 rounded-xl border border-black/10 bg-black/5 p-6 dark:border-white/10 dark:bg-white/5">

          <div>
            <h2 className="text-xl font-semibold">
              Subscription Overview
            </h2>

            <p className="mt-1 text-sm opacity-60">
              Existing subscription records are visible for administration,
              but paid access is currently disabled.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-lg bg-black/5 p-5 dark:bg-white/5">
              <p className="text-sm opacity-60">
                Professional
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.professionalSubscriptions}
              </p>
            </div>

            <div className="rounded-lg bg-black/5 p-5 dark:bg-white/5">
              <p className="text-sm opacity-60">
                Business
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.businessSubscriptions}
              </p>
            </div>

            <div className="rounded-lg bg-black/5 p-5 dark:bg-white/5">
              <p className="text-sm opacity-60">
                Total Records
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.subscriptions.length}
              </p>
            </div>

          </div>

        </section>

        <section className="mt-8 rounded-xl border border-black/10 bg-black/5 p-6 dark:border-white/10 dark:bg-white/5">

          <div>
            <h2 className="text-xl font-semibold">
              Recent Users
            </h2>

            <p className="mt-1 text-sm opacity-60">
              Latest registered FlowPilot AI accounts.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">

            <table className="w-full min-w-[600px] text-left text-sm">

              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">

                  <th className="px-4 py-3 font-semibold">
                    Email
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    User ID
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Registered
                  </th>

                </tr>
              </thead>

              <tbody>

                {recentUsers.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="border-b border-black/5 dark:border-white/5"
                    >

                      <td className="px-4 py-3">
                        {item.email || "No email"}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs opacity-60">
                        {item.id}
                      </td>

                      <td className="px-4 py-3 opacity-70">
                        {new Date(
                          item.created_at
                        ).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>

                    </tr>
                  )
                )}

                {recentUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center opacity-50"
                    >
                      No users found.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        <section className="mt-8 rounded-xl border border-black/10 bg-black/5 p-6 dark:border-white/10 dark:bg-white/5">

          <div>
            <h2 className="text-xl font-semibold">
              Businesses
            </h2>

            <p className="mt-1 text-sm opacity-60">
              Registered FlowPilot AI business workspaces.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">

            <table className="w-full min-w-[700px] text-left text-sm">

              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">

                  <th className="px-4 py-3 font-semibold">
                    Business
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Type
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Owner
                  </th>

                </tr>
              </thead>

              <tbody>

                {recentBusinesses.map(
                  (business) => {

                    const owner =
                      data.users.find(
                        (item) =>
                          item.id ===
                          business.owner_id
                      );

                    return (
                      <tr
                        key={business.id}
                        className="border-b border-black/5 dark:border-white/5"
                      >

                        <td className="px-4 py-3 font-semibold">
                          {business.business_name}
                        </td>

                        <td className="px-4 py-3 opacity-70">
                          {business.business_type ||
                            "Not specified"}
                        </td>

                        <td className="px-4 py-3 opacity-70">
                          {owner?.email ||
                            business.owner_id}
                        </td>

                      </tr>
                    );
                  }
                )}

                {recentBusinesses.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center opacity-50"
                    >
                      No businesses found.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        <section className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">

          <h2 className="text-xl font-semibold">
            Administration
          </h2>

          <div className="mt-4 grid gap-3 text-sm">

            <div className="flex flex-col justify-between gap-2 rounded-lg bg-black/5 p-4 sm:flex-row dark:bg-white/5">
              <span className="opacity-60">
                Current access
              </span>

              <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                Administrator
              </span>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-lg bg-black/5 p-4 sm:flex-row dark:bg-white/5">
              <span className="opacity-60">
                Monetisation
              </span>

              <span className="font-semibold text-yellow-600 dark:text-yellow-300">
                Paused
              </span>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-lg bg-black/5 p-4 sm:flex-row dark:bg-white/5">
              <span className="opacity-60">
                Free AI
              </span>

              <span className="font-semibold text-blue-600 dark:text-blue-300">
                Enabled
              </span>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-lg bg-black/5 p-4 sm:flex-row dark:bg-white/5">
              <span className="opacity-60">
                Free AI Follow-ups
              </span>

              <span className="font-semibold">
                3 per month
              </span>
            </div>

          </div>

        </section>

        <div className="mt-10 border-t border-black/10 pt-6 text-center text-xs opacity-40 dark:border-white/10">
          FlowPilot AI Admin Dashboard
        </div>

      </div>
    </main>
  );
}