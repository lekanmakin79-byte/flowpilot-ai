import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";


export const metadata: Metadata = {
  title: "FlowPilot AI | The AI Office Manager for Small Businesses",

  description:
    "FlowPilot AI helps small businesses manage customers, quotes, invoices and daily tasks with an AI-powered office assistant.",

  keywords: [
    "AI office manager",
    "small business software",
    "AI assistant for tradespeople",
    "business automation",
    "quote management",
    "invoice management",
  ],

  openGraph: {
    title:
      "FlowPilot AI | The AI Office Manager for Small Businesses",

    description:
      "Reduce admin work and spend more time growing your business with FlowPilot AI.",

    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">

     <body>

{children}

<Analytics />

</body>

    </html>
  );

}