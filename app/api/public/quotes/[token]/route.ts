import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ token: string }>;
  }
) {
  try {
    const { token } = await context.params;

    console.log("================================");
    console.log("PUBLIC QUOTE API");
    console.log("TOKEN:", token);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid quote link.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // GET QUOTE
    // ----------------------------------------

    const { data: quote, error: quoteError } =
      await supabaseAdmin
        .from("quotes")
        .select(`
          id,
          business_id,
          customer_id,
          job_id,
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
          responded_at,
          public_token
        `)
        .eq("public_token", token)
        .maybeSingle();

    console.log("QUOTE:", quote);
    console.log("QUOTE ERROR:", quoteError);

    if (quoteError) {
      return NextResponse.json(
        {
          success: false,
          message: quoteError.message,
        },
        { status: 500 }
      );
    }

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          message: "Quote not found.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------
    // GET BUSINESS
    // ----------------------------------------

    const { data: business, error: businessError } =
      await supabaseAdmin
        .from("businesses")
        .select(`
          id,
          business_name,
          business_type,
          email,
          phone,
          address,
          website,
          currency
        `)
        .eq("id", quote.business_id)
        .maybeSingle();

    console.log("BUSINESS:", business);
    console.log("BUSINESS ERROR:", businessError);

    // ----------------------------------------
    // GET CUSTOMER
    // ----------------------------------------

    const { data: customer, error: customerError } =
      await supabaseAdmin
        .from("customers")
        .select(`
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone
        `)
        .eq("id", quote.customer_id)
        .maybeSingle();

    console.log("CUSTOMER:", customer);
    console.log("CUSTOMER ERROR:", customerError);

    console.log("================================");

    // ----------------------------------------
    // RETURN RESULT
    // ----------------------------------------

    return NextResponse.json({
      success: true,

      quote: {
        ...quote,

        // Never expose the public token
        public_token: undefined,
      },

      business,

      customer,
    });
  } catch (error) {
    console.error("PUBLIC QUOTE API EXCEPTION:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unexpected error loading quote.",
      },
      { status: 500 }
    );
  }
}