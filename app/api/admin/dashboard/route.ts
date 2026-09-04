import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

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

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.substring("Bearer ".length).trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.id !== ADMIN_USER_ID) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

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

    const [
      usersResult,
      businessesResult,
      subscriptionsResult,
      aiUsageResult,
    ] = await Promise.all([
      admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),

      admin
        .from("businesses")
        .select(
          "id, business_name, business_type, owner_id"
        )
        .order("business_name", {
          ascending: true,
        }),

      admin
        .from("subscriptions")
        .select("plan, status"),

      admin
        .from("ai_usage")
        .select("id", {
          count: "exact",
          head: true,
        })
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

    const users = (usersResult.data.users ?? [])
      .map((item) => ({
        id: item.id,
        email: item.email ?? "",
        created_at: item.created_at,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

    const businesses =
      businessesResult.data ?? [];

    const subscriptions =
      subscriptionsResult.data ?? [];

    const activeSubscriptions =
      subscriptions.filter(
        (item) =>
          item.status === "active" ||
          item.status === "trialing"
      ).length;

    const professionalSubscriptions =
      subscriptions.filter(
        (item) =>
          item.plan === "professional" &&
          (
            item.status === "active" ||
            item.status === "trialing"
          )
      ).length;

    const businessSubscriptions =
      subscriptions.filter(
        (item) =>
          item.plan === "business" &&
          (
            item.status === "active" ||
            item.status === "trialing"
          )
      ).length;

    return NextResponse.json({
      admin: {
        id: user.id,
        email: user.email ?? "",
      },

      users,

      businesses,

      subscriptions,

      aiUsageCount:
        aiUsageResult.count ?? 0,

      activeSubscriptions,

      professionalSubscriptions,

      businessSubscriptions,

      billingEnabled: false,

      startOfMonth:
        startOfMonth.toISOString(),
    });
  } catch (error) {
    console.error(
      "Admin dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admin dashboard.",
      },
      { status: 500 }
    );
  }
}