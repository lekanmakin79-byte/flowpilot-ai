import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkFeatureAccess,
  type Feature,
} from "@/lib/subscription-access";

function getSupabaseServer() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase configuration is missing."
    );
  }

  return createClient(
    url,
    anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const feature =
      body?.feature as Feature;

    const businessId =
      body?.businessId as
        | string
        | undefined;

    const validFeatures: Feature[] =
      [
        "ai_follow_up",
        "ai_assistant",
        "customer",
        "lead",
        "job",
        "quote",
        "invoice",
      ];

    if (
      !feature ||
      !validFeatures.includes(
        feature
      )
    ) {
      return NextResponse.json(
        {
          allowed: false,
          code: "INVALID_FEATURE",
          error:
            "Invalid subscription feature.",
        },
        { status: 400 }
      );
    }

    const supabase =
      getSupabaseServer();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          allowed: false,
          code: "UNAUTHENTICATED",
          error:
            "You must be signed in to continue.",
        },
        { status: 401 }
      );
    }

    const access =
      await checkFeatureAccess(
        user.id,
        feature,
        { businessId }
      );

    return NextResponse.json(
      access
    );
  } catch (error) {
    console.error(
      "Subscription check API error:",
      error
    );

    return NextResponse.json(
      {
        allowed: false,
        code: "SUBSCRIPTION_CHECK_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify subscription access.",
      },
      { status: 500 }
    );
  }
}
