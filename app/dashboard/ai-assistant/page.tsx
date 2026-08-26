"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestedQuestions = [
  "What enquiries need my attention today?",
  "Which quotes are waiting for a response?",
  "What should I focus on today?",
  "Draft a follow-up message for my newest enquiry.",
];

export default function AIAssistantPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------------------
  // CHECK AUTHENTICATION
  // ----------------------------------------

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setPageLoading(false);
    }

    checkUser();
  }, []);

  // ----------------------------------------
  // SEND MESSAGE
  // ----------------------------------------

  async function sendMessage(
    event?: FormEvent<HTMLFormElement>
  ) {
    event?.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setError("");

    // ----------------------------------------
    // GET CURRENT SESSION
    // ----------------------------------------

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    // ----------------------------------------
    // CREATE USER MESSAGE
    // ----------------------------------------

    const userMessage: Message = {
      role: "user",
      content: trimmedMessage,
    };

    // Keep the current conversation before adding
    // the new message to the state.
    const updatedMessages: Message[] = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      // ----------------------------------------
      // CALL FLOWPILOT AI API
      // ----------------------------------------

      const response = await fetch(
        "/api/ai-assistant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            question: trimmedMessage,
            chatHistory: updatedMessages,
          }),
        }
      );

      // ----------------------------------------
      // READ RESPONSE SAFELY
      // ----------------------------------------

      const contentType =
        response.headers.get("content-type") || "";

      let result: {
        success?: boolean;
        answer?: string;
        error?: string;
        message?: string;
        code?: string;
      } = {};

      if (
        contentType.includes("application/json")
      ) {
        result = await response.json();
      } else {
        const text = await response.text();

        console.error(
          "FlowPilot AI returned a non-JSON response:",
          text
        );

        throw new Error(
          `AI server returned an unexpected response (${response.status}).`
        );
      }

      // ----------------------------------------
      // HANDLE API ERRORS
      // ----------------------------------------

      if (!response.ok || !result.success) {
        console.error(
          "FlowPilot AI API error:",
          result
        );

        throw new Error(
          result.error ||
            result.message ||
            `FlowPilot AI request failed (${response.status}).`
        );
      }

      // ----------------------------------------
      // VALIDATE AI RESPONSE
      // ----------------------------------------

      if (!result.answer) {
        throw new Error(
          "FlowPilot AI returned an empty response."
        );
      }

      // ----------------------------------------
      // ADD AI RESPONSE TO CHAT
      // ----------------------------------------

      const assistantMessage: Message = {
        role: "assistant",
        content: result.answer,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (err) {
      console.error(
        "AI Assistant request error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while contacting FlowPilot AI."
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // SUGGESTED QUESTION
  // ----------------------------------------

  function useSuggestion(question: string) {
    setMessage(question);
  }

  // ----------------------------------------
  // CLEAR CHAT
  // ----------------------------------------

  function clearChat() {
    setMessages([]);
    setError("");
  }

  // ----------------------------------------
  // PAGE LOADING
  // ----------------------------------------

  if (pageLoading) {
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
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-400 transition hover:text-blue-300"
            >
              ← Back to dashboard
            </Link>

            <div className="mt-4 flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-2xl">
                🤖
              </div>

              <div>
                <p className="text-xs font-semibold tracking-widest text-blue-400">
                  FLOWPILOT AI
                </p>

                <h1 className="text-2xl font-bold sm:text-3xl">
                  AI Assistant
                </h1>
              </div>

            </div>

            <p className="mt-4 max-w-2xl text-sm text-slate-400">
              Your AI Office Manager can help you understand
              enquiries, customers, jobs, quotes and invoices.
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            >
              Clear conversation
            </button>
          )}

        </div>

        {/* MAIN ASSISTANT */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">

          {/* CHAT AREA */}

          <div className="min-h-[420px] p-5 sm:p-8">

            {messages.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 text-3xl">
                  🤖
                </div>

                <h2 className="mt-5 text-2xl font-semibold">
                  How can I help you today?
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Ask FlowPilot about your business data,
                  customer enquiries, quotes, jobs or invoices.
                </p>

                <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">

                  {suggestedQuestions.map(
                    (question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() =>
                          useSuggestion(question)
                        }
                        className="rounded-xl border border-white/10 bg-slate-800/60 p-4 text-left text-sm text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800"
                      >
                        <span className="text-blue-400">
                          ✨
                        </span>

                        <span className="ml-2">
                          {question}
                        </span>
                      </button>
                    )
                  )}

                </div>

              </div>
            ) : (
              <div className="space-y-6">

                {messages.map(
                  (chatMessage, index) => (
                    <div
                      key={`${chatMessage.role}-${index}`}
                      className={
                        chatMessage.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >

                      <div
                        className={
                          chatMessage.role === "user"
                            ? "max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-5 py-4 text-sm leading-6 text-white"
                            : "max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-slate-800 px-5 py-4 text-sm leading-6 text-slate-200"
                        }
                      >

                        <div className="mb-2 text-xs font-semibold opacity-60">
                          {chatMessage.role ===
                          "user"
                            ? "You"
                            : "FlowPilot AI"}
                        </div>

                        <div className="whitespace-pre-wrap">
                          {chatMessage.content}
                        </div>

                      </div>

                    </div>
                  )
                )}

                {loading && (
                  <div className="flex justify-start">

                    <div className="rounded-2xl rounded-bl-md border border-white/10 bg-slate-800 px-5 py-4">

                      <div className="flex items-center gap-2 text-sm text-slate-400">

                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />

                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />

                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />

                        <span className="ml-2">
                          FlowPilot is thinking...
                        </span>

                      </div>

                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

          {/* ERROR */}

          {error && (
            <div className="mx-5 mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:mx-8">
              {error}
            </div>
          )}

          {/* INPUT */}

          <div className="border-t border-white/10 bg-slate-950/50 p-4 sm:p-6">

            <form
              onSubmit={sendMessage}
              className="flex flex-col gap-3 sm:flex-row"
            >

              <input
                type="text"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Ask FlowPilot about your business..."
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !message.trim()
                }
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Thinking..."
                  : "Ask FlowPilot"}
              </button>

            </form>

            <p className="mt-3 text-center text-xs text-slate-600">
              FlowPilot AI uses your business data to provide
              practical assistance. Always review AI-generated
              information before acting on it.
            </p>

          </div>

        </div>

        {/* CAPABILITIES */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-lg">📋</p>

            <h3 className="mt-3 text-sm font-semibold">
              Enquiries
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Find enquiries that need your attention.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-lg">💬</p>

            <h3 className="mt-3 text-sm font-semibold">
              Follow-ups
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Draft professional customer follow-up messages.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-lg">📄</p>

            <h3 className="mt-3 text-sm font-semibold">
              Quotes
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Identify quotes waiting for customer responses.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <p className="text-lg">💰</p>

            <h3 className="mt-3 text-sm font-semibold">
              Invoices
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Understand outstanding and overdue invoices.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}