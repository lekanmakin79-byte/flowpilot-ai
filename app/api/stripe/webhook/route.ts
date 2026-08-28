import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| ENVIRONMENT VARIABLES
|--------------------------------------------------------------------------
*/

const stripeKey =
  process.env.STRIPE_SECRET_KEY;

const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

/*
|--------------------------------------------------------------------------
| STRIPE CLIENT
|--------------------------------------------------------------------------
*/

const stripe = stripeKey
  ? new Stripe(stripeKey)
  : null;

/*
|--------------------------------------------------------------------------
| SUPABASE ADMIN CLIENT
|--------------------------------------------------------------------------
|
| This client uses the service role key.
|
| IMPORTANT:
| Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
|
|--------------------------------------------------------------------------
*/

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    serviceKey,
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
| STRIPE CUSTOMER ID
|--------------------------------------------------------------------------
*/

function getCustomerId(
  customer:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string"
    ? customer
    : customer.id;
}

/*
|--------------------------------------------------------------------------
| STRIPE SUBSCRIPTION ID
|--------------------------------------------------------------------------
*/

function getSubscriptionId(
  subscription:
    | string
    | Stripe.Subscription
    | null
) {
  if (!subscription) {
    return null;
  }

  return typeof subscription === "string"
    ? subscription
    : subscription.id;
}

/*
|--------------------------------------------------------------------------
| STRIPE TIMESTAMP -> ISO DATE
|--------------------------------------------------------------------------
*/

function stripeTimestampToISO(
  timestamp:
    | number
    | null
    | undefined
) {
  if (!timestamp) {
    return null;
  }

  return new Date(
    timestamp * 1000
  ).toISOString();
}

/*
|--------------------------------------------------------------------------
| SUBSCRIPTION PERIOD INFORMATION
|--------------------------------------------------------------------------
|
| Stripe exposes subscription billing period information
| on the subscription item.
|
|--------------------------------------------------------------------------
*/

function getSubscriptionPeriod(
  subscription: Stripe.Subscription
) {
  const firstItem =
    subscription.items?.data?.[0];

  const currentPeriodStart =
    stripeTimestampToISO(
      firstItem?.current_period_start
    );

  const currentPeriodEnd =
    stripeTimestampToISO(
      firstItem?.current_period_end
    );

  return {
    currentPeriodStart,
    currentPeriodEnd,
  };
}

/*
|--------------------------------------------------------------------------
| DETERMINE WHETHER CANCELLATION IS SCHEDULED
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Stripe can represent a scheduled cancellation in
| more than one way.
|
| 1. cancel_at_period_end = true
|
| 2. cancel_at contains a future timestamp
|
| Therefore we check BOTH.
|
|--------------------------------------------------------------------------
*/

function isCancellationScheduled(
  subscription: Stripe.Subscription
) {
  /*
   * Standard Stripe cancellation-at-period-end flag.
   */

  if (
    subscription.cancel_at_period_end
  ) {
    return true;
  }

  /*
   * Stripe can also schedule cancellation
   * using cancel_at.
   */

  if (subscription.cancel_at) {
    const cancelAt =
      subscription.cancel_at * 1000;

    /*
     * Only consider it scheduled if the
     * cancellation timestamp is still in
     * the future.
     */

    if (
      cancelAt > Date.now()
    ) {
      return true;
    }
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| GET CANCELLATION DATE
|--------------------------------------------------------------------------
*/

function getCancellationDate(
  subscription: Stripe.Subscription
) {
  /*
   * Prefer Stripe's explicit cancel_at
   * timestamp when present.
   */

  if (subscription.cancel_at) {
    return stripeTimestampToISO(
      subscription.cancel_at
    );
  }

  /*
   * If Stripe is using cancel_at_period_end,
   * the effective cancellation date is the
   * current subscription period end.
   */

  if (
    subscription.cancel_at_period_end
  ) {
    const firstItem =
      subscription.items?.data?.[0];

    return stripeTimestampToISO(
      firstItem?.current_period_end
    );
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| RESOLVE USER ID
|--------------------------------------------------------------------------
|
| We try several sources:
|
| 1. Explicit userId passed to this function
| 2. Stripe subscription metadata
| 3. Existing Supabase subscription record
|
|--------------------------------------------------------------------------
*/

async function resolveUserId(
  supabase: ReturnType<
    typeof getSupabaseAdmin
  >,
  subscription: Stripe.Subscription,
  userId?: string | null
) {
  let resolvedUserId =
    userId ||
    subscription.metadata?.user_id ||
    null;

  /*
   * If Stripe metadata already contains
   * the user ID, use it immediately.
   */

  if (resolvedUserId) {
    return resolvedUserId;
  }

  /*
   * Fallback:
   * find the existing Supabase subscription
   * using Stripe's subscription ID.
   */

  const {
    data: existingSubscription,
    error,
  } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq(
      "stripe_subscription_id",
      subscription.id
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to find existing subscription:",
      error
    );

    throw error;
  }

  return (
    existingSubscription?.user_id ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| SAVE / SYNCHRONIZE SUBSCRIPTION
|--------------------------------------------------------------------------
|
| This is the main synchronization function.
|
| It keeps Supabase aligned with Stripe.
|
|--------------------------------------------------------------------------
*/

async function saveSubscription(
  supabase: ReturnType<
    typeof getSupabaseAdmin
  >,
  subscription: Stripe.Subscription,
  userId?: string | null
) {
  /*
   * ----------------------------------------------------
   * CUSTOMER
   * ----------------------------------------------------
   */

  const customerId =
    getCustomerId(
      subscription.customer
    );

  /*
   * ----------------------------------------------------
   * BILLING PERIOD
   * ----------------------------------------------------
   */

  const {
    currentPeriodStart,
    currentPeriodEnd,
  } =
    getSubscriptionPeriod(
      subscription
    );

  /*
   * ----------------------------------------------------
   * USER
   * ----------------------------------------------------
   */

  const resolvedUserId =
    await resolveUserId(
      supabase,
      subscription,
      userId
    );

  if (!resolvedUserId) {
    console.error(
      "Unable to determine user_id for Stripe subscription:",
      subscription.id
    );

    return;
  }

  /*
   * ----------------------------------------------------
   * PLAN
   * ----------------------------------------------------
   */

  const plan =
    subscription.metadata?.plan ||
    "professional";

  /*
   * ----------------------------------------------------
   * CANCELLATION STATE
   * ----------------------------------------------------
   */

  const cancellationScheduled =
    isCancellationScheduled(
      subscription
    );

  const cancellationDate =
    getCancellationDate(
      subscription
    );

  /*
   * ----------------------------------------------------
   * IMPORTANT CANCELLATION LOGGING
   * ----------------------------------------------------
   */

  console.log(
    "Stripe cancellation state:",
    {
      subscriptionId:
        subscription.id,

      cancelAtPeriodEnd:
        subscription.cancel_at_period_end,

      cancelAt:
        subscription.cancel_at,

      cancellationScheduled,

      cancellationDate,

      status:
        subscription.status,
    }
  );

  /*
   * ----------------------------------------------------
   * SUPABASE RECORD
   * ----------------------------------------------------
   */

  const subscriptionRecord = {
    user_id:
      resolvedUserId,

    stripe_customer_id:
      customerId,

    stripe_subscription_id:
      subscription.id,

    plan,

    status:
      subscription.status,

    current_period_start:
      currentPeriodStart,

    current_period_end:
      currentPeriodEnd,

    /*
     * IMPORTANT:
     *
     * We deliberately save the calculated
     * cancellation state here instead of
     * relying only on cancel_at_period_end.
     *
     * This handles the situation where Stripe
     * sends:
     *
     * cancel_at_period_end = false
     * cancel_at = future timestamp
     */

    cancel_at_period_end:
      cancellationScheduled,
  };

  /*
   * ----------------------------------------------------
   * UPSERT
   * ----------------------------------------------------
   */

  const {
    error,
  } = await supabase
    .from("subscriptions")
    .upsert(
      subscriptionRecord,
      {
        onConflict:
          "user_id",
      }
    );

  if (error) {
    console.error(
      "Subscription save error:",
      error
    );

    throw error;
  }

  /*
   * ----------------------------------------------------
   * SUCCESS LOG
   * ----------------------------------------------------
   */

  console.log(
    "Subscription synchronized:",
    {
      subscriptionId:
        subscription.id,

      userId:
        resolvedUserId,

      customerId,

      plan,

      status:
        subscription.status,

      currentPeriodStart,

      currentPeriodEnd,

      stripeCancelAtPeriodEnd:
        subscription.cancel_at_period_end,

      stripeCancelAt:
        subscription.cancel_at,

      savedCancelAtPeriodEnd:
        cancellationScheduled,

      cancellationDate,
    }
  );
}

/*
|--------------------------------------------------------------------------
| MARK SUBSCRIPTION AS FULLY CANCELLED
|--------------------------------------------------------------------------
|
| This function is used when Stripe sends:
|
| customer.subscription.deleted
|
| A scheduled cancellation should NOT reach this
| function until the subscription actually ends.
|
|--------------------------------------------------------------------------
*/

async function markSubscriptionCancelled(
  supabase: ReturnType<
    typeof getSupabaseAdmin
  >,
  subscription: Stripe.Subscription
) {
  /*
   * ----------------------------------------------------
   * USER ID FROM STRIPE METADATA
   * ----------------------------------------------------
   */

  const userId =
    subscription.metadata?.user_id ||
    null;

  /*
   * ----------------------------------------------------
   * FINAL PERIOD END
   * ----------------------------------------------------
   */

  const firstItem =
    subscription.items?.data?.[0];

  const currentPeriodEnd =
    stripeTimestampToISO(
      firstItem?.current_period_end
    );

  /*
   * ----------------------------------------------------
   * UPDATE BY USER ID
   * ----------------------------------------------------
   */

  if (userId) {
    const {
      error,
    } = await supabase
      .from("subscriptions")
      .update({
        status:
          "canceled",

        cancel_at_period_end:
          false,

        current_period_end:
          currentPeriodEnd,
      })
      .eq(
        "user_id",
        userId
      );

    if (error) {
      console.error(
        "Subscription cancellation update error:",
        error
      );

      throw error;
    }

    console.log(
      "Subscription marked fully canceled by user_id:",
      userId
    );

    return;
  }

  /*
   * ----------------------------------------------------
   * FALLBACK: STRIPE SUBSCRIPTION ID
   * ----------------------------------------------------
   */

  const {
    error,
  } = await supabase
    .from("subscriptions")
    .update({
      status:
        "canceled",

      cancel_at_period_end:
        false,

      current_period_end:
        currentPeriodEnd,
    })
    .eq(
      "stripe_subscription_id",
      subscription.id
    );

  if (error) {
    console.error(
      "Subscription cancellation update error:",
      error
    );

    throw error;
  }

  console.log(
    "Subscription marked fully canceled by subscription ID:",
    subscription.id
  );
}

/*
|--------------------------------------------------------------------------
| POST WEBHOOK
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request
) {
  try {
    /*
     * ==================================================
     * CHECK STRIPE CONFIGURATION
     * ==================================================
     */

    if (!stripe) {
      console.error(
        "STRIPE_SECRET_KEY is missing."
      );

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

    /*
     * ==================================================
     * CHECK WEBHOOK SECRET
     * ==================================================
     */

    if (!webhookSecret) {
      console.error(
        "STRIPE_WEBHOOK_SECRET is missing."
      );

      return NextResponse.json(
        {
          error:
            "Stripe webhook secret is missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ==================================================
     * READ RAW REQUEST BODY
     * ==================================================
     *
     * DO NOT use request.json().
     *
     * Stripe signature verification requires
     * the original raw request body.
     */

    const body =
      await request.text();

    /*
     * ==================================================
     * STRIPE SIGNATURE
     * ==================================================
     */

    const signature =
      request.headers.get(
        "stripe-signature"
      );

    if (!signature) {
      console.error(
        "Stripe signature header missing."
      );

      return NextResponse.json(
        {
          error:
            "Stripe signature missing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==================================================
     * VERIFY STRIPE WEBHOOK
     * ==================================================
     */

    let event: Stripe.Event;

    try {
      event =
        stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret
        );
    } catch (error) {
      console.error(
        "Stripe webhook signature verification failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Invalid webhook signature.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==================================================
     * CREATE SUPABASE ADMIN CLIENT
     * ==================================================
     */

    const supabase =
      getSupabaseAdmin();

    /*
     * ==================================================
     * WEBHOOK RECEIVED LOG
     * ==================================================
     */

    console.log(
      "=================================================="
    );

    console.log(
      "Stripe webhook received:"
    );

    console.log(
      {
        eventId:
          event.id,

        eventType:
          event.type,

        livemode:
          event.livemode,

        created:
          event.created,
      }
    );

    console.log(
      "=================================================="
    );

    /*
     * ==================================================
     * HANDLE STRIPE EVENT
     * ==================================================
     */

    switch (event.type) {
      /*
       * ==================================================
       * CHECKOUT SESSION COMPLETED
       * ==================================================
       *
       * This is the first point where we know the
       * customer completed checkout.
       *
       * ==================================================
       */

      case "checkout.session.completed": {
        const session =
          event.data.object as
            Stripe.Checkout.Session;

        /*
         * ------------------------------------------------
         * METADATA
         * ------------------------------------------------
         */

        const userId =
          session.metadata?.user_id ||
          null;

        const plan =
          session.metadata?.plan ||
          "professional";

        /*
         * ------------------------------------------------
         * STRIPE CUSTOMER
         * ------------------------------------------------
         */

        const customerId =
          getCustomerId(
            session.customer
          );

        /*
         * ------------------------------------------------
         * STRIPE SUBSCRIPTION
         * ------------------------------------------------
         */

        const subscriptionId =
          getSubscriptionId(
            session.subscription
          );

        /*
         * ------------------------------------------------
         * LOG
         * ------------------------------------------------
         */

        console.log(
          "Checkout session completed:",
          {
            sessionId:
              session.id,

            userId,

            customerId,

            subscriptionId,

            plan,
          }
        );

        /*
         * ------------------------------------------------
         * USER ID REQUIRED
         * ------------------------------------------------
         */

        if (!userId) {
          console.error(
            "Checkout session is missing user_id."
          );

          break;
        }

        /*
         * ------------------------------------------------
         * SUBSCRIPTION ID REQUIRED
         * ------------------------------------------------
         */

        if (!subscriptionId) {
          console.error(
            "Checkout session is missing subscription ID."
          );

          break;
        }

        /*
         * ------------------------------------------------
         * SAVE INITIAL SUBSCRIPTION
         * ------------------------------------------------
         *
         * The subsequent subscription.created /
         * subscription.updated events will synchronize
         * the complete Stripe subscription state.
         */

        const {
          error,
        } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id:
                userId,

              stripe_customer_id:
                customerId,

              stripe_subscription_id:
                subscriptionId,

              plan,

              status:
                "active",

              cancel_at_period_end:
                false,
            },
            {
              onConflict:
                "user_id",
            }
          );

        if (error) {
          console.error(
            "Checkout subscription save error:",
            error
          );
        } else {
          console.log(
            "Checkout subscription saved:",
            {
              subscriptionId,

              userId,

              plan,
            }
          );
        }

        break;
      }

      /*
       * ==================================================
       * SUBSCRIPTION CREATED
       * ==================================================
       */

      case "customer.subscription.created": {
        const subscription =
          event.data.object as
            Stripe.Subscription;

        const userId =
          subscription.metadata?.user_id ||
          null;

        await saveSubscription(
          supabase,
          subscription,
          userId
        );

        console.log(
          "Subscription created and synchronized:",
          subscription.id
        );

        break;
      }

      /*
       * ==================================================
       * SUBSCRIPTION UPDATED
       * ==================================================
       *
       * Handles:
       *
       * - cancellation requests
       * - cancel_at_period_end
       * - cancel_at
       * - cancellation reversals
       * - subscription renewals
       * - plan changes
       * - billing period changes
       * - payment status changes
       *
       * ==================================================
       */

      case "customer.subscription.updated": {
        const subscription =
          event.data.object as
            Stripe.Subscription;

        const userId =
          subscription.metadata?.user_id ||
          null;

        /*
         * ------------------------------------------------
         * DETAILED CANCELLATION LOG
         * ------------------------------------------------
         */

        console.log(
          "Subscription updated by Stripe:",
          {
            subscriptionId:
              subscription.id,

            userId,

            status:
              subscription.status,

            cancelAtPeriodEnd:
              subscription.cancel_at_period_end,

            cancelAt:
              subscription.cancel_at,

            cancellationScheduled:
              isCancellationScheduled(
                subscription
              ),

            cancellationDate:
              getCancellationDate(
                subscription
              ),
          }
        );

        /*
         * ------------------------------------------------
         * SYNCHRONIZE SUBSCRIPTION
         * ------------------------------------------------
         */

        await saveSubscription(
          supabase,
          subscription,
          userId
        );

        console.log(
          "Subscription updated and saved:",
          subscription.id
        );

        break;
      }

      /*
       * ==================================================
       * SUBSCRIPTION DELETED
       * ==================================================
       *
       * This means the subscription has actually ended.
       *
       * A customer who merely schedules cancellation
       * should NOT reach this state yet.
       *
       * Stripe sends customer.subscription.updated first.
       *
       * At that stage our code keeps:
       *
       * status = active
       *
       * cancel_at_period_end = true
       *
       * When the subscription actually ends,
       * Stripe sends customer.subscription.deleted.
       *
       * Then we change the status to canceled.
       *
       * ==================================================
       */

      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as
            Stripe.Subscription;

        console.log(
          "Stripe subscription deleted:",
          {
            subscriptionId:
              subscription.id,

            userId:
              subscription.metadata?.user_id ||
              null,

            status:
              subscription.status,

            cancelAt:
              subscription.cancel_at,

            cancelAtPeriodEnd:
              subscription.cancel_at_period_end,
          }
        );

        await markSubscriptionCancelled(
          supabase,
          subscription
        );

        console.log(
          "Subscription fully canceled in Supabase:",
          subscription.id
        );

        break;
      }

      /*
       * ==================================================
       * INVOICE PAYMENT FAILED
       * ==================================================
       */

      case "invoice.payment_failed": {
        const invoice =
          event.data.object as
            Stripe.Invoice;

        /*
         * ------------------------------------------------
         * FIND SUBSCRIPTION FROM INVOICE
         * ------------------------------------------------
         */

        const subscription =
          invoice.parent
            ?.subscription_details
            ?.subscription;

        const subscriptionId =
          typeof subscription ===
          "string"
            ? subscription
            : subscription?.id;

        /*
         * ------------------------------------------------
         * NO SUBSCRIPTION
         * ------------------------------------------------
         */

        if (!subscriptionId) {
          console.log(
            "Payment failed without subscription ID:",
            invoice.id
          );

          break;
        }

        /*
         * ------------------------------------------------
         * MARK PAST DUE
         * ------------------------------------------------
         */

        const {
          error,
        } = await supabase
          .from("subscriptions")
          .update({
            status:
              "past_due",
          })
          .eq(
            "stripe_subscription_id",
            subscriptionId
          );

        if (error) {
          console.error(
            "Payment failure subscription update error:",
            error
          );
        } else {
          console.log(
            "Subscription marked past_due:",
            subscriptionId
          );
        }

        break;
      }

      /*
       * ==================================================
       * INVOICE PAID
       * ==================================================
       *
       * A successful payment restores the subscription
       * status to active.
       *
       * IMPORTANT:
       *
       * We deliberately DO NOT modify
       * cancel_at_period_end here.
       *
       * Therefore a subscription scheduled for
       * cancellation can remain:
       *
       * status = active
       * cancel_at_period_end = true
       *
       * until it actually ends.
       *
       * ==================================================
       */

      case "invoice.paid": {
        const invoice =
          event.data.object as
            Stripe.Invoice;

        /*
         * ------------------------------------------------
         * FIND SUBSCRIPTION
         * ------------------------------------------------
         */

        const subscription =
          invoice.parent
            ?.subscription_details
            ?.subscription;

        const subscriptionId =
          typeof subscription ===
          "string"
            ? subscription
            : subscription?.id;

        /*
         * ------------------------------------------------
         * NO SUBSCRIPTION
         * ------------------------------------------------
         */

        if (!subscriptionId) {
          console.log(
            "Paid invoice without subscription ID:",
            invoice.id
          );

          break;
        }

        /*
         * ------------------------------------------------
         * MARK ACTIVE
         * ------------------------------------------------
         *
         * We do not touch cancellation state here.
         *
         * ------------------------------------------------
         */

        const {
          error,
        } = await supabase
          .from("subscriptions")
          .update({
            status:
              "active",
          })
          .eq(
            "stripe_subscription_id",
            subscriptionId
          );

        if (error) {
          console.error(
            "Invoice paid subscription update error:",
            error
          );
        } else {
          console.log(
            "Subscription marked active after successful payment:",
            subscriptionId
          );
        }

        break;
      }

      /*
       * ==================================================
       * DEFAULT
       * ==================================================
       */

      default: {
        console.log(
          "Unhandled Stripe event:",
          event.type
        );

        break;
      }
    }

    /*
     * ==================================================
     * SUCCESS RESPONSE
     * ==================================================
     *
     * Stripe needs a successful 2xx response.
     *
     * ==================================================
     */

    console.log(
      "Stripe webhook processed successfully:",
      {
        eventId:
          event.id,

        eventType:
          event.type,
      }
    );

    return NextResponse.json(
      {
        received:
          true,
      },
      {
        status:
          200,
      }
    );
  } catch (error: any) {
    /*
     * ==================================================
     * GLOBAL WEBHOOK ERROR
     * ==================================================
     */

    console.error(
      "=================================================="
    );

    console.error(
      "Stripe webhook processing error:"
    );

    console.error(
      error
    );

    console.error(
      "=================================================="
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Webhook processing failed.",
      },
      {
        status:
          500,
      }
    );
  }
}