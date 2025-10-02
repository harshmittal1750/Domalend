import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ContextProvider from "@/context";
import Navigation from "@/components/Navigation";
import {
  generateSEOMetadata,
  generateOrganizationSchema,
  StructuredData,
} from "@/lib/seo";

export const metadata: Metadata = {
  ...generateSEOMetadata({
    title: "P2P Lending / Borrowing",
    description:
      "Lend, borrow, and earn with DreamLend Finance - the most secure P2P crypto lending platform built on Somnia L1. Get instant crypto loans or earn high yields on your digital assets.",
    canonical: "/",
    keywords: [
      "crypto lending platform",
      "best DeFi lending",
      "secure crypto loans",
      "high yield crypto",
      "Somnia L1 DeFi",
      "institutional crypto lending",
    ],
  }),
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://dreamlend.finance"
  ),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <StructuredData data={generateOrganizationSchema()} />

        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-NFR4X8L7V8"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-NFR4X8L7V8');
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <ContextProvider>
            <div className="relative min-h-screen bg-background transition-colors duration-300">
              <div className="gradient-bg absolute inset-0 -z-10" />
              <Navigation />
              <main className="relative z-10">
                <div className="container mx-auto px-4 lg:px-6 py-6">
                  {children}
                </div>
              </main>
              <Toaster
                position="top-right"
                expand={false}
                richColors={true}
                closeButton={true}
                toastOptions={{
                  style: {
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--card-foreground))",
                  },
                }}
              />
            </div>
          </ContextProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
