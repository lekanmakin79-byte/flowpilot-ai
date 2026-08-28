import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkInvoiceAccess,
} from "@/lib/subscription-access";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| SUPABASE ADMIN CLIENT
|--------------------------------------------------------------------------
*/

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
|--------------------------------------------------------------------------
| AUTHENTICATE REQUEST
|--------------------------------------------------------------------------
*/

async function getAuthenticatedUser(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !/^Bearer\s+/i.test(
      authorization
    )
  ) {
    return null;
  }

  const accessToken =
    authorization
      .replace(
        /^Bearer\s+/i,
        ""
      )
      .trim();

  if (!accessToken) {
    return null;
  }

  const supabase =
    getSupabaseAdmin();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser(
      accessToken
    );

  if (
    error ||
    !user
  ) {
    console.error(
      "Invoice authentication error:",
      error
    );

    return null;
  }

  return user;
}

/*
|--------------------------------------------------------------------------
| VALIDATE STRING
|--------------------------------------------------------------------------
*/

function requiredString(
  value: unknown
) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

/*
|--------------------------------------------------------------------------
| GET REQUEST BODY
|--------------------------------------------------------------------------
*/

interface InvoiceItemInput {
  description: unknown;
  quantity: unknown;
  unit_price: unknown;
}

interface CreateInvoiceBody {
  businessId?: unknown;
  customerId?: unknown;
  quoteId?: unknown;
  jobId?: unknown;
  invoiceNumber?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  subtotal?: unknown;
  tax?: unknown;
  total?: unknown;
  dueDate?: unknown;
  notes?: unknown;
  items?: unknown;
}

/*
|--------------------------------------------------------------------------
| POST /api/invoices
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request
) {
  try {
    /*
     * --------------------------------------------------------------
     * AUTHENTICATION
     * --------------------------------------------------------------
     */

    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          allowed: false,
          code: "UNAUTHENTICATED",
          error:
            "Your session has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * READ BODY
     * --------------------------------------------------------------
     */

    let body: CreateInvoiceBody;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_REQUEST",
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * REQUIRED FIELDS
     * --------------------------------------------------------------
     */

    const businessId =
      typeof body.businessId ===
      "string"
        ? body.businessId.trim()
        : "";

    const customerId =
      typeof body.customerId ===
      "string"
        ? body.customerId.trim()
        : "";

    const invoiceNumber =
      typeof body.invoiceNumber ===
      "string"
        ? body.invoiceNumber.trim()
        : "";

    const title =
      typeof body.title ===
      "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const quoteId =
      requiredString(
        body.quoteId
      )
        ? String(
            body.quoteId
          ).trim()
        : null;

    const jobId =
      requiredString(
        body.jobId
      )
        ? String(
            body.jobId
          ).trim()
        : null;

    const dueDate =
      requiredString(
        body.dueDate
      )
        ? String(
            body.dueDate
          ).trim()
        : null;

    const notes =
      typeof body.notes ===
      "string"
        ? body.notes.trim()
        : "";

    /*
     * --------------------------------------------------------------
     * VALIDATE REQUIRED VALUES
     * --------------------------------------------------------------
     */

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_BUSINESS",
          error:
            "Business information is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CUSTOMER",
          error:
            "A customer is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!invoiceNumber) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_INVOICE_NUMBER",
          error:
            "Invoice number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_TITLE",
          error:
            "Invoice title is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * VALIDATE INVOICE NUMBER LENGTH
     * --------------------------------------------------------------
     */

    if (
      invoiceNumber.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_INVOICE_NUMBER",
          error:
            "Invoice number is too long.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * ITEMS
     * --------------------------------------------------------------
     */

    if (
      !Array.isArray(
        body.items
      ) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_ITEMS",
          error:
            "At least one invoice item is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.items.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_ITEMS",
          error:
            "An invoice cannot contain more than 100 items.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * NORMALISE ITEMS
     * --------------------------------------------------------------
     */

    const invoiceItems =
      body.items.map(
        (
          item: InvoiceItemInput,
          index: number
        ) => {
          const itemDescription =
            typeof item?.description ===
            "string"
              ? item.description.trim()
              : "";

          const quantity =
            Number(
              item?.quantity
            );

          const unitPrice =
            Number(
              item?.unit_price
            );

          if (
            !itemDescription
          ) {
            throw new Error(
              `Invoice item ${index + 1} requires a description.`
            );
          }

          if (
            !Number.isFinite(
              quantity
            ) ||
            quantity <= 0
          ) {
            throw new Error(
              `Invoice item ${index + 1} has an invalid quantity.`
            );
          }

          if (
            !Number.isFinite(
              unitPrice
            ) ||
            unitPrice < 0
          ) {
            throw new Error(
              `Invoice item ${index + 1} has an invalid unit price.`
            );
          }

          /*
           * Prevent extreme values from entering the database.
           */

          if (
            quantity > 1000000
          ) {
            throw new Error(
              `Invoice item ${index + 1} quantity is too large.`
            );
          }

          if (
            unitPrice > 100000000
          ) {
            throw new Error(
              `Invoice item ${index + 1} price is too large.`
            );
          }

          const amount =
            quantity *
            unitPrice;

          if (
            !Number.isFinite(
              amount
            ) ||
            amount < 0
          ) {
            throw new Error(
              `Invoice item ${index + 1} has an invalid amount.`
            );
          }

          return {
            description:
              itemDescription,
            quantity,
            unit_price:
              unitPrice,
            amount,
          };
        }
      );

    /*
     * --------------------------------------------------------------
     * CALCULATE TOTALS ON THE SERVER
     * --------------------------------------------------------------
     *
     * NEVER trust subtotal/tax/total values supplied by the browser.
     * --------------------------------------------------------------
     */

    const calculatedSubtotal =
      invoiceItems.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.amount,
        0
      );

    const tax =
      Number(
        body.tax
      );

    if (
      !Number.isFinite(
        tax
      ) ||
      tax < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_TAX",
          error:
            "Tax cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      tax > 100000000
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_TAX",
          error:
            "Tax value is too large.",
        },
        {
          status: 400,
        }
      );
    }

    const subtotal =
      Number(
        calculatedSubtotal.toFixed(
          2
        )
      );

    const total =
      Number(
        (
          subtotal +
          tax
        ).toFixed(2)
      );

    /*
     * --------------------------------------------------------------
     * SUPABASE
     * --------------------------------------------------------------
     */

    const supabase =
      getSupabaseAdmin();

    /*
     * --------------------------------------------------------------
     * VERIFY BUSINESS OWNERSHIP
     * --------------------------------------------------------------
     */

    const {
      data: business,
      error: businessError,
    } =
      await supabase
        .from("businesses")
        .select("id")
        .eq(
          "id",
          businessId
        )
        .eq(
          "owner_id",
          user.id
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Invoice business lookup error:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          code: "BUSINESS_LOOKUP_ERROR",
          error:
            "Unable to verify your business.",
        },
        {
          status: 500,
        }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          code: "BUSINESS_ACCESS_DENIED",
          error:
            "You do not have access to this business.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * VERIFY CUSTOMER BELONGS TO BUSINESS
     * --------------------------------------------------------------
     */

    const {
      data: customer,
      error: customerError,
    } =
      await supabase
        .from("customers")
        .select("id")
        .eq(
          "id",
          customerId
        )
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();

    if (
      customerError
    ) {
      console.error(
        "Invoice customer lookup error:",
        customerError
      );

      return NextResponse.json(
        {
          success: false,
          code: "CUSTOMER_LOOKUP_ERROR",
          error:
            "Unable to verify the selected customer.",
        },
        {
          status: 500,
        }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          code: "CUSTOMER_ACCESS_DENIED",
          error:
            "The selected customer does not belong to your business.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * VERIFY JOB
     * --------------------------------------------------------------
     */

    if (jobId) {
      const {
        data: job,
        error: jobError,
      } =
        await supabase
          .from("jobs")
          .select(
            "id, customer_id"
          )
          .eq(
            "id",
            jobId
          )
          .eq(
            "business_id",
            businessId
          )
          .maybeSingle();

      if (
        jobError
      ) {
        console.error(
          "Invoice job lookup error:",
          jobError
        );

        return NextResponse.json(
          {
            success: false,
            code: "JOB_LOOKUP_ERROR",
            error:
              "Unable to verify the selected job.",
          },
          {
            status: 500,
          }
        );
      }

      if (!job) {
        return NextResponse.json(
          {
            success: false,
            code: "JOB_ACCESS_DENIED",
            error:
              "The selected job does not belong to your business.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        job.customer_id !==
        customerId
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "JOB_CUSTOMER_MISMATCH",
            error:
              "The selected job does not belong to the selected customer.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * --------------------------------------------------------------
     * VERIFY QUOTE
     * --------------------------------------------------------------
     */

    if (quoteId) {
      const {
        data: quote,
        error: quoteError,
      } =
        await supabase
          .from("quotes")
          .select(
            "id, customer_id"
          )
          .eq(
            "id",
            quoteId
          )
          .eq(
            "business_id",
            businessId
          )
          .maybeSingle();

      if (
        quoteError
      ) {
        console.error(
          "Invoice quote lookup error:",
          quoteError
        );

        return NextResponse.json(
          {
            success: false,
            code: "QUOTE_LOOKUP_ERROR",
            error:
              "Unable to verify the selected quote.",
          },
          {
            status: 500,
          }
        );
      }

      if (!quote) {
        return NextResponse.json(
          {
            success: false,
            code: "QUOTE_ACCESS_DENIED",
            error:
              "The selected quote does not belong to your business.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        quote.customer_id !==
        customerId
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "QUOTE_CUSTOMER_MISMATCH",
            error:
              "The selected quote does not belong to the selected customer.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * --------------------------------------------------------------
     * SERVER-SIDE SUBSCRIPTION CHECK
     * --------------------------------------------------------------
     *
     * This is authoritative.
     *
     * The browser's earlier subscription check is only for UI.
     * --------------------------------------------------------------
     */

    const access =
      await checkInvoiceAccess(
        businessId,
        user.id
      );

    if (
      !access.allowed
    ) {
      return NextResponse.json(
        {
          success: false,
          allowed: false,
          plan: access.plan,
          limit: access.limit,
          current: access.current,
          remaining:
            access.remaining,
          code: access.code,
          error:
            access.error ||
            "You have reached your invoice limit.",
        },
        {
          status:
            access.code ===
            "FREE_LIMIT_REACHED"
              ? 403
              : 400,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * CREATE INVOICE
     * --------------------------------------------------------------
     */

    const {
      data: invoice,
      error: invoiceError,
    } =
      await supabase
        .from("invoices")
        .insert({
          business_id:
            businessId,

          customer_id:
            customerId,

          quote_id:
            quoteId,

          job_id:
            jobId,

          invoice_number:
            invoiceNumber,

          title,

          description:
            description ||
            null,

          status:
            "draft",

          subtotal,

          tax,

          total,

          due_date:
            dueDate,

          notes:
            notes ||
            null,
        })
        .select("id")
        .single();

    if (
      invoiceError ||
      !invoice
    ) {
      console.error(
        "Invoice creation error:",
        invoiceError
      );

      /*
       * Unique invoice number violation.
       */

      if (
        invoiceError?.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "DUPLICATE_INVOICE_NUMBER",
            error:
              "That invoice number already exists for this business.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "INVOICE_CREATION_ERROR",
          error:
            invoiceError?.message ||
            "Unable to create invoice.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * CREATE INVOICE ITEMS
     * --------------------------------------------------------------
     */

    const rows =
      invoiceItems.map(
        (item) => ({
          invoice_id:
            invoice.id,

          description:
            item.description,

          quantity:
            item.quantity,

          unit_price:
            item.unit_price,

          amount:
            item.amount,
        })
      );

    const {
      error: itemsError,
    } =
      await supabase
        .from(
          "invoice_items"
        )
        .insert(rows);

    if (
      itemsError
    ) {
      console.error(
        "Invoice items creation error:",
        itemsError
      );

      /*
       * ------------------------------------------------------------
       * CLEAN UP ORPHAN INVOICE
       * ------------------------------------------------------------
       */

      const {
        error: cleanupError,
      } =
        await supabase
          .from("invoices")
          .delete()
          .eq(
            "id",
            invoice.id
          )
          .eq(
            "business_id",
            businessId
          );

      if (
        cleanupError
      ) {
        console.error(
          "Invoice cleanup error:",
          cleanupError
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "INVOICE_ITEMS_CREATION_ERROR",
          error:
            itemsError.message ||
            "Unable to save invoice items.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        invoice: {
          id:
            invoice.id,

          business_id:
            businessId,

          customer_id:
            customerId,

          quote_id:
            quoteId,

          job_id:
            jobId,

          invoice_number:
            invoiceNumber,

          title,

          description:
            description ||
            null,

          status:
            "draft",

          subtotal,

          tax,

          total,

          due_date:
            dueDate,

          notes:
            notes ||
            null,
        },

        subscription: {
          plan:
            access.plan,

          limit:
            access.limit,

          current:
            access.current + 1,

          remaining:
            access.limit ===
            null
              ? null
              : Math.max(
                  access.limit -
                    (access.current + 1),
                  0
                ),
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Invoice API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        code: "INVOICE_API_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Unable to create invoice.",
      },
      {
        status: 500,
      }
    );
  }
}