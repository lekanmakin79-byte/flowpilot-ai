import { createClient } from "@supabase/supabase-js";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

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
  | "UNAUTHENTICATED"
  | "INVALID_FEATURE"
  | "INVALID_BUSINESS"
  | "BUSINESS_ACCESS_DENIED"
  | "BUSINESS_LOOKUP_ERROR"
  | "SUBSCRIPTION_LOOKUP_ERROR"
  | "SERVER_CONFIGURATION_ERROR";

export interface SubscriptionAccessResult {
  allowed: boolean;
  plan: SubscriptionPlan;
  limit: number | null;
  current: number;
  remaining: number | null;
  code: AccessCode;
  error?: string;
}

/*
|--------------------------------------------------------------------------
| FREE PLAN LIMITS
|--------------------------------------------------------------------------
|
| These limits are per business.
|
| Professional and Business plans are unlimited for
| record-based features.
|
|--------------------------------------------------------------------------
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

/*
|--------------------------------------------------------------------------
| AI FEATURES
|--------------------------------------------------------------------------
|
| AI features are currently available only to paid plans.
|
|--------------------------------------------------------------------------
*/

const AI_FEATURES: Feature[] = [
  "ai_follow_up",
  "ai_assistant",
];

export const VALID_FEATURES: Feature[] = [
  "ai_follow_up",
  "ai_assistant",
  "customer",
  "lead",
  "job",
  "quote",
  "invoice",
];

/*
|--------------------------------------------------------------------------
| SERVER SUPABASE CLIENT
|--------------------------------------------------------------------------
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
|--------------------------------------------------------------------------
| NORMALISE PLAN
|--------------------------------------------------------------------------
*/

function normalisePlan(
  value: unknown
): SubscriptionPlan {
  if (
    value === "professional" ||
    value === "business"
  ) {
    return value;
  }

  return "free";
}

/*
|--------------------------------------------------------------------------
| DETERMINE WHETHER SUBSCRIPTION IS ACTIVE
|--------------------------------------------------------------------------
|
| active:
|   Fully active subscription.
|
| trialing:
|   Subscription is in a trial and should have paid-plan access.
|
| past_due:
|   We deliberately keep access while Stripe retries payment.
|
| canceled / unpaid / incomplete / incomplete_expired:
|   No paid access.
|
|--------------------------------------------------------------------------
*/

function hasPaidSubscriptionAccess(
  status: string | null | undefined
) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
}

/*
|--------------------------------------------------------------------------
| CHECK FEATURE ACCESS
|--------------------------------------------------------------------------
*/

export async function checkFeatureAccess(
  userId: string,
  feature: Feature,
  options?: {
    businessId?: string;
  }
): Promise<SubscriptionAccessResult> {
  /*
   * --------------------------------------------------------------
   * BASIC VALIDATION
   * --------------------------------------------------------------
   */

  if (
    !userId ||
    typeof userId !== "string"
  ) {
    return {
      allowed: false,
      plan: "free",
      limit: null,
      current: 0,
      remaining: null,
      code: "UNAUTHENTICATED",
      error:
        "You must be signed in to continue.",
    };
  }

  const validFeatures: Feature[] = [
    "ai_follow_up",
    "ai_assistant",
    "customer",
    "lead",
    "job",
    "quote",
    "invoice",
  ];

  if (!validFeatures.includes(feature)) {
    return {
      allowed: false,
      plan: "free",
      limit: null,
      current: 0,
      remaining: null,
      code: "INVALID_FEATURE",
      error:
        "Invalid subscription feature.",
    };
  }

  /*
   * --------------------------------------------------------------
   * BUSINESS VALIDATION
   * --------------------------------------------------------------
   *
   * Record-based features require a business ID.
   *
   * AI features do not require a business ID here because
   * their access is determined from the user's subscription.
   * --------------------------------------------------------------
   */

  const requiresBusiness =
    !AI_FEATURES.includes(feature);

  if (
    requiresBusiness &&
    (
      !options?.businessId ||
      typeof options.businessId !== "string"
    )
  ) {
    return {
      allowed: false,
      plan: "free",
      limit: null,
      current: 0,
      remaining: null,
      code: "INVALID_BUSINESS",
      error:
        "Business information is required.",
    };
  }

  /*
   * --------------------------------------------------------------
   * SUPABASE
   * --------------------------------------------------------------
   */

  let supabase;

  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    console.error(
      "Subscription Supabase configuration error:",
      error
    );

    return {
      allowed: false,
      plan: "free",
      limit: null,
      current: 0,
      remaining: null,
      code: "SERVER_CONFIGURATION_ERROR",
      error:
        "Subscription service is not configured correctly.",
    };
  }

  /*
   * --------------------------------------------------------------
   * BUSINESS OWNERSHIP
   * --------------------------------------------------------------
   *
   * Never trust a business ID supplied by the browser.
   * Verify that it belongs to the authenticated user.
   * --------------------------------------------------------------
   */

  if (
    requiresBusiness &&
    options?.businessId
  ) {
    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select("id")
      .eq(
        "id",
        options.businessId
      )
      .eq(
        "owner_id",
        userId
      )
      .maybeSingle();

    if (businessError) {
      console.error(
        "Business ownership lookup error:",
        businessError
      );

      return {
        allowed: false,
        plan: "free",
        limit: null,
        current: 0,
        remaining: null,
        code: "BUSINESS_LOOKUP_ERROR",
        error:
          "Unable to verify your business.",
      };
    }

    if (!business) {
      return {
        allowed: false,
        plan: "free",
        limit: null,
        current: 0,
        remaining: null,
        code: "BUSINESS_ACCESS_DENIED",
        error:
          "You do not have access to this business.",
      };
    }
  }

  /*
   * --------------------------------------------------------------
   * SUBSCRIPTION
   * --------------------------------------------------------------
   */

  const {
    data: subscription,
    error: subscriptionError,
  } = await supabase
    .from("subscriptions")
    .select(
      `
        plan,
        status,
        current_period_end,
        cancel_at_period_end
      `
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (subscriptionError) {
    console.error(
      "Subscription lookup error:",
      subscriptionError
    );

    return {
      allowed: false,
      plan: "free",
      limit: null,
      current: 0,
      remaining: null,
      code: "SUBSCRIPTION_LOOKUP_ERROR",
      error:
        "Unable to verify your subscription.",
    };
  }

  /*
   * --------------------------------------------------------------
   * DETERMINE PLAN
   * --------------------------------------------------------------
   */

  const paidSubscription =
    subscription &&
    hasPaidSubscriptionAccess(
      subscription.status
    );

  const plan: SubscriptionPlan =
    paidSubscription
      ? normalisePlan(
          subscription.plan
        )
      : "free";

  /*
   * --------------------------------------------------------------
   * PAID PLANS
   * --------------------------------------------------------------
   *
   * Professional and Business users have unlimited access
   * to record-based and AI features.
   * --------------------------------------------------------------
   */

  if (
    plan === "professional" ||
    plan === "business"
  ) {
    return {
      allowed: true,
      plan,
      limit: null,
      current: 0,
      remaining: null,
      code: "ALLOWED",
    };
  }

  /*
   * --------------------------------------------------------------
   * AI FEATURES ON FREE PLAN
   * --------------------------------------------------------------
   */

  if (
    AI_FEATURES.includes(feature)
  ) {
    return {
      allowed: false,
      plan: "free",
      limit: null,
      current: 0,
      remaining: null,
      code: "FREE_LIMIT_REACHED",
      error:
        "This AI feature requires a Professional or Business subscription.",
    };
  }

  /*
   * --------------------------------------------------------------
   * FREE RECORD LIMIT
   * --------------------------------------------------------------
   */

  const limit =
    FREE_LIMITS[
      feature as
        | "customer"
        | "lead"
        | "job"
        | "quote"
        | "invoice"
    ];

  if (!options?.businessId) {
    return {
      allowed: false,
      plan: "free",
      limit,
      current: 0,
      remaining: 0,
      code: "INVALID_BUSINESS",
      error:
        "Business information is required.",
    };
  }

  /*
   * --------------------------------------------------------------
   * TABLE MAPPING
   * --------------------------------------------------------------
   */

  const tableMap: Record<
    "customer" | "lead" | "job" | "quote" | "invoice",
    string
  > = {
    customer: "customers",
    lead: "leads",
    job: "jobs",
    quote: "quotes",
    invoice: "invoices",
  };

  const table =
    tableMap[
      feature as
        | "customer"
        | "lead"
        | "job"
        | "quote"
        | "invoice"
    ];

  /*
   * --------------------------------------------------------------
   * COUNT CURRENT RECORDS
   * --------------------------------------------------------------
   */

  const {
    count,
    error: countError,
  } = await supabase
    .from(table)
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "business_id",
      options.businessId
    );

  if (countError) {
    console.error(
      `Unable to count ${feature} records:`,
      countError
    );

    return {
      allowed: false,
      plan: "free",
      limit,
      current: 0,
      remaining: null,
      code: "SUBSCRIPTION_LOOKUP_ERROR",
      error:
        `Unable to verify your ${feature} limit.`,
    };
  }

  const current =
    count ?? 0;

  const remaining =
    Math.max(
      limit - current,
      0
    );

  /*
   * --------------------------------------------------------------
   * LIMIT REACHED
   * --------------------------------------------------------------
   */

  if (
    current >= limit
  ) {
    return {
      allowed: false,
      plan: "free",
      limit,
      current,
      remaining: 0,
      code: "FREE_LIMIT_REACHED",
      error:
        `You have reached the Free plan limit of ${limit} ${feature}s. Upgrade to Professional for unlimited ${feature}s.`,
    };
  }

  /*
   * --------------------------------------------------------------
   * ACCESS GRANTED
   * --------------------------------------------------------------
   */

  return {
    allowed: true,
    plan: "free",
    limit,
    current,
    remaining,
    code: "ALLOWED",
  };
}

/*
|--------------------------------------------------------------------------
| AI ASSISTANT ACCESS
|--------------------------------------------------------------------------
|
| Compatibility helper used by:
|
| app/api/ai-assistant/route.ts
|
|--------------------------------------------------------------------------
*/

export async function canUseAiAssistant(
  userId: string
) {
  return checkFeatureAccess(
    userId,
    "ai_assistant"
  );
}

/*
|--------------------------------------------------------------------------
| AI FOLLOW-UP ACCESS
|--------------------------------------------------------------------------
|
| Compatibility helper used by:
|
| app/api/ai-follow-up/route.ts
|
|--------------------------------------------------------------------------
*/

export async function canUseAiFollowUp(
  userId: string
) {
  return checkFeatureAccess(
    userId,
    "ai_follow_up"
  );
}

/*
|--------------------------------------------------------------------------
| RECORD AI USAGE
|--------------------------------------------------------------------------
|
| This helper is intentionally defensive.
|
| The AI routes may call this after a successful AI request.
| If an ai_usage table exists, usage is recorded there.
|
| IMPORTANT:
| Usage recording must never turn a successful AI response
| into a failed request if the usage table is unavailable.
|
|--------------------------------------------------------------------------
*/

export async function recordAiUsage(
  userId: string,
  feature:
    | "ai_follow_up"
    | "ai_assistant"
    | "quote_follow_up" = "ai_follow_up"
) {
  try {
    const supabase =
      getSupabaseAdmin();

    const {
      error,
    } = await supabase
      .from("ai_usage")
      .insert({
        user_id: userId,
        feature,
      });

    if (error) {
      console.error(
        "AI usage recording error:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "AI usage recording failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record AI usage.",
    };
  }
}

/*
|--------------------------------------------------------------------------
| INVOICE ACCESS HELPER
|--------------------------------------------------------------------------
*/

export async function checkInvoiceAccess(
  businessId: string,
  userId: string
) {
  return checkFeatureAccess(
    userId,
    "invoice",
    {
      businessId,
    }
  );
}