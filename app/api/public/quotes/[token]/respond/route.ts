import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ token: string }>;
  }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing quote token.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const status = body?.status;

    if (
      status !== "accepted" &&
      status !== "rejected"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid response. Use accepted or rejected.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // FIND QUOTE
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

    if (quoteError) {
      console.error(
        "Quote response lookup error:",
        quoteError
      );

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
    // PREVENT CHANGING A FINAL QUOTE
    // ----------------------------------------

    if (
      quote.status === "accepted" ||
      quote.status === "rejected" ||
      quote.status === "expired"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This quote can no longer be changed.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // UPDATE QUOTE
    // ----------------------------------------

    const { data: updatedQuote, error: updateError } =
      await supabaseAdmin
        .from("quotes")
        .update({
          status,
          responded_at: new Date().toISOString(),
        })
        .eq("id", quote.id)
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
        .single();

    if (updateError) {
      console.error(
        "Quote response update error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        status === "accepted"
          ? "Quote accepted successfully."
          : "Quote rejected successfully.",

      quote: {
        ...updatedQuote,

        // Never expose the public token
        public_token: undefined,
      },
    });
  } catch (error) {
    console.error(
      "Quote response API exception:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process your response.",
      },
      { status: 500 }
    );
  }
}