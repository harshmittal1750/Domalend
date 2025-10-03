"use client";

import { ethersAdapter, projectId, networks } from "@/config";
import { createAppKit } from "@reown/appkit/react";
import React, { type ReactNode } from "react";
if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
  name: "Catalex Finance",
  description:
    "Catalex Finance a secure , smart and permission less  way to lend/borrow",
  url: "https://www.catalex.finance", // origin must match your domain & subdomain
  icons: ["https://www.catalex.finance/logo.png"],
};

// Create the modal
export const modal = createAppKit({
  adapters: [ethersAdapter],
  projectId,
  networks,
  metadata,
  chainImages: {
    97476:
      "https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/0f6780a4fb6f540b3f797.png",
  },

  themeMode: "dark",
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    history: false,
    swaps: false,
    onramp: false,
    send: false,
    email: false,
    socials: false,
    receive: false,
    pay: false,
  },
  themeVariables: {
    "--w3m-accent": "#139C93",
    "--w3m-border-radius-master": "8px",
  },
});

function ContextProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default ContextProvider;
