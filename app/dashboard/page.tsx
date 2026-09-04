"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type InvoiceStats = {
  total: number;
  draft: number;
  sent: number;
  overdue: number;
  paid: number;
  cancelled: number;
  outstanding: number;
  paidAmount: number;
};

type QuoteStats = {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
};

type Business = {
  id: string;
  business_name: string;
  business_type: string | null;
  currency: string;
};

type Subscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
};

type LeadStats = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  quoted: number;
  won: number;
  lost: number;
};

type QuoteFollowUp = {
  id: string;
  quote_id: string;
  reminder_type: string;
  status: string;
  generated_message: string | null;
  due_at: string;
  quote: {
    id: string;
    quote_number: string;
    title: string;
    total: number;
    customer: {
      first_name: string;
      last_name: string | null;
      company_name?: string | null;
    } | null;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  
    const { theme, setTheme } = useTheme();

  const ADMIN_USER_ID =
    "dac45085-4903-4db1-bd77-e299997c0dc1";

  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [subscription, setSubscription] =
  useState<Subscription | null>(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [followUps, setFollowUps] = useState<QuoteFollowUp[]>([]);

  const [newEnquiries, setNewEnquiries] = useState(0);
  const [jobsToday, setJobsToday] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const [leadStats, setLeadStats] = useState<LeadStats>({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    quoted: 0,
    won: 0,
    lost: 0,
  });

  const [invoiceStats, setInvoiceStats] =
    useState<InvoiceStats>({
      total: 0,
      draft: 0,
      sent: 0,
      overdue: 0,
      paid: 0,
      cancelled: 0,
      outstanding: 0,
      paidAmount: 0,
    });

  const [quoteStats, setQuoteStats] =
    useState<QuoteStats>({
      total: 0,
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    });

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");
	  setIsAdmin(user.id === ADMIN_USER_ID);

      // ----------------------------------------
      // LOAD BUSINESS
      // ----------------------------------------

      const {
        data: businessData,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select(
          "id, business_name, business_type, currency"
        )
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        console.error(
          "Business loading error:",
          businessError
        );

        setLoading(false);
        return;
      }

      if (!businessData) {
        router.replace("/onboarding");
        return;
      }

      setBusiness(businessData);
	  
	  // ----------------------------------------
// LOAD SUBSCRIPTION
// ----------------------------------------

const {
  data: subscriptionData,
  error: subscriptionError,
} = await supabase
  .from("subscriptions")
  .select(
  `
      plan,
      status,
      current_period_end,
      cancel_at_period_end,
      cancel_at
    `
)
  .eq("user_id", user.id)
  .maybeSingle();

if (subscriptionError) {
  console.error(
    "Subscription loading error:",
    subscriptionError
  );

  setSubscription(null);
} else {
  setSubscription(subscriptionData);
}

    
// ----------------------------------------
// LOAD FOLLOW-UPS NEEDING ATTENTION
// ----------------------------------------

console.log("========================================");
console.log("LOADING FOLLOW-UPS FOR BUSINESS:");
console.log(businessData.id);
console.log("========================================");

const {
  data: followUpData,
  error: followUpError,
} = await supabase
  .from("quote_follow_ups")
  .select(`
    id,
    business_id,
    quote_id,
    reminder_type,
    status,
    generated_message,
    due_at
  `)
  .eq("business_id", businessData.id)
  .eq("status", "pending")
  .order("due_at", {
    ascending: true,
  });

console.log("FOLLOW-UP DATABASE RESULT:", followUpData);
console.log("FOLLOW-UP DATABASE ERROR:", followUpError);

if (followUpError) {
  console.error(
    "Follow-up loading error:",
    followUpError
  );

  setFollowUps([]);
} else if (!followUpData || followUpData.length === 0) {
  console.log(
    "NO PENDING FOLLOW-UPS FOUND FOR BUSINESS:",
    businessData.id
  );

  setFollowUps([]);
} else {
  console.log(
    "PENDING FOLLOW-UP COUNT:",
    followUpData.length
  );

  // ----------------------------------------
  // LOAD RELATED QUOTES
  // ----------------------------------------

  const quoteIds = followUpData.map(
    (followUp) => followUp.quote_id
  );

  console.log(
    "FOLLOW-UP QUOTE IDS:",
    quoteIds
  );

  const {
    data: relatedQuoteData,
    error: relatedQuoteError,
  } = await supabase
    .from("quotes")
    .select(`
      id,
      quote_number,
      title,
      total,
      customer_id
    `)
    .in("id", quoteIds);

  console.log(
    "RELATED QUOTES:",
    relatedQuoteData
  );

  console.log(
    "RELATED QUOTE ERROR:",
    relatedQuoteError
  );

  if (relatedQuoteError) {
    console.error(
      "Related quote loading error:",
      relatedQuoteError
    );

    setFollowUps([]);
  } else {
    // ----------------------------------------
    // LOAD CUSTOMERS
    // ----------------------------------------

    const customerIds = (relatedQuoteData ?? [])
      .map((quote) => quote.customer_id)
      .filter(Boolean);

    let customerData: any[] = [];

    if (customerIds.length > 0) {
      const {
        data: customers,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(`
          id,
          first_name,
          last_name,
          company_name
        `)
        .in("id", customerIds);

      console.log(
        "RELATED CUSTOMERS:",
        customers
      );

      console.log(
        "CUSTOMER ERROR:",
        customerError
      );

      if (customerError) {
        console.error(
          "Customer loading error:",
          customerError
        );
      } else {
        customerData = customers ?? [];
      }
    }

    // ----------------------------------------
    // COMBINE FOLLOW-UPS
    // ----------------------------------------

    const formattedFollowUps: QuoteFollowUp[] =
      followUpData.map((followUp) => {
        const quote = (relatedQuoteData ?? []).find(
          (item) =>
            item.id === followUp.quote_id
        );

        const customer =
          quote?.customer_id
            ? customerData.find(
                (item) =>
                  item.id === quote.customer_id
              )
            : null;

        return {
          id: followUp.id,
          quote_id: followUp.quote_id,
          reminder_type:
            followUp.reminder_type,
          status: followUp.status,
          generated_message:
            followUp.generated_message,
          due_at: followUp.due_at,

          quote: quote
            ? {
                id: quote.id,
                quote_number:
                  quote.quote_number,
                title: quote.title,
                total:
                  Number(quote.total) || 0,

                customer: customer
                  ? {
                      first_name:
                        customer.first_name,
                      last_name:
                        customer.last_name,
                      company_name:
                        customer.company_name,
                    }
                  : null,
              }
            : null,
        };
      });

    console.log(
      "========================================"
    );

    console.log(
      "FORMATTED FOLLOW-UPS:",
      formattedFollowUps
    );

    console.log(
      "FOLLOW-UP COUNT:",
      formattedFollowUps.length
    );

    console.log(
      "========================================"
    );

    setFollowUps(
      formattedFollowUps
    );
  }
}


      // ----------------------------------------
      // LOAD CUSTOMER COUNT
      // ----------------------------------------

      const {
        count: customerCountData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "business_id",
          businessData.id
        );

      if (customerError) {
        console.error(
          "Customer count loading error:",
          customerError
        );
      } else {
        setCustomerCount(
          customerCountData ?? 0
        );
      }

      // ----------------------------------------
      // LOAD NEW ENQUIRIES
      // ----------------------------------------

      const {
        count: newLeadCount,
        error: newLeadCountError,
      } = await supabase
        .from("leads")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "business_id",
          businessData.id
        )
        .eq("status", "new");

      if (newLeadCountError) {
        console.error(
          "Lead count loading error:",
          newLeadCountError
        );
      } else {
        setNewEnquiries(
          newLeadCount ?? 0
        );
      }

      // ----------------------------------------
      // LOAD LEAD / ENQUIRY STATISTICS
      // ----------------------------------------

      const {
        data: leadData,
        error: leadError,
      } = await supabase
        .from("leads")
        .select("status")
        .eq(
          "business_id",
          businessData.id
        );

      if (leadError) {
        console.error(
          "Lead statistics loading error:",
          leadError
        );
      } else {
        const stats: LeadStats = {
          total: 0,
          new: 0,
          contacted: 0,
          qualified: 0,
          quoted: 0,
          won: 0,
          lost: 0,
        };

        for (const lead of leadData ?? []) {
          stats.total += 1;

          switch (lead.status) {
            case "new":
              stats.new += 1;
              break;

            case "contacted":
              stats.contacted += 1;
              break;

            case "qualified":
              stats.qualified += 1;
              break;

            case "quoted":
              stats.quoted += 1;
              break;

            case "won":
              stats.won += 1;
              break;

            case "lost":
              stats.lost += 1;
              break;
          }
        }

        setLeadStats(stats);
      }

      // ----------------------------------------
      // LOAD JOBS TODAY
      // ----------------------------------------

      const today = new Date();

      const todayString = [
        today.getFullYear(),
        String(
          today.getMonth() + 1
        ).padStart(2, "0"),
        String(
          today.getDate()
        ).padStart(2, "0"),
      ].join("-");

      const {
        count: todayJobsCount,
        error: jobsError,
      } = await supabase
        .from("jobs")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "business_id",
          businessData.id
        )
        .eq(
          "scheduled_date",
          todayString
        )
        .neq(
          "status",
          "cancelled"
        );

      if (jobsError) {
        console.error(
          "Jobs today loading error:",
          jobsError
        );
      } else {
        setJobsToday(
          todayJobsCount ?? 0
        );
      }

      // ----------------------------------------
      // LOAD QUOTE STATISTICS
      // ----------------------------------------

      const {
        data: quoteStatsData,
        error: quoteStatsError,
      } = await supabase
        .from("quotes")
        .select("status")
        .eq(
          "business_id",
          businessData.id
        );

      if (quoteStatsError) {
        console.error(
          "Quote statistics loading error:",
          quoteStatsError
        );
      } else {
        const stats: QuoteStats = {
          total: 0,
          draft: 0,
          sent: 0,
          accepted: 0,
          rejected: 0,
          expired: 0,
        };

        for (
          const quote of
          quoteStatsData ?? []
        ) {
          stats.total += 1;

          switch (quote.status) {
            case "draft":
              stats.draft += 1;
              break;

            case "sent":
              stats.sent += 1;
              break;

            case "accepted":
              stats.accepted += 1;
              break;

            case "rejected":
              stats.rejected += 1;
              break;

            case "expired":
              stats.expired += 1;
              break;
          }
        }

        setQuoteStats(stats);
      }

      // ----------------------------------------
      // LOAD INVOICE STATISTICS
      // ----------------------------------------

      const {
        data: invoiceData,
        error: invoiceError,
      } = await supabase
        .from("invoices")
        .select(
          "status, total, due_date, created_at"
        )
        .eq(
          "business_id",
          businessData.id
        );

      if (invoiceError) {
        console.error(
          "Invoice statistics loading error:",
          invoiceError
        );
      } else {
        const now = new Date();

        const stats: InvoiceStats = {
          total: 0,
          draft: 0,
          sent: 0,
          overdue: 0,
          paid: 0,
          cancelled: 0,
          outstanding: 0,
          paidAmount: 0,
        };

        let currentMonthRevenue = 0;

        for (
          const invoice of
          invoiceData ?? []
        ) {
          stats.total += 1;

          const status =
            invoice.status;

          const total =
            Number(invoice.total) || 0;

          // ----------------------------------------
          // MONTHLY REVENUE
          // ----------------------------------------

          if (
            status === "paid" &&
            invoice.created_at
          ) {
            const invoiceDate =
              new Date(
                invoice.created_at
              );

            if (
              invoiceDate.getFullYear() ===
                now.getFullYear() &&
              invoiceDate.getMonth() ===
                now.getMonth()
            ) {
              currentMonthRevenue +=
                total;
            }
          }

          // ----------------------------------------
          // INVOICE STATUS
          // ----------------------------------------

          if (status === "paid") {
            stats.paid += 1;
            stats.paidAmount += total;
            continue;
          }

          if (
            status === "cancelled"
          ) {
            stats.cancelled += 1;
            continue;
          }

          if (
            status === "sent" &&
            invoice.due_date &&
            new Date(
              `${invoice.due_date}T23:59:59`
            ) < now
          ) {
            stats.overdue += 1;
            stats.outstanding +=
              total;
            continue;
          }

          if (status === "sent") {
            stats.sent += 1;
            stats.outstanding +=
              total;
            continue;
          }

          stats.draft += 1;
        }

        setInvoiceStats(stats);

        setMonthlyRevenue(
          currentMonthRevenue
        );
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);
  
  async function handleManageSubscription() {
  try {
    setOpeningPortal(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.replace("/login");
      return;
    }

    const response = await fetch(
      "/api/stripe/create-portal-session",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Unable to open subscription management."
      );
    }

    if (!data?.url) {
      throw new Error(
        "Stripe Customer Portal URL was not returned."
      );
    }

    window.location.href = data.url;
  } catch (error: any) {
    console.error(
      "Manage subscription error:",
      error
    );

    alert(
      error?.message ||
        "Unable to open subscription management."
    );
  } finally {
    setOpeningPortal(false);
  }
}

  // ----------------------------------------
  // LOGOUT
  // ----------------------------------------

  async function handleLogout() {
    setSigningOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Logout error:",
        error
      );

      setSigningOut(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  // ----------------------------------------
  // LOADING
  // ----------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading your FlowPilot workspace...
        </p>
      </main>
    );
  }

  // ----------------------------------------
  // DASHBOARD
  // ----------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">

          <div>
            <p className="text-sm font-semibold tracking-widest text-blue-400">
              FLOWPILOT AI
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              {business?.business_name}
            </h1>

            <p className="mt-3 text-slate-400">
              AI Office Manager
              {business?.business_type
                ? ` for your ${business.business_type.toLowerCase()} business`
                : ""}
              .
            </p>
          </div>
		 
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">

            <div className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">
                Signed in as
              </p>

              <p className="mt-1 text-sm text-slate-200">
                {email}
              </p>
            </div>

            <Link
              href="/onboarding"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Business settings
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingOut
                ? "Signing out..."
                : "Sign out"}
            </button>

          </div>
        </div>
		
		{/* SUBSCRIPTION */}

<div className="mt-8 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-slate-900 p-6">

  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

    <div>
      <div className="flex items-center gap-3">

        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-lg">
          ⚡
        </span>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Current plan
          </p>

          <h2 className="mt-1 text-xl font-bold">
            {subscription?.plan === "professional"
              ? "Professional"
              : subscription?.plan === "business"
                ? "Business"
                : "Free"}
          </h2>
        </div>

      </div>

      <p className="mt-3 text-sm text-slate-400">
  {subscription?.status === "active"
    ? subscription.cancel_at ||
      subscription.cancel_at_period_end
      ? subscription.cancel_at
        ? `Your subscription is scheduled to cancel on ${new Date(
            subscription.cancel_at
          ).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}.`
        : "Your subscription is scheduled to cancel at the end of the current billing period."
      : subscription.current_period_end
        ? `Active until ${new Date(
            subscription.current_period_end
          ).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}`
        : "Your subscription is active."
    : "You are currently using the Free plan."}
</p>
    </div>

    
{isAdmin ? (
  subscription?.plan === "professional" &&
  subscription.status === "active" ? (
    <button
      type="button"
      onClick={handleManageSubscription}
      disabled={openingPortal}
      className="inline-flex shrink-0 rounded-lg border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {openingPortal
        ? "Opening billing..."
        : "Manage subscription →"}
    </button>
  ) : (
    <Link
      href="/pricing"
      className="inline-flex shrink-0 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
    >
      Upgrade to Professional →
    </Link>
  )
) : (
  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300">
    Free Mode
  </div>
)}

  </div>

</div>

        {/* KEY BUSINESS SNAPSHOT */}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              router.push("/dashboard/leads")
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                router.push(
                  "/dashboard/leads"
                );
              }
            }}
            className="group cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-500/40 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-400">
                New Enquiries
              </p>

              <span className="text-sm text-blue-400 opacity-0 transition group-hover:opacity-100">
                View →
              </span>
            </div>

            <p className="mt-2 text-3xl font-bold">
              {newEnquiries}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              New leads waiting for attention
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              router.push("/dashboard/jobs")
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                router.push(
                  "/dashboard/jobs"
                );
              }
            }}
            className="group cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-5 transition hover:border-green-500/40 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-400">
                Jobs Today
              </p>

              <span className="text-sm text-green-400 opacity-0 transition group-hover:opacity-100">
                View →
              </span>
            </div>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {jobsToday}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Scheduled for today
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-400">
                Monthly Revenue
              </p>

              <span className="text-sm text-emerald-400">
                This month
              </span>
            </div>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              £{monthlyRevenue.toFixed(2)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Paid invoices this month
            </p>
          </div>

          <Link
            href="/dashboard/ai-assistant"
            className="group rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-slate-900 p-5 transition hover:border-blue-400/50"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-300">
                AI Assistant
              </p>

              <span className="text-blue-400 transition group-hover:translate-x-1">
                →
              </span>
            </div>

            <p className="mt-2 text-xl font-bold">
              Ask FlowPilot AI
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Get help with leads, quotes, jobs and follow-ups.
            </p>
          </Link>

        </div>

        {/* CUSTOMERS / LEADS / QUOTES / INVOICES */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              router.push(
                "/dashboard/customers"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                router.push(
                  "/dashboard/customers"
                );
              }
            }}
            className="group cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-500/40 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-400">
                Customers
              </p>

              <span className="text-sm text-blue-400 opacity-0 transition group-hover:opacity-100">
                View →
              </span>
            </div>

            <p className="mt-2 text-3xl font-bold">
              {customerCount}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Manage your customers
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              router.push(
                "/dashboard/leads"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                router.push(
                  "/dashboard/leads"
                );
              }
            }}
            className="group cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-500/40 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-400">
                Leads & Enquiries
              </p>

              <span className="text-sm text-blue-400 opacity-0 transition group-hover:opacity-100">
                Manage →
              </span>
            </div>

            <p className="mt-2 text-3xl font-bold">
              {leadStats.total}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {leadStats.qualified} qualified ·{" "}
              {leadStats.won} won
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              router.push(
                "/dashboard/quotes"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                router.push(
                  "/dashboard/quotes"
                );
              }
            }}
            className="group cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-500/40 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-400">
                Quotes
              </p>

              <span className="text-sm text-blue-400 opacity-0 transition group-hover:opacity-100">
                View →
              </span>
            </div>

            <p className="mt-2 text-3xl font-bold">
              {quoteStats.total}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {quoteStats.sent} awaiting response ·{" "}
              {quoteStats.accepted} accepted
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              router.push(
                "/dashboard/invoices"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                router.push(
                  "/dashboard/invoices"
                );
              }
            }}
            className="group cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-500/40 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-400">
                Invoices
              </p>

              <span className="text-sm text-blue-400 opacity-0 transition group-hover:opacity-100">
                View →
              </span>
            </div>

            <p className="mt-2 text-3xl font-bold">
              {invoiceStats.total}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {invoiceStats.paid} paid ·{" "}
              {invoiceStats.overdue} overdue
            </p>
          </div>

        </div>

        {/* AI / AUTOMATION AREA */}

        <div className="mt-8 grid gap-4 md:grid-cols-3">

          <Link
            href="/dashboard/ai-assistant"
            className="rounded-xl border border-blue-500/20 bg-slate-900 p-6 transition hover:border-blue-500/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                🤖 AI Assistant
              </h2>

              <span className="text-blue-400">
                →
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-400">
              Ask FlowPilot to help manage enquiries,
              prepare customer responses and plan your
              next actions.
            </p>

            <span className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">
              Open AI Assistant
            </span>
          </Link>

          <Link
            href="/dashboard/quote-reminders"
            className="rounded-xl border border-white/10 bg-slate-900 p-6 transition hover:border-yellow-500/40"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                🔔 Quote Reminders
              </h2>

              <span className="text-yellow-400">
                →
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-400">
              Automatically remind customers about
              quotes that are waiting for a response.
            </p>

            <span className="mt-5 inline-flex rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-300">
              Manage reminders
            </span>
          </Link>

          <Link
            href="/dashboard/follow-ups"
            className="rounded-xl border border-white/10 bg-slate-900 p-6 transition hover:border-purple-500/40"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                ✨ AI Follow-ups
              </h2>

              <span className="text-purple-400">
                →
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-400">
              Generate personalised follow-up messages
              for new enquiries, quotes and customers.
            </p>

            <span className="mt-5 inline-flex rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300">
              Generate follow-up
            </span>
          </Link>

        </div>

        {/* FOLLOW-UPS NEEDING ATTENTION */}

        {followUps.length > 0 && (
          <div className="mt-8 rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-slate-900 p-6">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>
                <div className="flex items-center gap-3">

                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-xl">
                    🔔
                  </span>

                  <div>

                    <h2 className="text-xl font-semibold">
                      Follow-ups needing attention
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Customers who need a follow-up on an outstanding quote.
                    </p>

                  </div>

                </div>
              </div>

              <Link
                href="/dashboard/follow-ups"
                className="inline-flex shrink-0 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/20"
              >
                View all follow-ups →
              </Link>

            </div>

            <div className="mt-6 space-y-3">

              {followUps.map(
                (followUp) => {

                  const customerName =
                    followUp.quote
                      ?.customer
                      ? `${followUp.quote.customer.first_name} ${
                          followUp.quote.customer.last_name ??
                          ""
                        }`.trim()
                      : "Customer";

                  return (
                    <div
                      key={followUp.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-5 md:flex-row md:items-center"
                    >

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-3">

                          <span className="font-semibold text-blue-400">
                            {followUp.quote
                              ?.quote_number ??
                              "Quote"}
                          </span>

                          <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300">
                            Follow-up due
                          </span>

                        </div>

                        <p className="mt-2 font-semibold">
                          {customerName}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {followUp.quote
                            ?.title ??
                            "Outstanding quote"}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Due{" "}
                          {new Date(
                            followUp.due_at
                          ).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>

                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">

                        <p className="text-xl font-bold">
                          £
                          {(
                            followUp.quote
                              ?.total ?? 0
                          ).toFixed(2)}
                        </p>

                        <Link
                          href={`/dashboard/quotes/${followUp.quote_id}/follow-up`}
                          className="inline-flex rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-yellow-400"
                        >
                          View follow-up
                        </Link>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          </div>
        )}

        {/* QUOTE PIPELINE */}

        <div className="mt-8 rounded-xl border border-white/10 bg-slate-900 p-6">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <h2 className="text-xl font-semibold">
                Quote pipeline
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Track quotes from draft to customer response.
              </p>

            </div>

            <Link
              href="/dashboard/quotes"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Manage quotes
            </Link>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Draft
              </p>

              <p className="mt-2 text-2xl font-bold">
                {quoteStats.draft}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Sent
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-400">
                {quoteStats.sent}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Accepted
              </p>

              <p className="mt-2 text-2xl font-bold text-green-400">
                {quoteStats.accepted}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Rejected
              </p>

              <p className="mt-2 text-2xl font-bold text-red-400">
                {quoteStats.rejected}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Expired
              </p>

              <p className="mt-2 text-2xl font-bold text-orange-400">
                {quoteStats.expired}
              </p>
            </div>

          </div>
        </div>

        {/* LEAD PIPELINE */}

        <div className="mt-8 rounded-xl border border-white/10 bg-slate-900 p-6">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <h2 className="text-xl font-semibold">
                Enquiry pipeline
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Turn new enquiries into paying customers.
              </p>

            </div>

            <Link
              href="/dashboard/leads"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Manage enquiries
            </Link>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                New
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-400">
                {leadStats.new}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Contacted
              </p>

              <p className="mt-2 text-2xl font-bold">
                {leadStats.contacted}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Qualified
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-400">
                {leadStats.qualified}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Quoted
              </p>

              <p className="mt-2 text-2xl font-bold text-yellow-400">
                {leadStats.quoted}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Won
              </p>

              <p className="mt-2 text-2xl font-bold text-green-400">
                {leadStats.won}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Lost
              </p>

              <p className="mt-2 text-2xl font-bold text-red-400">
                {leadStats.lost}
              </p>
            </div>

          </div>
        </div>

        {/* INVOICE FINANCIAL SUMMARY */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Paid
            </p>

            <p className="mt-2 text-2xl font-bold text-green-400">
              £
              {invoiceStats.paidAmount.toFixed(
                2
              )}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {invoiceStats.paid} paid invoice
              {invoiceStats.paid === 1
                ? ""
                : "s"}
            </p>

          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Outstanding
            </p>

            <p className="mt-2 text-2xl font-bold">
              £
              {invoiceStats.outstanding.toFixed(
                2
              )}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Money still to collect
            </p>

          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Sent
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-400">
              {invoiceStats.sent}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Awaiting payment
            </p>

          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Overdue
            </p>

            <p className="mt-2 text-2xl font-bold text-red-400">
              {invoiceStats.overdue}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Payment overdue
            </p>

          </div>

        </div>

        {/* AI ASSISTANT */}

        <div className="mt-8 rounded-xl border border-blue-500/20 bg-gradient-to-r from-slate-900 to-blue-950/30 p-8">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>

              <div className="flex items-center gap-3">

                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-xl">
                  🤖
                </span>

                <h2 className="text-xl font-semibold">
                  AI Assistant
                </h2>

              </div>

              <p className="mt-3 max-w-2xl text-sm text-slate-400">
                Let FlowPilot help you manage enquiries,
                follow up with customers, prepare quotes
                and stay on top of your business.
              </p>

            </div>

            <Link
              href="/dashboard/leads"
              className="inline-flex shrink-0 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Review enquiries →
            </Link>

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">

            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-medium">
                ✨ AI Follow-ups
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Generate personalised customer follow-up messages.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-medium">
                📋 Lead Management
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Keep track of new enquiries and opportunities.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-medium">
                🔔 Quote Reminders
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Never forget to follow up on an outstanding quote.
              </p>
            </div>

          </div>

        </div>

        {/* WORKSPACE */}

        <div className="mt-8 rounded-xl border border-white/10 bg-slate-900 p-8">

          <h2 className="text-xl font-semibold">
            Your FlowPilot workspace
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Manage your customers, enquiries, jobs,
            quotes and invoices from one place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">

            <Link
              href="/dashboard/leads"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Manage enquiries
            </Link>

            <Link
              href="/dashboard/customers"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Manage customers
            </Link>

            <Link
              href="/dashboard/jobs"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Manage jobs
            </Link>

            <Link
              href="/dashboard/quotes"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Manage quotes
            </Link>

            <Link
              href="/dashboard/invoices"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              View invoices
            </Link>

          </div>

        </div>

      </div>
    </main>
  );
}

