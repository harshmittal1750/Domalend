import { Metadata } from "next";
import React from "react";

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  structuredData?: object;
}

const defaultKeywords = [
  "web3 lending",
  "crypto loans",
  "p2p crypto lending",
  "decentralized finance",
  "DeFi lending",
  "borrow crypto",
  "lend crypto",
  "stablecoin loans",
  "blockchain finance",
  "peer to peer lending",
  "cryptocurrency lending platform",
  "earn interest on crypto",
  "crypto collateral loans",
  "DreamLend Finance",
];

const siteConfig = {
  name: "DreamLend Finance",
  description:
    "The future of decentralized lending. A peer-to-peer lending platform built on Somnia L1.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://dreamlend.finance",
  ogImage: "/og-image.png",
  twitterHandle: "@DreamlendFi",
  creator: "DreamLend Team",
};

export function generateSEOMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    ogImage,
    noIndex = false,
    structuredData,
  } = config;

  const fullTitle = title.includes(siteConfig.name)
    ? title
    : `${title} | ${siteConfig.name}`;

  const allKeywords = [...defaultKeywords, ...keywords];

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: [{ name: siteConfig.creator }],
    creator: siteConfig.creator,
    publisher: siteConfig.name,

    // Canonical URL
    alternates: canonical
      ? {
          canonical: canonical.startsWith("http")
            ? canonical
            : `${siteConfig.url}${canonical}`,
        }
      : undefined,

    // Open Graph
    openGraph: {
      type: "website",
      title: fullTitle,
      description,
      url: canonical ? `${siteConfig.url}${canonical}` : siteConfig.url,
      siteName: siteConfig.name,
      locale: "en_US",
      images: [
        {
          url: ogImage || siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
    },

    // Twitter
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: fullTitle,
      description,
      images: [ogImage || siteConfig.ogImage],
    },

    // Robots
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Additional metadata
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },

    // Verification (to be updated with actual codes)
    verification: {
      google: process.env.GOOGLE_VERIFICATION_CODE,
      yandex: process.env.YANDEX_VERIFICATION_CODE,
      yahoo: process.env.BING_VERIFICATION_CODE,
      // other:process.env.BING_VERIFICATION_CODE,
    },
  };

  return metadata;
}

// Structured Data Schemas
export const generateFinancialProductSchema = (product: {
  name: string;
  description: string;
  url: string;
  provider: string;
  category: string;
  interestRate?: string;
  minAmount?: string;
  maxAmount?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  name: product.name,
  description: product.description,
  url: product.url,
  provider: {
    "@type": "Organization",
    name: product.provider,
    url: siteConfig.url,
  },
  category: product.category,
  ...(product.interestRate && { interestRate: product.interestRate }),
  ...(product.minAmount && {
    amount: { "@type": "MonetaryAmount", minValue: product.minAmount },
  }),
  ...(product.maxAmount && {
    amount: { "@type": "MonetaryAmount", maxValue: product.maxAmount },
  }),
});

export const generateFAQSchema = (
  faqs: Array<{ question: string; answer: string }>
) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const generateBreadcrumbSchema = (
  breadcrumbs: Array<{ name: string; url: string }>
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: breadcrumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: crumb.url.startsWith("http")
      ? crumb.url
      : `${siteConfig.url}${crumb.url}`,
  })),
});

export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/logo.png`,
  description: siteConfig.description,
  sameAs: [
    "https://twitter.com/dreamlendFi",
    "https://x.com/DreamlendFi",
    // "https://github.com/dreamlend",
    // "https://discord.gg/dreamlend"
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
    email: "harsh@dreamlend.finance",
    availableLanguage: ["English"],
  },
});

// SEO Component for structured data injection
export function StructuredData({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
