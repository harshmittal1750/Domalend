export interface FractionalTokensResponse {
  data: {
    fractionalTokens: FractionalTokens;
  };
}

export interface FractionalTokens {
  items: FractionalToken[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface FractionalToken {
  id: string;
  address: string;
  fractionalizedAt: string;
  fractionalizedBy: string;
  boughtOutAt: string | null;
  boughtOutBy: string | null;
  buyoutPrice: string | null;
  status: string;
  poolAddress: string;
  graduatedAt: string;
  launchpadAddress: string;
  vestingWalletAddress: string;
  chain: Chain;
  params: Params;
  fractionalizedTxHash: string;
  boughtOutTxHash: string | null;
  metadataURI: string;
  metadata: Metadata;
  currentPrice: number;
  name: string;
}

export interface Chain {
  name: string;
  networkId: string;
  addressUrlTemplate: string | null;
}

export interface Params {
  initialValuation: number;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  launchpadType: number;
  launchpadSupply: number;
  launchpadFeeBps: number;
  poolSupply: number;
  poolFeeBps: number;
  initialLaunchpadPrice: number;
  finalLaunchpadPrice: number;
  launchStartDate: number;
  launchEndDate: number;
  launchpadData: string;
  vestingCliffSeconds: number;
  vestingDurationSeconds: number;
  initialPoolPrice: number;
  metadataURI: string;
}

export interface Metadata {
  image: string;
  xLink: string;
  primaryWebsite: string;
  title?: string;
  description?: string;
  additionalWebsites: AdditionalWebsite[] | null;
}

export interface AdditionalWebsite {
  name: string;
  url: string;
}
