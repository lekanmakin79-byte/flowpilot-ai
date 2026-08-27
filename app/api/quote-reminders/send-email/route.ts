import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendQuoteFollowUpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    url,
    serviceRoleKey,
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
    // ----------------------------------------
    // AUTHENTICATION
    // ----------------------------------------

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization
        .replace("Bearer ", "")
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const supabase =
      getSupabaseAdmin();

    // ----------------------------------------
    // VERIFY USER
    // ----------------------------------------

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your session has expired.",
        },
        { status: 401 }
      );
    }

    // ----------------------------------------
    // READ REQUEST
    // ----------------------------------------

    const body =
      await request.json();

    const quoteId =
      body?.quoteId;

    const reminderId =
      body?.reminderId;

    const message =
      body?.message;

    if (
      typeof quoteId !== "string" ||
      !quoteId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A quote ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A follow-up message is required.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // FIND USER'S BUSINESS
    // ----------------------------------------

    const {
      data: business,
      error: businessError,
    } =
      await supabase
        .from("businesses")
        .select("id")
          .eq(
          "owner_id",
          user.id
        )
        .maybeSingle();

    if (businessError) {
      console.error(
        "Business lookup error:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify your business.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business not found.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------
    // GET QUOTE
    // ----------------------------------------

    const {
      data: quote,
      error: quoteError,
    } =
      await supabase
        .from("quotes")
        .select(
          `
          id,
          quote_number,
          customer_id,
          business_id
          `
        )
        .eq(
          "id",
          quoteId
        )
        .eq(
          "business_id",
          business.id
        )
        .maybeSingle();

    if (quoteError) {
      console.error(
        "Quote lookup error:",
        quoteError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load the quote.",
        },
        { status: 500 }
      );
    }

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quote not found.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------
    // GET CUSTOMER
    // ----------------------------------------

    if (!quote.customer_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This quote does not have a customer.",
        },
        { status: 400 }
      );
    }

    const {
      data: customer,
      error: customerError,
    } =
      await supabase
        .from("customers")
        .select(
          `
          id,
          first_name,
          last_name,
          company_name,
          email
          `
        )
        .eq(
          "id",
          quote.customer_id
        )
        .eq(
          "business_id",
          business.id
        )
        .maybeSingle();

    if (customerError) {
      console.error(
        "Customer lookup error:",
        customerError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load the customer.",
        },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer not found.",
        },
        { status: 404 }
      );
    }

    if (!customer.email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This customer does not have an email address.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // CUSTOMER NAME
    // ----------------------------------------

    const customerName =
      [
        customer.first_name,
        customer.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        ||
      customer.company_name
      ||
      "Customer";

    // ----------------------------------------
    // PREPARE MESSAGE
    // ----------------------------------------

    let finalMessage =
      message.trim();

    // ----------------------------------------
    // SEND EMAIL
    // ----------------------------------------

    const emailResult =
      await sendQuoteFollowUpEmail({
        to: customer.email,

        customerName,

        quoteNumber:
          quote.quote_number ||
          "your quote",

        message:
          finalMessage,
      });

    // ----------------------------------------
    // OPTIONAL REMINDER COMPLETION
    // ----------------------------------------
    //
    // A reminder is optional.
    //
    // This means:
    //
    // 1. Email can be sent even if there is
    //    no pending quote_follow_ups record.
    //
    // 2. If a pending reminder exists, it is
    //    marked completed after Resend accepts
    //    the email.
    //
    // ----------------------------------------

    let reminderCompleted =
      false;

    if (
      typeof reminderId ===
        "string" &&
      reminderId.trim()
    ) {
      const {
        data: reminder,
        error: reminderLookupError,
      } =
        await supabase
          .from(
            "quote_follow_ups"
          )
          .select(
            `
            id,
            quote_id,
            business_id,
            status
            `
          )
          .eq(
            "id",
            reminderId
          )
          .eq(
            "quote_id",
            quote.id
          )
          .eq(
            "business_id",
            business.id
          )
          .eq(
            "status",
            "pending"
          )
          .maybeSingle();

      if (reminderLookupError) {
        console.error(
          "Reminder lookup error:",
          reminderLookupError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "The email was sent, but the reminder could not be verified.",
            emailSent: true,
            emailId:
              emailResult?.id ||
              null,
          },
          { status: 500 }
        );
      }

      if (reminder) {
        const completedAt =
          new Date().toISOString();

        const {
          error:
            completionError,
        } =
          await supabase
            .from(
              "quote_follow_ups"
            )
            .update({
              status:
                "completed",

              completed_at:
                completedAt,

              generated_message:
                finalMessage,
            })
            .eq(
              "id",
              reminder.id
            )
            .eq(
              "business_id",
              business.id
            )
            .eq(
              "status",
              "pending"
            );

        if (
          completionError
        ) {
          console.error(
            "Reminder completion error after email:",
            completionError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "The email was sent, but the reminder could not be marked as completed. Please refresh the page before trying again.",
              emailSent: true,
              emailId:
                emailResult?.id ||
                null,
            },
            { status: 500 }
          );
        }

        reminderCompleted =
          true;
      }
    }

    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Follow-up email sent successfully.",

      emailSent: true,

      emailId:
        emailResult?.id ||
        null,

      reminderCompleted,

      customerEmail:
        customer.email,

      customerName,

      quoteNumber:
        quote.quote_number ||
        null,
    });
  } catch (error) {
    console.error(
      "Quote reminder email error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to send the follow-up email.",
      },
      { status: 500 }
    );
  }
}
