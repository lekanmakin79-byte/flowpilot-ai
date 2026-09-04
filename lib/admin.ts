import "server-only";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_USER_ID = "dac45085-4903-4db1-bd77-e299997c0dc1";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createSupabaseAdminClient(
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

export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.id !== ADMIN_USER_ID) {
    redirect("/dashboard");
  }

  return user;
}

export async function getAdminDashboardData() {
  const supabase = getSupabaseAdmin();

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [
    usersResult,
    businessesResult,
    subscriptionsResult,
    aiUsageResult,
    aiFollowUpsResult,
  ] = await Promise.all([
    supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),

    supabase
      .from("businesses")
      .select(
        "id, owner_id, business_name, business_type"
      )
      .order("business_name", {
        ascending: true,
      }),

    supabase
      .from("subscriptions")
      .select(
        "user_id, plan, status, current_period_end, cancel_at_period_end, cancel_at, stripe_customer_id"
      )
      .order("status", {
        ascending: true,
      }),

    supabase
      .from("ai_usage")
      .select(
        "id, user_id, feature, created_at"
      )
      .gte(
        "created_at",
        startOfMonth.toISOString()
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("ai_usage")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("feature", [
        "ai_follow_up",
        "quote_follow_up",
      ])
      .gte(
        "created_at",
        startOfMonth.toISOString()
      ),
  ]);

  if (usersResult.error) {
    throw new Error(
      `Unable to load users: ${usersResult.error.message}`
    );
  }

  if (businessesResult.error) {
    throw new Error(
      `Unable to load businesses: ${businessesResult.error.message}`
    );
  }

  if (subscriptionsResult.error) {
    throw new Error(
      `Unable to load subscriptions: ${subscriptionsResult.error.message}`
    );
  }

  if (aiUsageResult.error) {
    throw new Error(
      `Unable to load AI usage: ${aiUsageResult.error.message}`
    );
  }

  if (aiFollowUpsResult.error) {
    throw new Error(
      `Unable to load AI follow-ups: ${aiFollowUpsResult.error.message}`
    );
  }

  const users = usersResult.data.users ?? [];
  const businesses = businessesResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const aiUsage = aiUsageResult.data ?? [];

  const emailByUserId = new Map(
    users.map((user) => [
      user.id,
      user.email ?? "No email",
    ])
  );

  const professionalSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.plan === "professional"
    );

  const activeProfessionalSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.plan === "professional" &&
        (
          subscription.status === "active" ||
          subscription.status === "trialing"
        )
    );

  return {
    users,
    businesses,
    subscriptions,
    aiUsage,
    aiFollowUpsThisMonth:
      aiFollowUpsResult.count ?? 0,
    emailByUserId,
    professionalSubscriptions,
    activeProfessionalSubscriptions,
    billingEnabled: false,
    startOfMonth,
  };
}