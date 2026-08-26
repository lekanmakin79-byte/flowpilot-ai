"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Lead = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [customerResponse, setCustomerResponse] = useState("");

  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function loadLead() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        console.error(businessError);
        setError("Unable to load your business.");
        setLoading(false);
        return;
      }

      if (!business) {
        router.replace("/onboarding");
        return;
      }

      const {
        data,
        error: leadError,
      } = await supabase
        .from("leads")
        .select(
          `
          id,
          business_id,
          name,
          email,
          phone,
          description,
          source,
          status,
          created_at,
          updated_at
        `
        )
        .eq("id", leadId)
        .eq("business_id", business.id)
        .maybeSingle();

      if (leadError) {
        console.error(leadError);
        setError("Unable to load this enquiry.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Enquiry not found.");
        setLoading(false);
        return;
      }

      setLead(data);
      setLoading(false);
    }

    if (leadId) {
      loadLead();
    }
  }, [leadId, router]);

  // =====================================================
  // GET SESSION TOKEN
  // =====================================================

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    return session.access_token;
  }

  // =====================================================
  // CALL FLOWPILOT AI
  // =====================================================

  async function askFlowPilotAI(
    question: string
  ): Promise<string> {
    if (!lead) {
      throw new Error("Enquiry information is unavailable.");
    }

    const accessToken = await getAccessToken();

    const response = await fetch("/api/ai-assistant", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },

      body: JSON.stringify({
        question,

        chatHistory: [],

        businessContext: {
          current_enquiry: {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            description: lead.description,
            source: lead.source,
            status: lead.status,
            created_at: lead.created_at,
          },
        },
      }),
    });

    const contentType =
      response.headers.get("content-type") || "";

    let result: {
      success?: boolean;
      answer?: string;
      error?: string;
      message?: string;
    } = {};

    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();

      console.error(
        "FlowPilot AI returned non-JSON:",
        text
      );

      throw new Error(
        `AI server returned an unexpected response (${response.status}).`
      );
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.error ||
          result.message ||
          `FlowPilot AI request failed (${response.status}).`
      );
    }

    if (!result.answer) {
      throw new Error(
        "FlowPilot AI returned an empty response."
      );
    }

    return result.answer;
  }

  // =====================================================
  // BUTTON 1 — ANALYSE ENQUIRY
  // =====================================================

  async function analyseEnquiry() {
    if (!lead || aiLoading) return;

    setError("");
    setAiLoading(true);

    try {
      const answer = await askFlowPilotAI(`
Analyse this customer enquiry.

Customer:
${lead.name}

Email:
${lead.email || "Not provided"}

Phone:
${lead.phone || "Not provided"}

Source:
${lead.source || "Not provided"}

Current status:
${lead.status || "new"}

Enquiry:
${lead.description || "No description provided."}

Give me a concise business-focused analysis.

Include:

1. What the customer appears to need.
2. Likely urgency.
3. Recommended next action.
4. Important information we should clarify.
5. Whether the enquiry should be contacted immediately.

Do not invent information that is not provided.
Use British English.
`);

      setAiAnalysis(answer);
    } catch (err) {
      console.error(
        "Analyse enquiry error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyse this enquiry."
      );
    } finally {
      setAiLoading(false);
    }
  }

  // =====================================================
  // BUTTON 2 — DRAFT CUSTOMER RESPONSE
  // =====================================================

  async function draftCustomerResponse() {
    if (!lead || draftLoading) return;

    if (!lead.email && !lead.phone) {
      setError(
        "This enquiry has no email address or phone number."
      );
      return;
    }

    setError("");
    setDraftLoading(true);

    try {
      const answer = await askFlowPilotAI(`
Draft a professional customer response for this enquiry.

Customer name:
${lead.name}

Customer email:
${lead.email || "Not provided"}

Customer phone:
${lead.phone || "Not provided"}

Enquiry:
${lead.description || "No description provided."}

Write a short, friendly and professional message.

The response should:

- Thank the customer for contacting us.
- Acknowledge their enquiry.
- Ask only the important information needed before arranging the work.
- Avoid inventing prices, appointment times or technical details.
- Encourage the customer to reply.
- Use British English.

Return only the customer message.
Do not include analysis.
Do not include a subject line.
`);

      setCustomerResponse(answer);
    } catch (err) {
      console.error(
        "Draft customer response error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to draft the customer response."
      );
    } finally {
      setDraftLoading(false);
    }
  }

  // =====================================================
  // BUTTON 3 — MARK CONTACTED
  // =====================================================

  async function markContacted() {
    if (!lead || updatingStatus) return;

    setError("");
    setUpdatingStatus(true);

    try {
      const now = new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("leads")
        .update({
          status: "contacted",
          updated_at: now,
        })
        .eq("id", lead.id)
        .eq("business_id", lead.business_id);

      if (updateError) {
        console.error(updateError);

        throw new Error(
          "Unable to update the enquiry status."
        );
      }

      setLead({
        ...lead,
        status: "contacted",
        updated_at: now,
      });
    } catch (err) {
      console.error(
        "Mark contacted error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark the enquiry as contacted."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  // =====================================================
  // STATUS UPDATE
  // =====================================================

  async function updateStatus(
    newStatus: string
  ) {
    if (!lead || updatingStatus) return;

    setError("");
    setUpdatingStatus(true);

    try {
      const now = new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("leads")
        .update({
          status: newStatus,
          updated_at: now,
        })
        .eq("id", lead.id)
        .eq("business_id", lead.business_id);

      if (updateError) {
        console.error(updateError);

        throw new Error(
          "Unable to update the enquiry status."
        );
      }

      setLead({
        ...lead,
        status: newStatus,
        updated_at: now,
      });
    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the enquiry status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  // =====================================================
  // COPY RESPONSE
  // =====================================================

  async function copyResponse() {
    if (!customerResponse) return;

    try {
      await navigator.clipboard.writeText(
        customerResponse
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(
        "Copy response error:",
        err
      );

      setError(
        "Unable to copy the message."
      );
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading enquiry...
        </p>
      </main>
    );
  }

  // =====================================================
  // NOT FOUND
  // =====================================================

  if (!lead) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">

          <Link
            href="/dashboard/leads"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to enquiries
          </Link>

          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-red-300">
              {error || "Enquiry not found."}
            </p>
          </div>

        </div>
      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">

      <div className="mx-auto max-w-4xl">

        {/* BACK */}

        <Link
          href="/dashboard/leads"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to enquiries
        </Link>

        {/* HEADER */}

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">

          <div>

            <p className="text-sm font-semibold tracking-widest text-blue-400">
              ENQUIRY
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              {lead.name}
            </h1>

            <p className="mt-2 text-slate-400">
              Lead / customer enquiry
            </p>

          </div>

          <select
            value={lead.status ?? "new"}
            onChange={(event) =>
              updateStatus(event.target.value)
            }
            disabled={updatingStatus}
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="new">
              New
            </option>

            <option value="contacted">
              Contacted
            </option>

            <option value="qualified">
              Qualified
            </option>

            <option value="quoted">
              Quoted
            </option>

            <option value="won">
              Won
            </option>

            <option value="lost">
              Lost
            </option>
          </select>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* CONTACT + ENQUIRY */}

        <div className="mt-8 grid gap-6 md:grid-cols-2">

          <section className="rounded-xl border border-white/10 bg-slate-900 p-6">

            <h2 className="text-lg font-semibold">
              Contact details
            </h2>

            <div className="mt-5 space-y-4">

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Name
                </p>

                <p className="mt-1 text-sm text-slate-200">
                  {lead.name}
                </p>
              </div>

              {lead.email && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Email
                  </p>

                  <a
                    href={`mailto:${lead.email}`}
                    className="mt-1 block text-sm text-blue-400 hover:text-blue-300"
                  >
                    {lead.email}
                  </a>
                </div>
              )}

              {lead.phone && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Phone
                  </p>

                  <a
                    href={`tel:${lead.phone}`}
                    className="mt-1 block text-sm text-blue-400 hover:text-blue-300"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}

              {lead.source && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Source
                  </p>

                  <p className="mt-1 text-sm text-slate-200">
                    {lead.source}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Status
                </p>

                <p className="mt-1 text-sm font-medium text-blue-400">
                  {lead.status || "New"}
                </p>
              </div>

            </div>

          </section>

          <section className="rounded-xl border border-white/10 bg-slate-900 p-6">

            <h2 className="text-lg font-semibold">
              Enquiry
            </h2>

            <div className="mt-5">

              <p className="text-xs uppercase tracking-wide text-slate-500">
                Description
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {lead.description ||
                  "No enquiry description was provided."}
              </p>

            </div>

          </section>

        </div>

        {/* =================================================
            AI ENQUIRY ASSISTANT
        ================================================= */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-900">

          <div className="border-b border-white/10 bg-blue-500/5 p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-2xl">
                🤖
              </div>

              <div>

                <p className="text-xs font-semibold tracking-widest text-blue-400">
                  FLOWPILOT AI
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  AI Enquiry Assistant
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Let FlowPilot analyse this enquiry and help you decide what to do next.
                </p>

              </div>

            </div>

            {/* THREE BUTTONS */}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={analyseEnquiry}
                disabled={aiLoading}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading
                  ? "🤖 Analysing..."
                  : "🤖 Analyse Enquiry"}
              </button>

              <button
                type="button"
                onClick={draftCustomerResponse}
                disabled={draftLoading}
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {draftLoading
                  ? "✉️ Drafting..."
                  : "✉️ Draft Customer Response"}
              </button>

              <button
                type="button"
                onClick={markContacted}
                disabled={
                  updatingStatus ||
                  lead.status === "contacted"
                }
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lead.status === "contacted"
                  ? "✓ Contacted"
                  : updatingStatus
                  ? "Updating..."
                  : "✓ Mark Contacted"}
              </button>

            </div>

          </div>

          {/* AI ANALYSIS */}

          {aiAnalysis && (
            <div className="border-b border-white/10 p-6">

              <div className="flex items-center justify-between">

                <h3 className="text-lg font-semibold">
                  🤖 AI Analysis
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setAiAnalysis("")
                  }
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>

              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950 p-5 text-sm leading-7 text-slate-300 overflow-x-auto">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => (
        <h1 className="mb-4 mt-6 text-2xl font-bold text-white first:mt-0">
          {children}
        </h1>
      ),

      h2: ({ children }) => (
        <h2 className="mb-3 mt-6 text-xl font-bold text-white">
          {children}
        </h2>
      ),

      h3: ({ children }) => (
        <h3 className="mb-2 mt-5 text-lg font-semibold text-white">
          {children}
        </h3>
      ),

      p: ({ children }) => (
        <p className="mb-4 leading-7 text-slate-300 last:mb-0">
          {children}
        </p>
      ),

      strong: ({ children }) => (
        <strong className="font-semibold text-white">
          {children}
        </strong>
      ),

      ul: ({ children }) => (
        <ul className="mb-4 ml-6 list-disc space-y-2">
          {children}
        </ul>
      ),

      ol: ({ children }) => (
        <ol className="mb-4 ml-6 list-decimal space-y-2">
          {children}
        </ol>
      ),

      li: ({ children }) => (
        <li className="pl-1 leading-6">
          {children}
        </li>
      ),

      table: ({ children }) => (
        <div className="my-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            {children}
          </table>
        </div>
      ),

      thead: ({ children }) => (
        <thead className="bg-slate-800 text-slate-200">
          {children}
        </thead>
      ),

      tbody: ({ children }) => (
        <tbody className="divide-y divide-white/10">
          {children}
        </tbody>
      ),

      tr: ({ children }) => (
        <tr className="transition hover:bg-white/[0.02]">
          {children}
        </tr>
      ),

      th: ({ children }) => (
        <th className="border-b border-white/10 px-4 py-3 text-left font-semibold text-white">
          {children}
        </th>
      ),

      td: ({ children }) => (
        <td className="px-4 py-3 align-top text-slate-300">
          {children}
        </td>
      ),

      blockquote: ({ children }) => (
        <blockquote className="my-4 border-l-4 border-blue-500/50 pl-4 text-slate-400">
          {children}
        </blockquote>
      ),
    }}
  >
    {aiAnalysis}
  </ReactMarkdown>
</div>

            </div>
          )}

          {/* CUSTOMER RESPONSE */}

          {customerResponse && (
            <div className="p-6">

              <div className="flex items-center justify-between">

                <h3 className="text-lg font-semibold">
                  ✉️ Suggested Customer Response
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setCustomerResponse("")
                  }
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>

              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950 p-5">

               <div className="text-sm leading-7 text-slate-300">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => (
        <p className="mb-4 whitespace-pre-wrap leading-7 last:mb-0">
          {children}
        </p>
      ),

      strong: ({ children }) => (
        <strong className="font-semibold text-white">
          {children}
        </strong>
      ),

      ul: ({ children }) => (
        <ul className="mb-4 ml-6 list-disc space-y-2">
          {children}
        </ul>
      ),

      ol: ({ children }) => (
        <ol className="mb-4 ml-6 list-decimal space-y-2">
          {children}
        </ol>
      ),

      li: ({ children }) => (
        <li className="pl-1 leading-6">
          {children}
        </li>
      ),
    }}
  >
    {customerResponse}
  </ReactMarkdown>
</div>

              </div>

              <div className="mt-4 flex flex-wrap gap-3">

                {lead.email && (
                  <a
                    href={`mailto:${lead.email}?subject=${encodeURIComponent(
                      `Regarding your enquiry`
                    )}&body=${encodeURIComponent(
                      customerResponse
                    )}`}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
                  >
                    Open Email
                  </a>
                )}

                <button
                  type="button"
                  onClick={copyResponse}
                  className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  {copied
                    ? "✓ Copied"
      	   : "Copy Message"}
   	   </button>

              </div>

            </div>
          )}

        </section>

        {/* FOLLOW UP */}

        <section className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-6">

          <h2 className="text-lg font-semibold">
            Follow-up
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Keep this enquiry moving by contacting the customer and updating its status.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">

            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Email enquiry
              </a>
            )}

            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                Call enquiry
              </a>
            )}

          </div>

        </section>

        {/* CREATED */}

        <div className="mt-6 text-xs text-slate-600">
          Enquiry created{" "}
          {new Date(
            lead.created_at
          ).toLocaleDateString("en-GB")}
        </div>

      </div>

    </main>
  );
}