"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type QuoteDetails = {
  id: string;
  quote_number: string | null;
  title: string | null;
  total: number | null;
  customer: {
    first_name: string;
    last_name: string | null;
    email: string | null;
    company_name: string | null;
  } | null;
};

type FollowUpRecord = {
  id: string;
  status: string;
  due_at: string;
};

type FollowUpResult = {
  quoteId: string;
  quoteNumber: string | null;
  customerName: string;
  customerEmail: string | null;
  message: string;
};

export default function QuoteFollowUpPage() {
  const params = useParams();
  const router = useRouter();

  const quoteId = params?.id as string;

  const [quote, setQuote] = useState<QuoteDetails | null>(null);

  const [followUp, setFollowUp] =
    useState<FollowUpRecord | null>(null);

  const [result, setResult] =
    useState<FollowUpResult | null>(null);

  const [businessId, setBusinessId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [completed, setCompleted] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const [emailId, setEmailId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ----------------------------------------
  // LOAD QUOTE + BUSINESS + FOLLOW-UP
  // ----------------------------------------

  useEffect(() => {
    async function loadFollowUpPage() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        if (!quoteId) {
          setError("Quote ID is missing.");
          setLoading(false);
          return;
        }

        // ----------------------------------------
        // LOAD USER BUSINESS
        // ----------------------------------------

        const {
          data: businessData,
          error: businessError,
        } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (businessError) {
          console.error(
            "Business lookup error:",
            businessError
          );

          throw new Error(
            "Unable to load your business."
          );
        }

        if (!businessData?.id) {
          throw new Error(
            "Unable to verify your business."
          );
        }

        setBusinessId(businessData.id);

        // ----------------------------------------
        // LOAD QUOTE
        // ----------------------------------------

        const {
          data: quoteData,
          error: quoteError,
        } = await supabase
          .from("quotes")
          .select(`
            id,
            quote_number,
            title,
            total,
            customer:customers (
              first_name,
              last_name,
              email,
              company_name
            )
          `)
          .eq("id", quoteId)
          .maybeSingle();

        if (quoteError) {
          throw quoteError;
        }

        if (!quoteData) {
          setError("Quote not found.");
          setLoading(false);
          return;
        }

        const customerData =
          Array.isArray(quoteData.customer)
            ? quoteData.customer[0] ?? null
            : quoteData.customer;

        const formattedQuote: QuoteDetails = {
          id: quoteData.id,

          quote_number:
            quoteData.quote_number ?? null,

          title:
            quoteData.title ?? null,

          total:
            Number(quoteData.total) || 0,

          customer: customerData
            ? {
                first_name:
                  customerData.first_name,

                last_name:
                  customerData.last_name ?? null,

                email:
                  customerData.email ?? null,

                company_name:
                  customerData.company_name ?? null,
              }
            : null,
        };

        setQuote(formattedQuote);

        // ----------------------------------------
        // LOAD PENDING FOLLOW-UP
        // ----------------------------------------

        const {
          data: followUpData,
          error: followUpError,
        } = await supabase
          .from("quote_follow_ups")
          .select(`
            id,
            status,
            due_at
          `)
          .eq("quote_id", quoteId)
          .eq("status", "pending")
          .order("due_at", {
            ascending: true,
          })
          .limit(1)
          .maybeSingle();

        if (followUpError) {
          throw followUpError;
        }

        if (followUpData) {
          setFollowUp({
            id: followUpData.id,
            status: followUpData.status,
            due_at: followUpData.due_at,
          });
        } else {
          setFollowUp(null);
        }
      } catch (err) {
        console.error(
          "Follow-up page loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the follow-up."
        );
      } finally {
        setLoading(false);
      }
    }

    loadFollowUpPage();
  }, [quoteId, router]);

  // ----------------------------------------
  // GENERATE FOLLOW-UP
  // ----------------------------------------

  async function generateFollowUp() {
    if (
      !quoteId ||
      generating ||
      sending ||
      completing
    ) {
      return;
    }

    setError("");
    setCopied(false);
    setGenerating(true);

    try {
      const response = await fetch(
        "/api/ai-follow-up",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            quoteId,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to generate the follow-up."
        );
      }

      setResult(data.followUp);
      setEmailSent(false);
      setEmailId(null);
      setCompleted(false);
    } catch (err) {
      console.error(
        "Follow-up generation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the follow-up."
      );
    } finally {
      setGenerating(false);
    }
  }

  // ----------------------------------------
  // COPY MESSAGE
  // ----------------------------------------

  async function copyMessage() {
    if (!result?.message) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        result.message
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (err) {
      console.error(
        "Copy failed:",
        err
      );

      setError(
        "Unable to copy the message. Please select and copy it manually."
      );
    }
  }

  // ----------------------------------------
  // SEND EMAIL WITH RESEND
  // ----------------------------------------

  async function sendEmailWithResend() {
    if (
      !result?.message ||
      sending ||
      completed
    ) {
      return;
    }

    if (!result.customerEmail) {
      setError(
        "This customer does not have an email address."
      );
      return;
    }

    if (!businessId) {
      setError(
        "Your business could not be verified. Please refresh the page and try again."
      );
      return;
    }

    setError("");
    setSending(true);
    setEmailSent(false);
    setEmailId(null);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/quote-reminders/send-email",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            quoteId,

            businessId,

            reminderId:
              followUp?.id ?? null,

            message:
              result.message,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to send the follow-up email."
        );
      }

      setEmailSent(true);

      setEmailId(
        data.emailId || null
      );

      const reminderCompleted =
        Boolean(
          data.reminderCompleted
        );

      setCompleted(
        reminderCompleted
      );

      if (followUp) {
        setFollowUp({
          id: followUp.id,

          status:
            reminderCompleted
              ? "completed"
              : followUp.status,

          due_at:
            followUp.due_at,
        });
      }
    } catch (err) {
      console.error(
        "Send follow-up email error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send the follow-up email."
      );
    } finally {
      setSending(false);
    }
  }

  // ----------------------------------------
  // MARK FOLLOW-UP COMPLETED
  // ----------------------------------------

  async function markFollowUpCompleted() {
    if (
      !followUp?.id ||
      completing ||
      sending
    ) {
      return;
    }

    setError("");
    setCompleting(true);

    try {
      const now =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("quote_follow_ups")
        .update({
          status: "completed",
          completed_at: now,
        })
        .eq("id", followUp.id)
        .eq("status", "pending");

      if (updateError) {
        throw updateError;
      }

      const {
        data: verifyData,
        error: verifyError,
      } = await supabase
        .from("quote_follow_ups")
        .select(`
          id,
          quote_id,
          business_id,
          status,
          due_at,
          completed_at
        `)
        .eq("id", followUp.id)
        .maybeSingle();

      if (verifyError) {
        throw verifyError;
      }

      if (!verifyData) {
        throw new Error(
          "The follow-up could not be verified after updating."
        );
      }

      if (
        verifyData.status !==
        "completed"
      ) {
        throw new Error(
          `The follow-up is still "${verifyData.status}" in the database.`
        );
      }

      setCompleted(true);

      setFollowUp({
        id: verifyData.id,
        status: verifyData.status,
        due_at: verifyData.due_at,
      });
    } catch (err) {
      console.error(
        "Complete follow-up error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark the follow-up as completed."
      );
    } finally {
      setCompleting(false);
    }
  }

  // ----------------------------------------
  // RETURN TO DASHBOARD
  // ----------------------------------------

  function returnToDashboard() {
    router.replace("/dashboard");
    router.refresh();
  }

  // ----------------------------------------
  // LOADING
  // ----------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading FlowPilot AI...
        </p>
      </main>
    );
  }

  // ----------------------------------------
  // PAGE
  // ----------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">

        <Link
          href={`/dashboard/quotes/${quoteId}`}
          className="text-sm text-blue-400 transition hover:text-blue-300"
        >
          ← Back to quote
        </Link>

        <div className="mt-6">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-2xl">
              🤖
            </div>

            <div>

              <p className="text-xs font-semibold tracking-widest text-blue-400">
                FLOWPILOT AI
              </p>

              <h1 className="text-2xl font-bold sm:text-3xl">
                AI Follow-Up
              </h1>

            </div>

          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            Generate a professional follow-up
            message for this quote. You can
            review and edit the message before
            sending it to your customer.
          </p>

        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-8">

          {!result &&
            !generating && (
              <div>

                {quote && (
                  <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Follow-up for
                    </p>

                    <h2 className="mt-2 text-lg font-semibold">
                      {quote.customer
                        ? `${quote.customer.first_name} ${
                            quote.customer.last_name ??
                            ""
                          }`.trim()
                        : "Customer"}
                    </h2>

                    {quote.customer?.email && (
                      <p className="mt-1 text-sm text-slate-400">
                        {quote.customer.email}
                      </p>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">

                      <div className="rounded-lg bg-slate-900 p-3">
                        <p className="text-xs text-slate-500">
                          Quote
                        </p>

                        <p className="mt-1 font-semibold text-blue-400">
                          {quote.quote_number ??
                            "Quote"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-3">
                        <p className="text-xs text-slate-500">
                          Service
                        </p>

                        <p className="mt-1 font-semibold text-slate-200">
                          {quote.title ??
                            "Quote"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-3">
                        <p className="text-xs text-slate-500">
                          Quote total
                        </p>

                        <p className="mt-1 font-semibold text-green-400">
                          £
                          {(
                            quote.total ??
                            0
                          ).toFixed(2)}
                        </p>
                      </div>

                    </div>

                  </div>
                )}

                <div className="mt-6 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 text-3xl">
                    ✨
                  </div>

                  <h2 className="mt-5 text-xl font-semibold">
                    Generate a customer follow-up
                  </h2>

                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    FlowPilot will look at the
                    quote and customer
                    information and create a
                    professional follow-up
                    message.
                  </p>

                  <button
                    type="button"
                    onClick={generateFollowUp}
                    disabled={
                      generating ||
                      sending ||
                      completing
                    }
                    className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🤖 Generate Follow-Up
                  </button>

                </div>

              </div>
            )}

          {generating && (
            <div className="py-16 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />

              <h2 className="mt-6 text-lg font-semibold">
                FlowPilot is writing your
                follow-up...
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Reviewing the quote and
                customer information.
              </p>

            </div>
          )}

          {result && (
            <div>

              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Follow-up for
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  {result.customerName}
                </h2>

                {result.customerEmail && (
                  <p className="mt-1 text-sm text-slate-400">
                    {result.customerEmail}
                  </p>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">

                  <div className="rounded-lg bg-slate-900 p-3">
                    <p className="text-xs text-slate-500">
                      Quote
                    </p>

                    <p className="mt-1 font-semibold text-blue-400">
                      {quote?.quote_number ??
                        result.quoteNumber ??
                        "Quote"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-3">
                    <p className="text-xs text-slate-500">
                      Service
                    </p>

                    <p className="mt-1 font-semibold text-slate-200">
                      {quote?.title ??
                        "Quote"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-3">
                    <p className="text-xs text-slate-500">
                      Quote total
                    </p>

                    <p className="mt-1 font-semibold text-green-400">
                      £
                      {(
                        quote?.total ??
                        0
                      ).toFixed(2)}
                    </p>
                  </div>

                </div>

              </div>

              <div className="mt-6">

                <div className="flex items-center justify-between gap-3">

                  <h2 className="text-sm font-semibold">
                    Suggested message
                  </h2>

                  <button
                    type="button"
                    onClick={copyMessage}
                    disabled={sending}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied
                      ? "✓ Copied"
                      : "Copy message"}
                  </button>

                </div>

                <textarea
                  value={result.message}
                  onChange={(event) =>
                    setResult({
                      ...result,
                      message:
                        event.target.value,
                    })
                  }
                  disabled={
                    sending ||
                    emailSent
                  }
                  rows={12}
                  className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-slate-950 p-5 text-sm leading-7 text-slate-200 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                />

                <p className="mt-3 text-xs text-slate-600">
                  You can edit this message
                  before sending it to the
                  customer.
                </p>

              </div>

              {emailSent && (
                <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 p-5">

                  <div className="flex items-start gap-3">

                    <span className="text-xl">
                      ✓
                    </span>

                    <div>

                      <h3 className="font-semibold text-green-300">
                        Email sent successfully
                      </h3>

                      <p className="mt-1 text-sm text-green-400/80">
                        The follow-up email was
                        accepted by Resend and
                        sent to{" "}
                        {result.customerEmail}.
                      </p>

                      {emailId && (
                        <p className="mt-2 break-all text-xs text-green-400/60">
                          Email ID: {emailId}
                        </p>
                      )}

                      {followUp && completed && (
                        <p className="mt-2 text-xs text-green-400/60">
                          The pending follow-up
                          reminder was also marked
                          as completed.
                        </p>
                      )}

                      {!followUp && (
                        <p className="mt-2 text-xs text-green-400/60">
                          No pending reminder was
                          attached to this quote.
                        </p>
                      )}

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={returnToDashboard}
                    className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
                  >
                    Return to Dashboard
                  </button>

                </div>
              )}

              {!emailSent && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">

                  <button
                    type="button"
                    onClick={generateFollowUp}
                    disabled={
                      generating ||
                      sending ||
                      completing
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🔄 Generate Another
                  </button>

                  {result.customerEmail && (
                    <button
                      type="button"
                      onClick={
                        sendEmailWithResend
                      }
                      disabled={
                        sending ||
                        completing ||
                        !businessId
                      }
                      className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending
                        ? "Sending..."
                        : "✉️ Send with Resend"}
                    </button>
                  )}

                  {result.customerEmail && (
                    <a
                      href={`mailto:${result.customerEmail}?subject=${encodeURIComponent(
                        result.quoteNumber
                          ? `Follow-up regarding quote ${result.quoteNumber}`
                          : "Follow-up regarding your quote"
                      )}&body=${encodeURIComponent(
                        result.message
                      )}`}
                      className="rounded-xl border border-blue-500/30 bg-blue-600/10 px-5 py-3 text-center text-sm font-semibold text-blue-300 transition hover:bg-blue-600/20"
                    >
                      ✉️ Open Email
                    </a>
                  )}

                </div>
              )}

              {!followUp &&
                !emailSent && (
                  <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                    <p className="text-sm font-medium text-blue-300">
                      Ready to send
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      This quote does not have a
                      pending reminder, but you can
                      still send this follow-up
                      directly with Resend.
                    </p>

                  </div>
                )}

              {!emailSent && (
                <div className="mt-8 border-t border-white/10 pt-6">

                  {completed ? (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-5">

                      <div className="flex items-start gap-3">

                        <span className="text-xl">
                          ✓
                        </span>

                        <div>

                          <h3 className="font-semibold text-green-300">
                            Follow-up completed
                          </h3>

                          <p className="mt-1 text-sm text-green-400/80">
                            This follow-up has been
                            marked as completed and
                            will no longer appear in
                            your dashboard attention
                            list.
                          </p>

                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={
                          returnToDashboard
                        }
                        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
                      >
                        Return to Dashboard
                      </button>

                    </div>
                  ) : followUp ? (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">

                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                        <div>

                          <h3 className="font-semibold text-yellow-300">
                            Follow-up still needs
                            attention
                          </h3>

                          <p className="mt-1 text-sm text-slate-400">
                            You can send the email
                            with Resend above, or
                            mark this follow-up as
                            completed manually.
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={
                            markFollowUpCompleted
                          }
                          disabled={
                            completing ||
                            sending
                          }
                          className="shrink-0 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {completing
                            ? "Completing..."
                            : "✓ Mark as Completed"}
                        </button>

                      </div>

                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                      No pending follow-up record
                      was found for this quote.
                      Sending with Resend is still
                      available above.
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-slate-900 p-4 text-center text-xs leading-5 text-slate-500">
          FlowPilot AI creates a draft for you to
          review. Emails are only sent when you
          explicitly click "Send with Resend".
        </div>

      </div>
    </main>
  );
}
