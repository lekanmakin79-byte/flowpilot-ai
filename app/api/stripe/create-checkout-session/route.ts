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
        { status: 500 }
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
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const plan =
      body?.plan;

    if (
      plan !== "professional"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid subscription plan.",
        },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get(
        "origin"
      ) ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    /*
     * IMPORTANT:
     *
     * We will create the £19/month
     * Stripe Price separately in Stripe.
     *
     * The Price ID will be stored
     * in STRIPE_PROFESSIONAL_PRICE_ID.
     */

    const priceId =
      process.env
        .STRIPE_PROFESSIONAL_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "Professional subscription price is not configured.",
        },
        { status: 500 }
      );
    }

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "subscription",

          customer_email:
            user.email || undefined,

          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],

          success_url:
            `${origin}/dashboard?subscription=success`,

          cancel_url:
            `${origin}/pricing?subscription=cancelled`,

          metadata: {
            user_id: user.id,
            plan: "professional",
          },

          subscription_data: {
            metadata: {
              user_id: user.id,
              plan: "professional",
            },
          },
        }
      );

    if (!session.url) {
      return NextResponse.json(
        {
          error:
            "Unable to create Stripe Checkout session.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error: any) {
    console.error(
      "Stripe checkout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to start Stripe Checkout.",
      },
      { status: 500 }
    );
  }
}