/**
 * @fileoverview Data Collector Service for Doma Fractional Tokens
 * @description Collects domain data from Doma's Subgraph GraphQL API including
 * sales history, TLD, domain name length, and market cap
 */

import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";

dotenv.config();

// Doma Testnet Subgraph endpoint
const DOMA_SUBGRAPH_URL =
  process.env.DOMA_SUBGRAPH_URL || "https://api-testnet.doma.xyz/graphql";
const DOMA_API_KEY = process.env.DOMA_API_KEY || "";

// Initialize GraphQL client with API key authentication
const graphQLClient = new GraphQLClient(DOMA_SUBGRAPH_URL, {
  headers: DOMA_API_KEY
    ? {
        "API-KEY": DOMA_API_KEY,
        "Content-Type": "application/json",
      }
    : {
        "Content-Type": "application/json",
      },
});

/**
 * GraphQL query to fetch fractional tokens (using correct Doma API schema)
 * No parameters - fetches all tokens directly
 */
const GET_FRACTIONAL_TOKENS = gql`
  query FractionalTokens {
    fractionalTokens {
      items {
        id
        address
        fractionalizedAt
        fractionalizedBy
        boughtOutAt
        boughtOutBy
        buyoutPrice
        status
        poolAddress
        graduatedAt
        launchpadAddress
        vestingWalletAddress
        chain {
          name
          networkId
          addressUrlTemplate
        }
        params {
          initialValuation
          name
          symbol
          decimals
          totalSupply
          launchpadType
          launchpadSupply
          launchpadFeeBps
          poolSupply
          poolFeeBps
          initialLaunchpadPrice
          finalLaunchpadPrice
          launchStartDate
          launchEndDate
          launchpadData
          vestingCliffSeconds
          vestingDurationSeconds
          initialPoolPrice
          metadataURI
        }
        fractionalizedTxHash
        boughtOutTxHash
        metadataURI
        metadata {
          image
          xLink
          primaryWebsite
          title
          description
          additionalWebsites {
            name
            url
          }
        }
        currentPrice
        name
      }
      totalCount
      pageSize
      currentPage
      totalPages
      hasPreviousPage
      hasNextPage
    }
  }
`;

/**
 * GraphQL query to fetch price history for a token
 */
const GET_PRICE_HISTORY = gql`
  query FractionalizationBuyoutPriceTimeData(
    $address: AddressCAIP10!
    $startingDate: DateTime!
    $interval: AggregatePeriod!
  ) {
    fractionalizationBuyoutPriceTimeData(
      address: $address
      startingDate: $startingDate
      interval: $interval
    ) {
      periodStart
      price
    }
  }
`;

/**
 * GraphQL query to fetch statistics for a token
 */
const GET_STATISTICS = gql`
  query Statistics(
    $address: AddressCAIP10!
    $timeRange: StatisticsTimeRange!
    $fractionalTokenVestingAddress2: AddressCAIP10!
    $wallets: [AddressCAIP10!]!
  ) {
    statistics {
      totalValueLockedFractionalized
      totalDomains
      fractionalToken(address: $address, timeRange: $timeRange) {
        buyoutPrice {
          price
          date
        }
      }
      fractionalTokenVesting(address: $fractionalTokenVestingAddress2) {
        vestedAmount
        availableForWithdrawalAmount
        withdrawals {
          amount
          to
          date
        }
      }
      walletsSummary(wallets: $wallets) {
        totalSalesUsd
        totalPurchasesUsd
        activeOffersReceivedCount
        activeOffersMadeCount
        activeOffersReceivedUsd
        activeOffersMadeUsd
        listedDomainsCount
        totalOwnedDomainsCount
        activityTlds
        ownedDomainTlds
        ownedDomainChains {
          name
          networkId
          addressUrlTemplate
        }
      }
    }
  }
`;

/**
 * Fetches comprehensive data for a fractional token from Doma's API
 * @param {string} tokenAddress - The address of the fractional token
 * @returns {Promise<Object>} Domain data including price history and metadata
 */
export async function fetchDomainDataByToken(tokenAddress) {
  try {
    console.log(`Fetching data for token: ${tokenAddress}`);

    // Query for all tokens and filter by address
    // The Doma API doesn't support parameters for fractionalTokens query
    const data = await graphQLClient.request(GET_FRACTIONAL_TOKENS);

    if (
      !data.fractionalTokens ||
      !data.fractionalTokens.items ||
      data.fractionalTokens.items.length === 0
    ) {
      throw new Error(`No token found for address: ${tokenAddress}`);
    }

    // Find the token matching our address (case-insensitive)
    const normalizedAddress = tokenAddress.toLowerCase();
    const token = data.fractionalTokens.items.find(
      (item) => item.address.toLowerCase() === normalizedAddress
    );

    if (!token) {
      throw new Error(`Token ${tokenAddress} not found in results`);
    }

    // Optionally fetch price history if needed
    let priceHistory = [];
    try {
      // Format address as CAIP-10 (eip155:chainId:address)
      // Remove "eip155:" prefix if it already exists in networkId
      const chainId = token.chain.networkId.replace(/^eip155:/, "");
      const caip10Address = `eip155:${chainId}:${token.address}`;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Last 30 days

      const historyData = await graphQLClient.request(GET_PRICE_HISTORY, {
        address: caip10Address,
        startingDate: startDate.toISOString(),
        interval: "DAY",
      });

      priceHistory = historyData.fractionalizationBuyoutPriceTimeData || [];
    } catch (error) {
      console.log(`Could not fetch price history: ${error.message}`);
    }

    // Parse and structure the response
    const domainData = parseDomainData(token, priceHistory);

    return domainData;
  } catch (error) {
    console.error(
      `Error fetching domain data for ${tokenAddress}:`,
      error.message
    );
    if (error.response) {
      console.error(
        "API Error:",
        JSON.stringify(error.response.errors, null, 2)
      );
    }
    throw new Error(`Failed to fetch domain data: ${error.message}`);
  }
}

/**
 * Parses the token data from Doma API into a structured format
 * @param {Object} token - Token data from Doma API
 * @param {Array} priceHistory - Price history data
 * @returns {Object} Structured domain data
 */
function parseDomainData(token, priceHistory = []) {
  // Extract domain name from token name or params
  const domainName = token.name || token.params?.name || "unknown";

  // Extract TLD from domain name
  const tldMatch = domainName.match(/\.([a-z]+)$/i);
  const tld = tldMatch ? tldMatch[1] : "unknown";

  // Calculate domain name length (without TLD)
  const nameWithoutTld = domainName.replace(/\.[a-z]+$/i, "");
  const nameLength = nameWithoutTld.length;

  // Calculate market cap
  // IMPORTANT: currentPrice from Doma API is in 8 decimals (not token decimals!)
  // marketCap = totalSupply * currentPriceUSD
  const totalSupply = parseFloat(token.params?.totalSupply || 0);
  const currentPriceRaw = parseFloat(token.currentPrice || 0);
  const currentPriceUSD = currentPriceRaw / Math.pow(10, 8); // Convert from 8 decimals to USD
  const marketCap = (totalSupply * currentPriceUSD).toString();

  // Convert price history to sales history format
  const salesHistory = priceHistory.map((item, index) => ({
    id: `${token.address}-${index}`,
    price: item.price,
    timestamp: new Date(item.periodStart).getTime() / 1000,
    date: item.periodStart,
    buyer: null,
    seller: null,
  }));

  // Sort sales by timestamp (most recent first)
  salesHistory.sort((a, b) => b.timestamp - a.timestamp);

  return {
    tokenAddress: token.address,
    domainName,
    tld,
    nameLength,
    salesHistory,
    marketCap,
    fractionalToken: {
      address: token.address,
      totalSupply: token.params?.totalSupply || "0",
      currentPrice: currentPriceUSD.toString(), // USD price (converted from 8 decimals)
      currentPriceRaw: token.currentPrice || "0", // Raw price from API
      symbol: token.params?.symbol || "",
      decimals: token.params?.decimals || 18,
      status: token.status,
      poolAddress: token.poolAddress,
      initialValuation: token.params?.initialValuation || 0,
    },
    metadata: {
      fractionalizedAt: token.fractionalizedAt,
      fractionalizedBy: token.fractionalizedBy,
      chain: token.chain?.name || "Unknown",
      networkId: token.chain?.networkId || "",
      image: token.metadata?.image,
      title: token.metadata?.title,
      description: token.metadata?.description,
      website: token.metadata?.primaryWebsite,
      xLink: token.metadata?.xLink,
      lastSalePrice: salesHistory.length > 0 ? salesHistory[0].price : null,
      totalSales: salesHistory.length,
    },
  };
}

/**
 * Fetches data for multiple tokens in parallel
 * @param {string[]} tokenAddresses - Array of token addresses
 * @returns {Promise<Object[]>} Array of domain data objects
 */
export async function fetchMultipleDomainData(tokenAddresses) {
  try {
    const promises = tokenAddresses.map((address) =>
      fetchDomainDataByToken(address).catch((err) => {
        console.error(`Failed to fetch data for ${address}:`, err.message);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((result) => result !== null);
  } catch (error) {
    console.error("Error fetching multiple domain data:", error);
    throw error;
  }
}

/**
 * Calculates statistics from sales history
 * @param {Object} domainData - Domain data object
 * @returns {Object} Sales statistics
 */
export function calculateSalesStatistics(domainData) {
  const { salesHistory } = domainData;

  if (!salesHistory || salesHistory.length === 0) {
    return {
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      totalVolume: 0,
      salesCount: 0,
    };
  }

  const prices = salesHistory.map((sale) => parseFloat(sale.price));

  return {
    averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    totalVolume: prices.reduce((sum, price) => sum + price, 0),
    salesCount: salesHistory.length,
    firstSaleDate: salesHistory[salesHistory.length - 1]?.date,
    lastSaleDate: salesHistory[0]?.date,
  };
}

/**
 * Main execution function for testing
 */
async function main() {
  // Example usage
  const testTokenAddress =
    process.env.TEST_TOKEN_ADDRESS ||
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";

  console.log("=== Doma Data Collector ===\n");

  try {
    const domainData = await fetchDomainDataByToken(testTokenAddress);

    console.log("Domain Data:", JSON.stringify(domainData, null, 2));
    console.log("\n--- Sales Statistics ---");

    const stats = calculateSalesStatistics(domainData);
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("Error in main execution:", error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
