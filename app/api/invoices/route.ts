import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canCreateInvoice } from "@/lib/subscription-access";

type InvoiceItemInput = {
  description: string;
  quantity: number;
  unit_price: number;
};

type CreateInvoiceRequest = {
  businessId: string;
  customerId: string;
  jobId?: string | null;
  invoiceNumber: string;
  title: string;
  description?: string | null;
  tax?: number;
  dueDate?: string | null;
  notes?: string | null;
  items: InvoiceItemInput[];
};

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

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

function getSupabaseAuthClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase client configuration is missing."
    );
  }

  return createClient(
    url,
    anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * --------------------------------------------------
     * 1. Authenticate the request
     * --------------------------------------------------
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.substring(
        "Bearer ".length
      );

    const authClient =
      getSupabaseAuthClient();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await authClient.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Your session is invalid or has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 2. Read request data
     * --------------------------------------------------
     */

    const body =
      (await request.json()) as CreateInvoiceRequest;

    const {
      businessId,
      customerId,
      jobId,
      invoiceNumber,
      title,
      description,
      tax,
      dueDate,
      notes,
      items,
    } = body;

    /*
     * --------------------------------------------------
     * 3. Basic validation
     * --------------------------------------------------
     */

    if (!businessId) {
      return NextResponse.json(
        {
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
          error:
            "Please select a customer.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !invoiceNumber ||
      !invoiceNumber.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter an invoice number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !title ||
      !title.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter an invoice title.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please add at least one invoice item.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 4. Get admin client
     * --------------------------------------------------
     */

    const supabase =
      getSupabaseAdmin();

    /*
     * --------------------------------------------------
     * 5. Verify that the logged-in user owns
     *    the requested business
     * --------------------------------------------------
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
      businessError ||
      !business
    ) {
      console.error(
        "Business ownership error:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your business.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 6. Verify customer belongs to the business
     * --------------------------------------------------
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
      customerError ||
      !customer
    ) {
      return NextResponse.json(
        {
          error:
            "The selected customer does not belong to your business.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 7. Verify job if supplied
     * --------------------------------------------------
     */

    if (jobId) {
      const {
        data: job,
        error: jobError,
      } =
        await supabase
          .from("jobs")
          .select("id")
          .eq(
            "id",
            jobId
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "customer_id",
            customerId
          )
          .maybeSingle();

      if (
        jobError ||
        !job
      ) {
        return NextResponse.json(
          {
            error:
              "The selected job is not valid for this customer.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * --------------------------------------------------
     * 8. CHECK SUBSCRIPTION LIMIT BEFORE INSERT
     * --------------------------------------------------
     *
     * This is the important part.
     *
     * The previous implementation inserted the invoice
     * first and checked the limit afterwards.
     *
     * That allowed a Free user to exceed the limit.
     */

    const access =
      await canCreateInvoice(
        user.id,
        businessId
      );

    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.error ||
            "You have reached the Free plan invoice limit.",
          code:
            access.code ||
            "FREE_LIMIT_REACHED",
          plan: access.plan,
          limit: access.limit,
          current: access.current,
          remaining:
            access.remaining,
        },
        {
          status: 403,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 9. Validate invoice items
     * --------------------------------------------------
     */

    const cleanedItems =
      items.map(
        (item) => ({
          description:
            String(
              item.description ?? ""
            ).trim(),

          quantity:
            Number(
              item.quantity
            ),

          unit_price:
            Number(
              item.unit_price
            ),
        })
      );

    const hasInvalidItem =
      cleanedItems.some(
        (item) =>
          !item.description ||
          !Number.isFinite(
            item.quantity
          ) ||
          item.quantity <= 0 ||
          !Number.isFinite(
            item.unit_price
          ) ||
          item.unit_price < 0
      );

    if (hasInvalidItem) {
      return NextResponse.json(
        {
          error:
            "Please complete every invoice item. Quantity must be greater than zero and price cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 10. Calculate totals on the server
     * --------------------------------------------------
     *
     * Never trust totals sent by the browser.
     */

    const subtotal =
      cleanedItems.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.quantity *
            item.unit_price,
        0
      );

    const taxNumber =
      Number(tax ?? 0);

    if (
      !Number.isFinite(
        taxNumber
      ) ||
      taxNumber < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Tax cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    const total =
      subtotal +
      taxNumber;

    /*
     * --------------------------------------------------
     * 11. Create invoice
     * --------------------------------------------------
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

          job_id:
            jobId || null,

          quote_id:
            null,

          invoice_number:
            invoiceNumber.trim(),

          title:
            title.trim(),

          description:
            description?.trim() ||
            null,

          status:
            "draft",

          subtotal,

          tax:
            taxNumber,

          total,

          due_date:
            dueDate || null,

          notes:
            notes?.trim() ||
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
       * PostgreSQL unique constraint errors,
       * such as duplicate invoice numbers,
       * should be presented more clearly.
       */

      if (
        invoiceError?.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "That invoice number already exists. Please use a different invoice number.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
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
     * --------------------------------------------------
     * 12. Create invoice items
     * --------------------------------------------------
     */

    const invoiceItems =
      cleanedItems.map(
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
            item.quantity *
            item.unit_price,
        })
      );

    const {
      error: itemsError,
    } =
      await supabase
        .from(
          "invoice_items"
        )
        .insert(
          invoiceItems
        );

    if (itemsError) {
      console.error(
        "Invoice items creation error:",
        itemsError
      );

      /*
       * Roll the invoice back if its items
       * cannot be created.
       */

      await supabase
        .from("invoices")
        .delete()
        .eq(
          "id",
          invoice.id
        );

      return NextResponse.json(
        {
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
     * --------------------------------------------------
     * 13. Return success
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,
        invoice: {
          id: invoice.id,
        },
        access,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create invoice API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      {
        status: 500,
      }
    );
  }
}