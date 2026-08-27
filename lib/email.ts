import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not configured.");
}

export const resend = new Resend(resendApiKey);

export async function sendQuoteFollowUpEmail({
  to,
  customerName,
  quoteNumber,
  message,
}: {
  to: string;
  customerName: string;
  quoteNumber: string;
  message: string;
}) {
  const result = await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ||
      "FlowPilot AI <onboarding@resend.dev>",

    to,

    subject: `Follow-up regarding quote ${quoteNumber}`,

    text: message,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
        <p>${message.replace(/\n/g, "<br />")}</p>

        <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e2e8f0;" />

        <p style="font-size: 12px; color: #94a3b8;">
          Quote: ${quoteNumber}
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(
      result.error.message ||
        "Unable to send quote follow-up email."
    );
  }

  return result.data;
}