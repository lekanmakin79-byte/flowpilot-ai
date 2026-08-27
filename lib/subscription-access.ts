import "server-only";

import { createClient } from "@supabase/supabase-js";

export type Plan = "free" | "professional";

export type Feature =
  | "ai_follow_up"
  | "ai_assistant"
  | "customer"
  | "lead"
  | "job"
  | "quote"
  | "invoice";

export type AccessResult = {
  allowed: boolean;
  plan: Plan;
  limit: number | null;
  current: number;
  remaining: number | null;
  code?: string;
  error?: string;
};

const FREE_LIMITS: Record<
  Exclude<Feature, "ai_assistant">,
  number | null
> = {
  ai_follow_up: 3,
  customer: 25,
  lead: 25,
  job: 25,
  quote: 25,
  invoice: 25,
};

const PROFESSIONAL_LIMITS: Record<
  Feature,
  number | null
> = {
  ai_follow_up: null,
  ai_assistant: null,
  customer: null,
  lead: null,
  job: null,
  quote: null,
  invoice: null,
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

function isProfessionalStatus(
  plan: unknown,
  status: unknown
): boolean {
  return (
    plan === "professional" &&
    (status === "active" ||
      status === "trialing")
  );
}

export async function getUserPlan(
  userId: string
): Promise<Plan> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
        plan,
        status,
        current_period_end
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
      "Unable to verify your subscription."
    );
  }

  if (
    data &&
    isProfessionalStatus(
      data.plan,
      data.status
    )
  ) {
    return "professional";
  }

  return "free";
}

function getMonthStart(): string {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0,
      0,
      0,
      0
    )
  ).toISOString();
}

async function getAiUsageCount(
  userId: string,
  usageType: string
): Promise<number> {
  const supabase = getSupabaseAdmin();

  const monthStart = getMonthStart();

  const { count, error } = await supabase
    .from("ai_usage")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("usage_type", usageType)
    .gte("created_at", monthStart);

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

async function getRecordCount(
  userId: string,
  table: string,
  businessId?: string
): Promise<number> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    });

  /*
   * Records in FlowPilot are normally associated
   * with a business.
   *
   * Prefer business-level counting whenever
   * businessId is available.
   */
  if (businessId) {
    query = query.eq(
      "business_id",
      businessId
    );
  }

  /*
   * The userId argument is intentionally retained
   * because the access system is user-based.
   *
   * Business ownership is verified by the API
   * route before this function is called.
   */

  const { count, error } =
    await query;

  if (error) {
    console.error(
      `${table} count error:`,
      error
    );

    throw new Error(
      `Unable to check ${table} usage.`
    );
  }

  return count ?? 0;
}

function getLimitMessage(
  feature: Feature,
  limit: number
): string {
  const names: Record<
    Feature,
    string
  > = {
    ai_follow_up:
      "AI follow-ups",

    ai_assistant:
      "AI Assistant",

    customer:
      "customers",

    lead:
      "leads",

    job:
      "jobs",

    quote:
      "quotes",

    invoice:
      "invoices",
  };

  return `You have reached the Free plan limit of ${limit} ${names[feature]}. Upgrade to Professional for unlimited ${names[feature]}.`;
}

export async function checkFeatureAccess(
  userId: string,
  feature: Feature,
  options?: {
    businessId?: string;
  }
): Promise<AccessResult> {
  const plan =
    await getUserPlan(userId);

  /*
   * Professional users have unlimited access.
   */
  if (plan === "professional") {
    return {
      allowed: true,
      plan,
      limit:
        PROFESSIONAL_LIMITS[feature],
      current: 0,
      remaining: null,
    };
  }

  /*
   * AI Assistant is Professional-only.
   */
  if (feature === "ai_assistant") {
    return {
      allowed: false,
      plan,
      limit: 0,
      current: 0,
      remaining: 0,
      code: "PROFESSIONAL_REQUIRED",
      error:
        "The AI Assistant is available on the Professional plan. Upgrade to unlock it.",
    };
  }

  let current = 0;

  if (feature === "ai_follow_up") {
    current =
      await getAiUsageCount(
        userId,
        "quote_follow_up"
      );
  } else {
    const tableMap: Record<
      Exclude<
        Feature,
        | "ai_follow_up"
        | "ai_assistant"
      >,
      string
    > = {
      customer: "customers",
      lead: "leads",
      job: "jobs",
      quote: "quotes",
      invoice: "invoices",
    };

    current =
      await getRecordCount(
        userId,
        tableMap[feature],
        options?.businessId
      );
  }

  const limit =
    FREE_LIMITS[feature];

  if (
    limit !== null &&
    current >= limit
  ) {
    return {
      allowed: false,
      plan,
      limit,
      current,
      remaining: 0,
      code: "FREE_LIMIT_REACHED",
      error: getLimitMessage(
        feature,
        limit
      ),
    };
  }

  return {
    allowed: true,
    plan,
    limit,
    current,
    remaining:
      limit === null
        ? null
        : Math.max(
            0,
            limit - current
          ),
  };
}

export async function canUseAiFollowUp(
  userId: string
) {
  return checkFeatureAccess(
    userId,
    "ai_follow_up"
  );
}

export async function canUseAiAssistant(
  userId: string
) {
  return checkFeatureAccess(
    userId,
    "ai_assistant"
  );
}

export async function canCreateCustomer(
  userId: string,
  businessId?: string
) {
  return checkFeatureAccess(
    userId,
    "customer",
    { businessId }
  );
}

export async function canCreateLead(
  userId: string,
  businessId?: string
) {
  return checkFeatureAccess(
    userId,
    "lead",
    { businessId }
  );
}

export async function canCreateJob(
  userId: string,
  businessId?: string
) {
  return checkFeatureAccess(
    userId,
    "job",
    { businessId }
  );
}

export async function canCreateQuote(
  userId: string,
  businessId?: string
) {
  return checkFeatureAccess(
    userId,
    "quote",
    { businessId }
  );
}

export async function canCreateInvoice(
  userId: string,
  businessId?: string
) {
  return checkFeatureAccess(
    userId,
    "invoice",
    { businessId }
  );
}

export async function recordAiUsage(
  userId: string,
  usageType: string
): Promise<void> {
  const supabase =
    getSupabaseAdmin();

  const { error } =
    await supabase
      .from("ai_usage")
      .insert({
        user_id: userId,
        usage_type: usageType,
      });

  if (error) {
    console.error(
      "AI usage record error:",
      error
    );

    throw new Error(
      "Unable to record AI usage."
    );
  }
}