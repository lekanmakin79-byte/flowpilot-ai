import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import {
  canUseAiFollowUp,
  recordAiUsage,
} from "@/lib/subscription-access";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

/**
 * Get the authenticated Supabase user
 * from the Bearer access token sent by
 * the browser.
 */
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

  const supabase =
    getSupabaseAdmin();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser(
      token
    );

  if (error || !user) {
    console.error(
      "Authentication error:",
      error
    );

    return null;
  }

  return user;
}

export async function POST(
  request: Request
) {
  try {
    // ----------------------------------------
    // CHECK GROQ CONFIGURATION
    // ----------------------------------------

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Groq API key is not configured.",
          code: "MISSING_GROQ_KEY",
        },
        { status: 500 }
      );
    }

    // ----------------------------------------
    // AUTHENTICATE USER
    // ----------------------------------------

    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required. Please log in again.",
          code:
            "AUTHENTICATION_REQUIRED",
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

    if (
      typeof quoteId !== "string" ||
      !quoteId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A quote ID is required.",
          code:
            "INVALID_QUOTE_ID",
        },
        { status: 400 }
      );
    }

    const supabase =
      getSupabaseAdmin();

    // ----------------------------------------
    // VERIFY AI SUBSCRIPTION ACCESS
    // ----------------------------------------
    //
    // Free users:
    //   3 AI follow-ups per month
    //
    // Professional users:
    //   Unlimited AI follow-ups
    //
    // IMPORTANT:
    // We check the limit BEFORE calling Groq.
    // We record usage only AFTER Groq succeeds.
    // ----------------------------------------

    const aiAccess =
      await canUseAiFollowUp(
        user.id
      );

    if (!aiAccess.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            aiAccess.error ||
            "You have reached your Free plan AI limit.",
          code:
            aiAccess.code ||
            "FREE_LIMIT_REACHED",
          plan: aiAccess.plan,
          limit: aiAccess.limit,
          current: aiAccess.current,
          remaining:
            aiAccess.remaining,
        },
        { status: 403 }
      );
    }

    // ----------------------------------------
    // GET QUOTE
    // ----------------------------------------

    const {
      data: quote,
      error: quoteError,
    } = await supabase
      .from("quotes")
      .select(
        `
        id,
        business_id,
        customer_id,
        quote_number,
        title,
        description,
        status,
        subtotal,
        tax,
        total,
        valid_until,
        notes,
        created_at,
        updated_at,
        responded_at
      `
      )
      .eq("id", quoteId)
      .single();

    if (
      quoteError ||
      !quote
    ) {
      console.error(
        "Quote lookup error:",
        quoteError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Quote not found.",
          code:
            "QUOTE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------
    // VERIFY QUOTE BELONGS TO USER'S BUSINESS
    // ----------------------------------------

    const {
      data: business,
      error: businessError,
    } =
      await supabase
        .from("businesses")
        .select("id")
        .eq(
          "id",
          quote.business_id
        )
        .eq(
          "owner_id",
          user.id
        )
        .maybeSingle();

    if (businessError) {
      console.error(
        "Business verification error:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify your business.",
          code:
            "BUSINESS_VERIFICATION_ERROR",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You do not have access to this quote.",
          code:
            "QUOTE_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------
    // GET CUSTOMER
    // ----------------------------------------

    let customer = null;

    if (quote.customer_id) {
      const {
        data: customerData,
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
            email,
            phone,
            address,
            notes,
            status
          `
          )
          .eq(
            "id",
            quote.customer_id
          )
          .eq(
            "business_id",
            quote.business_id
          )
          .single();

      if (customerError) {
        console.error(
          "Customer lookup error:",
          customerError
        );
      }

      customer =
        customerData;
    }

    // ----------------------------------------
    // PREPARE CUSTOMER NAME
    // ----------------------------------------

    const customerName =
      [
        customer?.first_name,
        customer?.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      customer?.company_name ||
      "the customer";

    // ----------------------------------------
    // PREPARE AI CONTEXT
    // ----------------------------------------

    const quoteContext = {
      quote_number:
        quote.quote_number,
      title:
        quote.title,
      description:
        quote.description,
      status:
        quote.status,
      total:
        quote.total,
      valid_until:
        quote.valid_until,
      created_at:
        quote.created_at,
      responded_at:
        quote.responded_at,
      notes:
        quote.notes,
    };

    const customerContext = {
      name:
        customerName,
      company_name:
        customer?.company_name ||
        null,
      email:
        customer?.email ||
        null,
    };

    // ----------------------------------------
    // GROQ SYSTEM PROMPT
    // ----------------------------------------

    const systemPrompt = `
You are FlowPilot AI, an AI Office Manager for small businesses.

Your task is to write a professional customer follow-up message
for a business quote.

IMPORTANT RULES:

1. Use British English.
2. Keep the message professional, friendly and concise.
3. Do not pressure the customer.
4. Do not invent information.
5. Only use information supplied in the quote and customer data.
6. Do not claim the customer agreed to anything.
7. Do not claim that payment has been made.
8. Do not mention internal database information.
9. Do not mention that AI generated the message.
10. If the quote has a validity date, you may mention it naturally.
11. If the quote has no validity date, do not invent one.
12. Address the customer by their name where available.
13. Do not include a subject line unless specifically requested.
14. Return only the message itself.
15. Do not surround the message in quotation marks.
16. Do not use markdown.
`;

    // ----------------------------------------
    // GROQ USER PROMPT
    // ----------------------------------------

    const userPrompt = `
CUSTOMER:

${JSON.stringify(
  customerContext,
  null,
  2
)}

QUOTE:

${JSON.stringify(
  quoteContext,
  null,
  2
)}

Write a suitable follow-up message asking whether the customer
has had an opportunity to review the quote and whether they have
any questions.

The message should feel natural and appropriate for a small
business owner communicating with a customer.
`;

    // ----------------------------------------
    // CALL GROQ
    // ----------------------------------------

    const completion =
      await groq.chat.completions.create(
        {
          model:
            "openai/gpt-oss-20b",

          temperature: 0.4,

          messages: [
            {
              role: "system",
              content:
                systemPrompt,
            },
            {
              role: "user",
              content:
                userPrompt,
            },
          ],
        }
      );

    const message =
      completion.choices?.[0]
        ?.message?.content?.trim();

    // ----------------------------------------
    // CHECK AI RESPONSE
    // ----------------------------------------

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI returned an empty response.",
          code:
            "AI_EMPTY_RESPONSE",
        },
        { status: 500 }
      );
    }

    // ----------------------------------------
    // RECORD SUCCESSFUL AI USAGE
    // ----------------------------------------
    //
    // This happens ONLY after Groq has
    // successfully generated a message.
    //
    // Professional users can also be recorded,
    // although their limit is unlimited.
    // ----------------------------------------

    try {
      await recordAiUsage(
        user.id,
        "quote_follow_up"
      );
    } catch (usageError) {
      console.error(
        "AI usage recording error:",
        usageError
      );

      // Do not fail the successful AI
      // response because usage tracking failed.
    }

    // ----------------------------------------
    // RETURN RESULT
    // ----------------------------------------

    return NextResponse.json({
      success: true,

      plan:
        aiAccess.plan,

      usage: {
        limit:
          aiAccess.limit,
        current:
          aiAccess.current + 1,
        remaining:
          aiAccess.remaining === null
            ? null
            : Math.max(
                0,
                aiAccess.remaining - 1
              ),
      },

      followUp: {
        quoteId:
          quote.id,

        quoteNumber:
          quote.quote_number,

        customerName,

        customerEmail:
          customer?.email ||
          null,

        message,
      },
    });
  } catch (error: any) {
    // ----------------------------------------
    // GENERAL ERROR HANDLING
    // ----------------------------------------

    console.error(
      "FlowPilot AI Follow-Up error:",
      error
    );

    // ----------------------------------------
    // GROQ RATE LIMIT
    // ----------------------------------------

    if (
      error?.status === 429 ||
      error?.code ===
        "rate_limit_exceeded" ||
      String(
        error?.message || ""
      ).includes("429")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI service has temporarily reached its usage limit. Please try again later.",
          code:
            "AI_RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    // ----------------------------------------
    // RETURN GENERAL ERROR
    // ----------------------------------------

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to generate the follow-up message.",
        code:
          "AI_FOLLOW_UP_ERROR",
      },
      { status: 500 }
    );
  }
}