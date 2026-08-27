import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import {
  canUseAiAssistant,
} from "@/lib/subscription-access";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const groqApiKey =
  process.env.GROQ_API_KEY;

const groq = groqApiKey
  ? new Groq({
      apiKey: groqApiKey,
    })
  : null;

/*
 * =========================================================
 * SUPABASE ADMIN CLIENT
 * =========================================================
 */

function getSupabaseAdmin() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
 * =========================================================
 * AUTHENTICATION
 * =========================================================
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

  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (error || !user) {
    return null;
  }

  return user;
}

/*
 * =========================================================
 * SAFE DATA CLEANING
 * =========================================================
 */

function sanitiseRecord(
  record: Record<string, any>
) {
  const blockedKeys = new Set([
    "password",
    "password_hash",
    "hashed_password",
    "api_key",
    "apikey",
    "secret",
    "service_role_key",
    "access_token",
    "refresh_token",
    "token",
    "auth_token",
    "private_key",
  ]);

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(
    record
  )) {
    if (
      blockedKeys.has(
        key.toLowerCase()
      )
    ) {
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}

/*
 * =========================================================
 * LOAD BUSINESS TABLE
 * =========================================================
 */

async function loadBusinessTable(
  tableName: string,
  businessId: string,
  limit = 50
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabaseAdmin
    .from(tableName)
    .select("*")
    .eq("business_id", businessId)
    .limit(limit);

  if (error) {
    console.warn(
      `FlowPilot AI could not load ${tableName}:`,
      error.message
    );

    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data || []).map((record) =>
      sanitiseRecord(record)
    ),
    error: null,
  };
}

/*
 * =========================================================
 * LOAD BUSINESS PROFILE
 * =========================================================
 */

async function loadBusinessProfile(
  userId: string
) {
  try {
    const supabaseAdmin =
      getSupabaseAdmin();

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) {
      return null;
    }

    return sanitiseRecord(data);
  } catch (error) {
    console.warn(
      "Unable to load business profile:",
      error
    );

    return null;
  }
}

/*
 * =========================================================
 * LOAD USER BUSINESS
 * =========================================================
 */

async function loadUserBusiness(
  userId: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

  if (error) {
    console.warn(
      "Unable to load user's business:",
      error.message
    );

    return {
      data: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      data: null,
      error:
        "No business found for this user.",
    };
  }

  return {
    data: sanitiseRecord(data),
    error: null,
  };
}

/*
 * =========================================================
 * LOAD ALL BUSINESS DATA
 * =========================================================
 */

async function loadBusinessData(
  userId: string
) {
  const businessResult =
    await loadUserBusiness(userId);

  if (
    businessResult.error ||
    !businessResult.data
  ) {
    return {
      business: null,
      profile: null,
      customers: [],
      leads: [],
      jobs: [],
      quotes: [],
      invoices: [],
      summary: {
        customers: 0,
        leads: 0,
        jobs: 0,
        quotes: 0,
        invoices: 0,
      },
      error:
        businessResult.error ||
        "Business not found.",
    };
  }

  const businessId =
    businessResult.data.id;

  const [
    profile,
    customers,
    leads,
    jobs,
    quotes,
    invoices,
  ] = await Promise.all([
    loadBusinessProfile(userId),

    loadBusinessTable(
      "customers",
      businessId
    ),

    loadBusinessTable(
      "leads",
      businessId
    ),

    loadBusinessTable(
      "jobs",
      businessId
    ),

    loadBusinessTable(
      "quotes",
      businessId
    ),

    loadBusinessTable(
      "invoices",
      businessId
    ),
  ]);

  return {
    business:
      businessResult.data,

    profile,

    customers:
      customers.data,

    leads:
      leads.data,

    jobs:
      jobs.data,

    quotes:
      quotes.data,

    invoices:
      invoices.data,

    summary: {
      customers:
        customers.data.length,

      leads:
        leads.data.length,

      jobs:
        jobs.data.length,

      quotes:
        quotes.data.length,

      invoices:
        invoices.data.length,
    },

    error: null,
  };
}

/*
 * =========================================================
 * BUILD BUSINESS CONTEXT
 * =========================================================
 */

function buildBusinessContext(
  businessData: any,
  clientContext: any
) {
  return {
    business:
      businessData.business,

    profile:
      businessData.profile,

    summary:
      businessData.summary,

    customers:
      businessData.customers,

    leads:
      businessData.leads,

    jobs:
      businessData.jobs,

    quotes:
      businessData.quotes,

    invoices:
      businessData.invoices,

    additional_context:
      clientContext || {},
  };
}

/*
 * =========================================================
 * CLEAN AI OUTPUT
 * =========================================================
 */

function cleanAIResponse(
  text: string
) {
  let cleaned = text.trim();

  cleaned = cleaned.replace(
    /<br\s*\/?>/gi,
    "\n"
  );

  cleaned = cleaned.replace(
    /\\+<br\s*\/?>/gi,
    "\n"
  );

  cleaned = cleaned.replace(
    /<\/?p>/gi,
    ""
  );

  cleaned = cleaned.replace(
    /<\/?div[^>]*>/gi,
    ""
  );

  cleaned = cleaned.replace(
    /&bull;\s*/gi,
    "- "
  );

  cleaned = cleaned.replace(
    /&nbsp;/gi,
    " "
  );

  cleaned = cleaned.replace(
    /\n{3,}/g,
    "\n\n"
  );

  return cleaned.trim();
}

/*
 * =========================================================
 * POST
 * =========================================================
 */

export async function POST(
  request: Request
) {
  try {
    /*
     * -----------------------------------------------------
     * CONFIGURATION
     * -----------------------------------------------------
     */

    if (!groqApiKey || !groq) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Groq API key is not configured.",
          code:
            "MISSING_GROQ_KEY",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase server configuration is missing.",
          code:
            "MISSING_SUPABASE_SERVER_CONFIG",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * -----------------------------------------------------
     * AUTHENTICATION
     * -----------------------------------------------------
     */

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
        {
          status: 401,
        }
      );
    }

    /*
     * -----------------------------------------------------
     * AI SUBSCRIPTION ACCESS
     * -----------------------------------------------------
     *
     * IMPORTANT:
     * This check must happen after authentication because
     * user.id is only available after getAuthenticatedUser().
     */

    const aiAccess =
      await canUseAiAssistant(
        user.id
      );

    if (!aiAccess.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            aiAccess.error ||
            "The AI Assistant requires the Professional plan.",
          code:
            aiAccess.code ||
            "PROFESSIONAL_REQUIRED",
          plan:
            aiAccess.plan,
        },
        {
          status: 403,
        }
      );
    }

    /*
     * -----------------------------------------------------
     * READ REQUEST
     * -----------------------------------------------------
     */

    const body =
      await request.json();

    const question =
      body?.question;

    if (
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a question.",
          code:
            "INVALID_QUESTION",
        },
        {
          status: 400,
        }
      );
    }

    const chatHistory =
      Array.isArray(
        body?.chatHistory
      )
        ? body.chatHistory
        : [];

    const clientBusinessContext =
      body?.businessContext || {};

    /*
     * -----------------------------------------------------
     * LOAD BUSINESS DATA
     * -----------------------------------------------------
     */

    const businessData =
      await loadBusinessData(
        user.id
      );

    if (businessData.error) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load your FlowPilot business data.",
          code:
            "BUSINESS_DATA_LOAD_ERROR",
        },
        {
          status: 500,
        }
      );
    }

    const businessContext =
      buildBusinessContext(
        businessData,
        clientBusinessContext
      );

    /*
     * -----------------------------------------------------
     * SYSTEM PROMPT
     * -----------------------------------------------------
     */

    const systemPrompt = `
You are FlowPilot AI, the AI Office Manager
for small businesses.

You operate inside FlowPilot AI.

Your job is to help a business owner understand
and manage their real business information.

You can help with:

- Customers
- Leads
- Enquiries
- Follow-ups
- Quotes
- Jobs
- Invoices
- Customer communication
- Business organisation
- Prioritising work
- Office administration
- Drafting professional customer messages
- Identifying overdue or outstanding work

=========================================================
OUTPUT FORMAT — VERY IMPORTANT
=========================================================

Always return clean Markdown or plain text.

NEVER return HTML.

NEVER output:

<br>
<br/>
</br>
<p>
</p>
<div>
</div>
<table>
</table>

NEVER output escaped HTML such as:

\\<br>
\\<br/>
\\<p>

If you need a new line, use a normal newline.

If you need a list, use Markdown:

- First item
- Second item
- Third item

If you need numbered steps, use:

1. First step.
2. Second step.
3. Third step.

If you use a table, use a normal Markdown table:

| Item | Details |
|---|---|
| Need | Socket repair |
| Priority | Medium |
| Next action | Contact customer |

Do not put HTML tags inside Markdown tables.

Do not put <br> inside table cells.

Do not escape Markdown unnecessarily.

=========================================================
BUSINESS DATA RULES
=========================================================

1. Use the supplied business data for business-specific
   questions.

2. NEVER invent customers, leads, jobs, quotes,
   invoices, amounts, dates or statuses.

3. If requested information does not exist in the supplied
   data, clearly say that the information is unavailable.

4. Do not claim an action was completed unless the
   application actually performed that action.

5. You are an information and drafting assistant.
   You cannot send emails, WhatsApp messages, change
   database records, create invoices, create quotes or
   delete data unless the application explicitly performs
   that action.

6. Never expose passwords, API keys, tokens,
   service-role credentials or other secrets.

7. Protect customer privacy.

8. When analysing business data, be practical and concise.

9. When there are multiple possible priorities, explain
   which should be dealt with first and why.

10. For quotes, pay attention to:
    - draft quotes
    - sent quotes
    - accepted quotes
    - declined quotes
    - quotes awaiting response
    - how long a quote has been waiting

11. For invoices, pay attention to:
    - outstanding invoices
    - overdue invoices
    - paid invoices
    - amounts owed

12. For leads and enquiries, pay particular attention
    to the actual status recorded in FlowPilot.

    A status of "contacted" means the business has marked
    the enquiry as contacted.

    However, the "contacted" status does NOT prove that
    FlowPilot itself contacted the customer, nor does it
    provide evidence of what was discussed.

    Never claim that FlowPilot sent an email, made a phone
    call, spoke with the customer, or completed a follow-up
    unless that action is explicitly recorded in the supplied
    business data.

    If an enquiry is marked "contacted" but there is no
    recorded contact information, say that the enquiry is
    marked as contacted and recommend confirming or
    continuing the follow-up as appropriate.

    Do not treat a status change alone as evidence of a
    specific communication or conversation.

13. When analysing an individual enquiry, clearly distinguish
    between:

    - Information explicitly recorded in the enquiry.
    - Information inferred from the enquiry.
    - Recommended business actions.

    Never present a recommendation or inference as something
    that has already happened.

    Never invent contact history, conversations, appointment
    details, quotes, customer decisions, technical findings,
    or other events.

    If the enquiry status is "contacted", do not assume that
    the customer actually responded or that the contact was
    successful. The status only indicates that the business
    has marked the enquiry as contacted.

    For jobs, pay attention to:
    - upcoming jobs
    - active jobs
    - completed jobs
    - cancelled jobs

14. When asked what the business should focus on today,
    prioritise urgent and commercially important tasks.

15. Use British English.

16. Keep answers concise and easy for a busy small-business
    owner to understand.

17. Never reveal the internal business-context JSON or
    database structure unless specifically asked.

18. If the business has no records in a category, say so
    rather than making assumptions.

=========================================================
CUSTOMER ENQUIRY ANALYSIS
=========================================================

When the user asks you to analyse a customer enquiry,
act as an AI Office Manager helping the business owner
manage and qualify the enquiry.

Your role is to help the business decide what to do next.

Do not act as an electrician, plumber, builder, solicitor,
doctor or other specialist unless the supplied information
explicitly establishes that role.

Do not diagnose technical faults.

Do not claim that a particular fault is dangerous unless
the supplied enquiry contains information that supports
that concern.

For potentially safety-related enquiries, use cautious
business language such as:

"Potentially urgent — confirm whether there are any
immediate safety concerns with the customer."

Do not exaggerate risks.

Do not invent symptoms, incidents, damage or technical
findings.

Use only information contained in the enquiry and the
authenticated business data.

When analysing an enquiry, use these sections:

## Enquiry Analysis

### 1. What the customer appears to need

Clearly summarise what the customer has actually requested.

Do not add technical details that the customer did not
provide.

### 2. Likely urgency

Give a practical business priority based on the information
available.

Use:

- Low
- Medium
- High
- Potentially urgent

If there is not enough information to determine urgency,
say that the urgency needs to be confirmed.

For safety-related enquiries, recommend confirming any
immediate safety concerns rather than diagnosing the issue.

### 3. Recommended next action

Give practical office-management actions such as:

- Contact the customer.
- Confirm missing information.
- Arrange an assessment.
- Arrange a quotation.
- Follow up on an unanswered enquiry.
- Update the enquiry status.

Do not claim that an action has already happened unless
the application has actually performed it.

### 4. Important information to clarify

Use a short Markdown bullet list.

Only request information that is genuinely relevant to
moving the enquiry forward.

### 5. Should the enquiry be contacted immediately?

Answer clearly:

- Yes
- No
- Follow up soon
- Not enough information to determine

Then briefly explain the business reason.

Do not make medical, legal, electrical, plumbing or other
specialist diagnoses.

Do not provide detailed technical repair instructions.

The purpose of this analysis is to help the business owner
manage the enquiry efficiently and professionally.

=========================================================
CUSTOMER RESPONSE DRAFTING
=========================================================

When asked to draft a customer response:

- Thank the customer for contacting the business.
- Acknowledge the enquiry.
- Ask only for information genuinely needed.
- Do not invent prices.
- Do not invent appointment times.
- Do not invent technical findings.
- Do not make promises that were not authorised.
- Encourage the customer to reply.
- Use British English.
- Return only the customer message.
- Do not include analysis.
- Do not include a subject line.
- Do not wrap the message in quotation marks.
- Do not use HTML.
- Do not use <br> tags.
- Use normal paragraphs and Markdown bullets only if necessary.

=========================================================
IMPORTANT
=========================================================

The current customer enquiry supplied by the application
is authoritative.

Do not replace information from the current enquiry with
assumptions from other leads.

If information is missing, say that it needs to be confirmed.
`;

    /*
     * -----------------------------------------------------
     * BUSINESS CONTEXT
     * -----------------------------------------------------
     */

    const contextPrompt = `
REAL FLOWPILOT BUSINESS DATA
FOR THE AUTHENTICATED USER:

${JSON.stringify(
  businessContext,
  null,
  2
)}
`;

    /*
     * -----------------------------------------------------
     * CHAT HISTORY
     * -----------------------------------------------------
     */

    const previousMessages =
      chatHistory
        .filter(
          (message: any) =>
            message &&
            (
              message.role === "user" ||
              message.role === "assistant"
            ) &&
            typeof message.content ===
              "string"
        )
        .slice(-10)
        .map(
          (message: any) => ({
            role:
              message.role,
            content:
              message.content,
          })
        );

    /*
     * -----------------------------------------------------
     * GROQ
     * -----------------------------------------------------
     */

    const completion =
      await groq.chat.completions.create({
        model:
          "openai/gpt-oss-20b",

        temperature: 0.2,

        messages: [
          {
            role: "system",
            content:
              systemPrompt,
          },

          {
            role: "system",
            content:
              contextPrompt,
          },

          ...previousMessages,

          {
            role: "user",
            content:
              question.trim(),
          },
        ],
      });

    /*
     * -----------------------------------------------------
     * GET AI RESPONSE
     * -----------------------------------------------------
     */

    const rawAnswer =
      completion
        .choices?.[0]
        ?.message
        ?.content
        ?.trim();

    if (!rawAnswer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI returned an empty response.",
          code:
            "AI_EMPTY_RESPONSE",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * -----------------------------------------------------
     * CLEAN AI RESPONSE
     * -----------------------------------------------------
     */

    const answer =
      cleanAIResponse(
        rawAnswer
      );

    if (!answer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI returned an empty response after formatting.",
          code:
            "AI_EMPTY_RESPONSE",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * -----------------------------------------------------
     * RESPONSE
     * -----------------------------------------------------
     */

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error(
      "FlowPilot AI Assistant error:",
      error
    );

    /*
     * -----------------------------------------------------
     * RATE LIMIT
     * -----------------------------------------------------
     */

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
        {
          status: 429,
        }
      );
    }

    /*
     * -----------------------------------------------------
     * GENERAL ERROR
     * -----------------------------------------------------
     */

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to generate an AI response right now.",
        code:
          "AI_ASSISTANT_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}