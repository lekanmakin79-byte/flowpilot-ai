import { createClient } from "@supabase/supabase-js";

export type Plan = "free" | "professional";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | null;

export interface SubscriptionInfo {
  plan: Plan;
  status: SubscriptionStatus;
  isPaid: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const FREE_LIMITS = {
  customers: 5,
  leads: 5,
  jobs: 5,
  quotes: 5,
  invoices: 5,
  aiFollowUpsPerMonth: 3,
};

export const PROFESSIONAL_LIMITS = {
  customers: Infinity,
  leads: Infinity,
  jobs: Infinity,
  quotes: Infinity,
  invoices: Infinity,
  aiFollowUpsPerMonth: Infinity,
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getSubscriptionInfo(
  userId: string
): Promise<SubscriptionInfo> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
        plan,
        status,
        current_period_end,
        cancel_at_period_end
      `
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Subscription lookup error:",
      error
    );

    throw new Error(
      "Unable to check subscription status."
    );
  }

  /*
   * No subscription row means FREE.
   */
  if (!data) {
    return {
      plan: "free",
      status: null,
      isPaid: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const isPaid =
    data.plan === "professional" &&
    (
      data.status === "active" ||
      data.status === "trialing"
    );

  return {
    plan: isPaid
      ? "professional"
      : "free",

    status:
      data.status as SubscriptionStatus,

    isPaid,

    currentPeriodEnd:
      data.current_period_end ?? null,

    cancelAtPeriodEnd:
      Boolean(data.cancel_at_period_end),
  };
}

export function getPlanLimits(
  plan: Plan
) {
  return plan === "professional"
    ? PROFESSIONAL_LIMITS
    : FREE_LIMITS;
}

export function getLimit(
  plan: Plan,
  resource:
    | "customers"
    | "leads"
    | "jobs"
    | "quotes"
    | "invoices"
    | "aiFollowUpsPerMonth"
) {
  return getPlanLimits(plan)[resource];
}