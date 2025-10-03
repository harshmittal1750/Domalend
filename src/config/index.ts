import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { DOMA_TESTNET_CONFIG } from "@/lib/contracts";

// Get projectId from https://cloud.reown.com
export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694"; // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Define Somnia Testnet for AppKit
const domaTestnet: AppKitNetwork = {
  id: DOMA_TESTNET_CONFIG.id,
  name: DOMA_TESTNET_CONFIG.name,
  nativeCurrency: DOMA_TESTNET_CONFIG.nativeCurrency,
  rpcUrls: DOMA_TESTNET_CONFIG.rpcUrls,
  blockExplorers: DOMA_TESTNET_CONFIG.blockExplorers,
  testnet: DOMA_TESTNET_CONFIG.testnet,
};

export const networks = [domaTestnet] as [AppKitNetwork, ...AppKitNetwork[]];

export const ethersAdapter = new EthersAdapter();
