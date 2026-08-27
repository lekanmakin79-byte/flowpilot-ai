import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
     * REMINDER RULES
     *
     * First reminder:
     *   Quote must have been sent at least 3 days ago.
     *
     * Subsequent reminders:
     *   The previous reminder must have been completed
     *   at least 3 days ago.
     *
     * A quote must still be "sent" and unanswered.
     */

    const now = new Date();

    const firstReminderCutoff = new Date(now);

    firstReminderCutoff.setDate(
      firstReminderCutoff.getDate() - 3
    );

    /*
     * Find quotes that are:
     *
     * - still sent
     * - unanswered
     * - at least 3 days old
     */

    const {
      data: quotes,
      error: quotesError,
    } = await supabase
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
      .lte(
        "created_at",
        firstReminderCutoff.toISOString()
      );

    if (quotesError) {
      console.error(
        "Quote reminder query error:",
        quotesError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to find quotes requiring follow-up.",
        },
        { status: 500 }
      );
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "No quotes currently require follow-up.",
        checked: 0,
        created: 0,
      });
    }

    let created = 0;
    let skipped = 0;

    for (const quote of quotes) {
      /*
       * ------------------------------------------------
       * CHECK FOR A PENDING REMINDER
       * ------------------------------------------------
       *
       * A pending reminder must never be duplicated.
       */

      const {
        data: pendingReminder,
        error: pendingReminderError,
      } = await supabase
        .from("quote_follow_ups")
        .select(
          "id, due_at, created_at"
        )
        .eq("quote_id", quote.id)
        .eq("reminder_type", "follow_up")
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (pendingReminderError) {
        console.error(
          "Pending reminder lookup error:",
          pendingReminderError
        );

        skipped++;
        continue;
      }

      if (pendingReminder) {
        console.log(
          "Pending reminder already exists:",
          pendingReminder.id
        );

        skipped++;
        continue;
      }

      /*
       * ------------------------------------------------
       * FIND MOST RECENT COMPLETED REMINDER
       * ------------------------------------------------
       */

      const {
        data: lastCompletedReminder,
        error: completedReminderError,
      } = await supabase
        .from("quote_follow_ups")
        .select(
          "id, status, completed_at, created_at"
        )
        .eq("quote_id", quote.id)
        .eq("reminder_type", "follow_up")
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (completedReminderError) {
        console.error(
          "Completed reminder lookup error:",
          completedReminderError
        );

        skipped++;
        continue;
      }

      /*
       * ------------------------------------------------
       * SUBSEQUENT REMINDER DELAY
       * ------------------------------------------------
       *
       * If a previous reminder was completed,
       * wait 3 full days before creating another.
       */

      if (
        lastCompletedReminder?.completed_at
      ) {
        const completedAt =
          new Date(
            lastCompletedReminder.completed_at
          );

        const nextReminderDate =
          new Date(completedAt);

        nextReminderDate.setDate(
          nextReminderDate.getDate() + 3
        );

        if (now < nextReminderDate) {
          console.log(
            "Quote is waiting for next reminder window:",
            {
              quoteId: quote.id,
              nextReminderDate:
                nextReminderDate.toISOString(),
            }
          );

          skipped++;
          continue;
        }
      }

      /*
       * ------------------------------------------------
       * CREATE REMINDER
       * ------------------------------------------------
       */

      const {
        error: insertError,
      } = await supabase
        .from("quote_follow_ups")
        .insert({
          business_id: quote.business_id,
          quote_id: quote.id,
          reminder_type: "follow_up",
          status: "pending",
          due_at: now.toISOString(),
        });

      if (insertError) {
        console.error(
          "Reminder creation error:",
          insertError
        );

        skipped++;
        continue;
      }

      console.log(
        "Quote reminder created:",
        {
          quoteId: quote.id,
          quoteNumber:
            quote.quote_number,
        }
      );

      created++;
    }

    return NextResponse.json({
      success: true,
      message:
        "Quote follow-up check completed.",
      checked: quotes.length,
      created,
      skipped,
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