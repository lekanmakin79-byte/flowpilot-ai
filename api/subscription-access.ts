import "server-only";

import { createClient } from "@supabase/supabase-js";

export type Feature =
  | "ai_follow_up"
  | "ai_assistant"
  | "customer"
  | "lead"
  | "job"
  | "quote"
  | "invoice";

export type SubscriptionPlan =
  | "free"
  | "professional"
  | "business";

export type AccessCode =
  | "ALLOWED"
  | "FREE_LIMIT_REACHED"
  | "AI_FREE_LIMIT_REACHED"
  | "UNAUTHENTICATED"
  | "INVALID_FEATURE"
  | "INVALID_BUSINESS"
  | "BUSINESS_ACCESS_DENIED"
  | "BUSINESS_LOOKUP_ERROR"
  | "SUBSCRIPTION_LOOKUP_ERROR"
  | "SERVER_CONFIGURATION_ERROR";

export interface FeatureAccessResult {
  allowed: boolean;
  code: AccessCode;
  plan: SubscriptionPlan;
  limit?: number;
  current?: number;
  remaining?: number;
  error?: string;
}

/*
 * ---------------------------------------------------------
 * BILLING STATUS
 * ---------------------------------------------------------
 *
 * Monetisation is intentionally paused.
 *
 * While billing is disabled:
 * - Everyone is treated as Free.
 * - Existing Stripe subscriptions do NOT grant paid access.
 * - Professional/Business access remains dormant.
 * - Stripe infrastructure can be re-enabled later.
 *
 * To resume monetisation later, change this to true.
 * ---------------------------------------------------------
 */

const BILLING_ENABLED = false;

/*
 * ---------------------------------------------------------
 * FREE PLAN LIMITS
 * ---------------------------------------------------------
 */

const FREE_LIMITS: Record<
  "customer" | "lead" | "job" | "quote" | "invoice",
  number
> = {
  customer: 5,
  lead: 5,
  job: 5,
  quote: 5,
  invoice: 5,
};

const FREE_AI_FOLLOW_UP_LIMIT = 3;

/*
 * ---------------------------------------------------------
 * AI FEATURES
 * ---------------------------------------------------------
 */

const AI_FEATURES: Feature[] = [
  "ai_follow_up",
  "ai_assistant",
];

const VALID_FEATURES: Feature[] = [
  "ai_follow_up",
  "ai_assistant",
  "customer",
  "lead",
  "job",
  "quote",
  "invoice",
];

/*
 * ---------------------------------------------------------
 * SUPABASE ADMIN CLIENT
 * ---------------------------------------------------------
 */

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
 * ---------------------------------------------------------
 * BUSINESS OWNERSHIP
 * ---------------------------------------------------------
 */

async function verifyBusinessOwnership(
  userId: string,
  businessId: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Business ownership lookup error:",
        error
      );

      return {
        valid: false,
        error:
          "Unable to verify business ownership.",
      };
    }

    if (!data) {
      return {
        valid: false,
        error:
          "You do not have access to this business.",
      };
    }

    return {
      valid: true,
    };
  } catch (error) {
    console.error(
      "Business ownership verification error:",
      error
    );

    return {
      valid: false,
      error:
        "Unable to verify business ownership.",
    };
  }
}

/*
 * ---------------------------------------------------------
 * SUBSCRIPTION LOOKUP
 * ---------------------------------------------------------
 */

async function getEffectivePlan(
  userId: string
): Promise<{
  plan: SubscriptionPlan;
  status: string | null;
}> {
  /*
   * Billing is paused.
   *
   * Always return Free regardless of any existing
   * Stripe/test subscription in the database.
   */

  if (!BILLING_ENABLED) {
    return {
      plan: "free",
      status: null,
    };
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "plan,status,current_period_end,cancel_at_period_end"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Subscription lookup error:",
        error
      );

      throw new Error(
        "Unable to retrieve subscription information."
      );
    }

    if (!data) {
      return {
        plan: "free",
        status: null,
      };
    }

    const paidStatus =
      data.status === "active" ||
      data.status === "trialing" ||
      data.status === "past_due";

    const paidPlan =
      data.plan === "professional" ||
      data.plan === "business";

    if (paidPlan && paidStatus) {
      return {
        plan: data.plan as SubscriptionPlan,
        status: data.status,
      };
    }

    return {
      plan: "free",
      status: data.status ?? null,
    };
  } catch (error) {
    console.error(
      "Effective subscription lookup error:",
      error
    );

    throw error;
  }
}

/*
 * ---------------------------------------------------------
 * AI FOLLOW-UP MONTHLY USAGE
 * ---------------------------------------------------------
 *
 * The AI Follow-Up route records successful usage using:
 *
 *   feature = "quote_follow_up"
 *
 * We therefore count both the current feature name and
 * the recorded quote_follow_up name.
 * ---------------------------------------------------------
 */

async function getCurrentMonthAiFollowUpUsage(
  userId: string
): Promise<number> {
  const supabase = getSupabaseAdmin();

  const now = new Date();

  const startOfMonth = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0,
      0,
      0,
      0
    )
  );

  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .in("feature", [
      "ai_follow_up",
      "quote_follow_up",
    ])
    .gte(
      "created_at",
      startOfMonth.toISOString()
    );

  if (error) {
    console.error(
      "AI usage lookup error:",
      error
    );

    throw new Error(
      "Unable to check AI usage."
    );
  }

  return count ?? 0;
}

/*
 * ---------------------------------------------------------
 * FEATURE ACCESS
 * ---------------------------------------------------------
 */

export async function checkFeatureAccess(
  userId: string,
  feature: Feature,
  options?: {
    businessId?: string;
  }
): Promise<FeatureAccessResult> {
  /*
   * Authentication check.
   */

  if (!userId) {
    return {
      allowed: false,
      code: "UNAUTHENTICATED",
      plan: "free",
      error:
        "You must be signed in to use this feature.",
    };
  }

  /*
   * Feature validation.
   */

  if (!VALID_FEATURES.includes(feature)) {
    return {
      allowed: false,
      code: "INVALID_FEATURE",
      plan: "free",
      error:
        "The requested feature is not valid.",
    };
  }

  /*
   * Business ownership validation.
   */

  if (options?.businessId) {
    const ownership =
      await verifyBusinessOwnership(
        userId,
        options.businessId
      );

    if (!ownership.valid) {
      return {
        allowed: false,
        code: "BUSINESS_ACCESS_DENIED",
        plan: "free",
        error:
          ownership.error ||
          "You do not have access to this business.",
      };
    }
  }

  /*
   * Determine effective plan.
   *
   * With billing paused, this always returns Free.
   */

  let plan: SubscriptionPlan;

  try {
    const subscription =
      await getEffectivePlan(userId);

    plan = subscription.plan;
  } catch {
    return {
      allowed: false,
      code: "SUBSCRIPTION_LOOKUP_ERROR",
      plan: "free",
      error:
        "Unable to determine your subscription status.",
    };
  }

  /*
   * -------------------------------------------------------
   * PROFESSIONAL / BUSINESS
   * -------------------------------------------------------
   *
   * These plans remain available in the codebase for
   * future monetisation, but are dormant while billing
   * is paused.
   */

  if (
    BILLING_ENABLED &&
    (plan === "professional" ||
      plan === "business")
  ) {
    return {
      allowed: true,
      code: "ALLOWED",
      plan,
      limit: Infinity,
      current: 0,
      remaining: Infinity,
    };
  }

  /*
   * -------------------------------------------------------
   * AI ASSISTANT
   * -------------------------------------------------------
   *
   * The AI Assistant is available to Free users.
   *
   * It is intentionally not subject to the
   * AI Follow-Up monthly limit.
   */

  if (feature === "ai_assistant") {
    return {
      allowed: true,
      code: "ALLOWED",
      plan: "free",
    };
  }

  /*
   * -------------------------------------------------------
   * AI FOLLOW-UP
   * -------------------------------------------------------
   *
   * Free users receive 3 successful AI follow-ups
   * per calendar month.
   */

  if (feature === "ai_follow_up") {
    try {
      const current =
        await getCurrentMonthAiFollowUpUsage(
          userId
        );

      const remaining =
        Math.max(
          FREE_AI_FOLLOW_UP_LIMIT - current,
          0
        );

      if (
        current >= FREE_AI_FOLLOW_UP_LIMIT
      ) {
        return {
          allowed: false,
          code: "AI_FREE_LIMIT_REACHED",
          plan: "free",
          limit:
            FREE_AI_FOLLOW_UP_LIMIT,
          current,
          remaining: 0,
          error:
            "You have reached your Free plan limit of 3 AI follow-ups this month.",
        };
      }

      return {
        allowed: true,
        code: "ALLOWED",
        plan: "free",
        limit:
          FREE_AI_FOLLOW_UP_LIMIT,
        current,
        remaining,
      };
    } catch {
      return {
        allowed: false,
        code: "SUBSCRIPTION_LOOKUP_ERROR",
        plan: "free",
        error:
          "Unable to check your AI usage limit.",
      };
    }
  }

  /*
   * -------------------------------------------------------
   * RECORD-BASED FREE LIMITS
   * -------------------------------------------------------
   */

  if (
    feature === "customer" ||
    feature === "lead" ||
    feature === "job" ||
    feature === "quote" ||
    feature === "invoice"
  ) {
    if (!options?.businessId) {
      return {
        allowed: false,
        code: "INVALID_BUSINESS",
        plan: "free",
        error:
          "A business ID is required for this feature.",
      };
    }

    const limit = FREE_LIMITS[feature];

    try {
      const supabase =
        getSupabaseAdmin();

      const tableMap: Record<
        typeof feature,
        string
      > = {
        customer: "customers",
        lead: "leads",
        job: "jobs",
        quote: "quotes",
        invoice: "invoices",
      };

      const table =
        tableMap[feature];

      const { count, error } =
        await supabase
          .from(table)
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "business_id",
            options.businessId
          );

      if (error) {
        console.error(
          `${feature} usage lookup error:`,
          error
        );

        return {
          allowed: false,
          code: "SUBSCRIPTION_LOOKUP_ERROR",
          plan: "free",
          error:
            "Unable to check your usage limit.",
        };
      }

      const current = count ?? 0;

      const remaining =
        Math.max(limit - current, 0);

      if (current >= limit) {
        return {
          allowed: false,
          code: "FREE_LIMIT_REACHED",
          plan: "free",
          limit,
          current,
          remaining: 0,
          error:
            `You have reached the Free plan limit of ${limit} ${feature} records. Professional access will be available when paid plans are activated.`,
        };
      }

      return {
        allowed: true,
        code: "ALLOWED",
        plan: "free",
        limit,
        current,
        remaining,
      };
    } catch (error) {
      console.error(
        `${feature} access check error:`,
        error
      );

      return {
        allowed: false,
        code: "SUBSCRIPTION_LOOKUP_ERROR",
        plan: "free",
        error:
          "Unable to check your usage limit.",
      };
    }
  }

  /*
   * Fallback.
   */

  return {
    allowed: false,
    code: "INVALID_FEATURE",
    plan: "free",
    error:
      "This feature is not currently available.",
  };
}

/*
 * ---------------------------------------------------------
 * AI HELPERS
 * ---------------------------------------------------------
 */

export async function canUseAiAssistant(
  userId: string
): Promise<FeatureAccessResult> {
  return checkFeatureAccess(
    userId,
    "ai_assistant"
  );
}

export async function canUseAiFollowUp(
  userId: string
): Promise<FeatureAccessResult> {
  return checkFeatureAccess(
    userId,
    "ai_follow_up"
  );
}

/*
 * ---------------------------------------------------------
 * AI USAGE RECORDING
 * ---------------------------------------------------------
 *
 * This is intentionally defensive.
 *
 * A successful AI response must not fail simply because
 * the usage-recording operation encounters an error.
 * ---------------------------------------------------------
 */

export async function recordAiUsage(
  userId: string,
  feature: string
): Promise<void> {
  if (!userId) {
    return;
  }

  try {
    const supabase =
      getSupabaseAdmin();

    const { error } =
      await supabase
        .from("ai_usage")
        .insert({
          user_id: userId,
          feature,
        });

    if (error) {
      console.error(
        "Failed to record AI usage:",
        error
      );
    }
  } catch (error) {
    console.error(
      "AI usage recording exception:",
      error
    );
  }
}

/*
 * ---------------------------------------------------------
 * INVOICE ACCESS
 * ---------------------------------------------------------
 */

export async function checkInvoiceAccess(
  businessId: string,
  userId: string
): Promise<FeatureAccessResult> {
  return checkFeatureAccess(
    userId,
    "invoice",
    {
      businessId,
    }
  );
}