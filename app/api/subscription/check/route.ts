import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkFeatureAccess,
  type Feature,
} from "@/lib/subscription-access";

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

    const validFeatures: Feature[] = [
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
      !validFeatures.includes(feature)
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

    /*
     * Read the user's Supabase access token
     * from the Authorization header.
     */
    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
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

    const accessToken =
      authorization.replace(
        /^Bearer\s+/i,
        ""
      ).trim();

    if (!accessToken) {
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

    /*
     * Use the Supabase service-role client only
     * on the server to validate the user's token.
     */
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error(
        "Supabase server configuration is missing."
      );
    }

    const supabase =
      createClient(
        url,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * Explicitly validate the access token.
     */
    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      console.error(
        "Subscription authentication error:",
        userError
      );

      return NextResponse.json(
        {
          allowed: false,
          code: "UNAUTHENTICATED",
          error:
            "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    /*
     * Check the requested subscription feature.
     */
    const access =
      await checkFeatureAccess(
        user.id,
        feature,
        {
          businessId,
        }
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
        code:
          "SUBSCRIPTION_CHECK_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify subscription access.",
      },
      { status: 500 }
    );
  }
}