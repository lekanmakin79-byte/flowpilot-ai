import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /*
     * Vercel Cron authentication
     *
     * Vercel sends:
     *
     * Authorization: Bearer <CRON_SECRET>
     *
     * during a production cron invocation.
     */

    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authorization =
        request.headers.get("authorization");

      if (
        authorization !== `Bearer ${cronSecret}`
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized.",
          },
          { status: 401 }
        );
      }
    }

    const supabase = createClient(
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
     * We consider a quote ready for follow-up when:
     *
     * - It has been sent
     * - It has not been responded to
     * - It was created at least 3 days ago
     *
     * We also make sure we don't create duplicate reminders.
     */

    const cutoff = new Date();

    cutoff.setDate(
      cutoff.getDate() - 3
    );

    const { data: quotes, error: quotesError } =
      await supabase
        .from("quotes")
        .select(
          `
          id,
          business_id,
          quote_number,
          title,
          status,
          created_at,
          valid_until,
          responded_at
        `
        )
        .eq("status", "sent")
        .is("responded_at", null)
        .lte("created_at", cutoff.toISOString());

    if (quotesError) {
      console.error(
        "Quote reminder query error:",
        quotesError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to find quotes requiring follow-up.",
        },
        { status: 500 }
      );
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No quotes currently require follow-up.",
        created: 0,
      });
    }

    let created = 0;

    for (const quote of quotes) {
      /*
       * Check whether a follow-up already exists.
       */

      const { data: existingReminder, error: existingError } =
        await supabase
          .from("quote_follow_ups")
          .select("id")
          .eq("quote_id", quote.id)
          .eq("reminder_type", "follow_up")
          .maybeSingle();

      if (existingError) {
        console.error(
          "Reminder lookup error:",
          existingError
        );

        continue;
      }

      if (existingReminder) {
        continue;
      }

      /*
       * Create the reminder.
       */

      const { error: insertError } =
        await supabase
          .from("quote_follow_ups")
          .insert({
            business_id: quote.business_id,
            quote_id: quote.id,
            reminder_type: "follow_up",
            status: "pending",
            due_at: new Date().toISOString(),
          });

      if (insertError) {
        console.error(
          "Reminder creation error:",
          insertError
        );

        continue;
      }

      created++;
    }

    return NextResponse.json({
      success: true,
      message:
        "Quote follow-up check completed.",
      checked: quotes.length,
      created,
    });
  } catch (error) {
    console.error(
      "Quote follow-up cron error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Quote follow-up check failed.",
      },
      { status: 500 }
    );
  }
}