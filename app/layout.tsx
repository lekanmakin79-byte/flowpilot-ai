import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";


export const metadata: Metadata = {
  metadataBase: new URL("https://flowpilot-ai-orcin.vercel.app"),

  title: {
    default: "FlowPilot AI | AI Office Manager for Small Businesses",
    template: "%s | FlowPilot AI",
  },

  description:
    "FlowPilot AI helps electricians, plumbers, builders, cleaning companies, property services and other small businesses manage quotes, customers, jobs and invoices with AI.",

  keywords: [
    "AI Office Manager",
    "Small Business Software",
    "CRM",
    "Job Management",
    "Quote Generator",
    "Invoice Software",
    "Electrician Software",
    "Plumber CRM",
    "Builder Software",
    "Tradesperson Software",
  ],

  authors: [
    {
      name: "FlowPilot AI",
    },
  ],

  creator: "FlowPilot AI",

  publisher: "FlowPilot AI",

  openGraph: {
    title: "FlowPilot AI",
    description:
      "The AI Office Manager for Small Businesses.",

    url: "https://flowpilot-ai-orcin.vercel.app",

    siteName: "FlowPilot AI",

    locale: "en_GB",

    type: "website",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FlowPilot AI",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "FlowPilot AI",
    description:
      "The AI Office Manager for Small Businesses.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
	const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FlowPilot AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  description:
    "AI Office Manager for small businesses. Manage customers, quotes, jobs and invoices with AI.",
  url: "https://flowpilot-ai-orcin.vercel.app",
  image: "https://flowpilot-ai-orcin.vercel.app/og-image.png",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
  creator: {
    "@type": "Organization",
    name: "FlowPilot AI",
  },
};

  return (
    <html lang="en">

     <body>
	 
	 <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(structuredData),
  }}
/>

{children}

<Analytics />

</body>

    </html>
  );

}