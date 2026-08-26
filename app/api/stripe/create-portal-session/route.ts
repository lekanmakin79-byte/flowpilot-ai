import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

function getSupabaseAdmin() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getAuthenticatedUser(
  request: Request
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return null;
  }

  const token =
    authorization.substring(7).trim();

  if (!token) {
    return null;
  }

  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (error || !user) {
    return null;
  }

  return user;
}

export async function POST(
  request: Request
) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await supabase
        .from("subscriptions")
        .select(
          "stripe_customer_id, stripe_subscription_id, status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "Subscription lookup error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load your subscription.",
        },
        {
          status: 500,
        }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "No subscription found for this account.",
        },
        {
          status: 404,
        }
      );
    }

    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "Stripe customer information is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const portalSession =
      await stripe.billingPortal.sessions.create(
        {
          customer:
            subscription.stripe_customer_id,

          return_url:
            `${origin}/dashboard`,
        }
      );

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error(
      "Stripe customer portal error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to open Stripe Customer Portal.",
      },
      {
        status: 500,
      }
    );
  }
}
