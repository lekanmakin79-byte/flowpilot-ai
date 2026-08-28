import { NextResponse } from "next/server";
import { checkFeatureAccess } from "@/lib/subscription-access";
import type { Feature } from "@/lib/subscription-access";
import { VALID_FEATURES } from "@/lib/subscription-access";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request
) {
  try {
    /*
     * ---------------------------------------------------------------
     * READ REQUEST BODY
     * ---------------------------------------------------------------
     */

    const body =
      await request.json();

    const feature =
      body?.feature as
        | Feature
        | undefined;

    const businessId =
      body?.businessId as
        | string
        | undefined;

    /*
     * ---------------------------------------------------------------
     * FEATURE VALIDATION
     * ---------------------------------------------------------------
     */

    if (
      !feature ||
      !VALID_FEATURES.includes(
        feature
      )
    ) {
      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          limit: null,
          current: 0,
          remaining: null,
          code: "INVALID_FEATURE",
          error:
            "Invalid subscription feature.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * AUTHORIZATION HEADER
     * ---------------------------------------------------------------
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          limit: null,
          current: 0,
          remaining: null,
          code: "UNAUTHENTICATED",
          error:
            "You must be signed in to continue.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * ACCESS TOKEN
     * ---------------------------------------------------------------
     */

    const accessToken =
      authorization
        .replace(
          /^Bearer\s+/i,
          ""
        )
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          limit: null,
          current: 0,
          remaining: null,
          code: "UNAUTHENTICATED",
          error:
            "You must be signed in to continue.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * SERVER SUPABASE CONFIGURATION
     * ---------------------------------------------------------------
     */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Missing Supabase server configuration."
      );

      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          limit: null,
          current: 0,
          remaining: null,
          code:
            "SERVER_CONFIGURATION_ERROR",
          error:
            "Subscription service is not configured correctly.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * SERVER SUPABASE CLIENT
     * ---------------------------------------------------------------
     */

    const {
      createClient,
    } = await import(
      "@supabase/supabase-js"
    );

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * ---------------------------------------------------------------
     * VERIFY AUTHENTICATED USER
     * ---------------------------------------------------------------
     */

    const {
      data: {
        user,
      },
      error:
        userError,
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
          plan: "free",
          limit: null,
          current: 0,
          remaining: null,
          code:
            "UNAUTHENTICATED",
          error:
            "Your session has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * BUSINESS VALIDATION
     * ---------------------------------------------------------------
     *
     * AI features DO NOT require businessId.
     *
     * Record features DO require businessId.
     *
     * checkFeatureAccess() performs the final ownership check.
     *
     * ---------------------------------------------------------------
     */

    const isAIFeature =
      feature ===
        "ai_follow_up" ||
      feature ===
        "ai_assistant";

    if (
      !isAIFeature &&
      (
        !businessId ||
        typeof businessId !== "string"
      )
    ) {
      return NextResponse.json(
        {
          allowed: false,
          plan: "free",
          limit: null,
          current: 0,
          remaining: null,
          code:
            "INVALID_BUSINESS",
          error:
            "Business information is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * FINAL ACCESS CHECK
     * ---------------------------------------------------------------
     */

    const access =
      await checkFeatureAccess(
        user.id,
        feature,
        {
          businessId:
            businessId ||
            undefined,
        }
      );

    /*
     * ---------------------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------------------
     */

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
        plan: "free",
        limit: null,
        current: 0,
        remaining: null,
        code:
          "SUBSCRIPTION_LOOKUP_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify subscription access.",
      },
      {
        status: 500,
      }
    );
  }
}