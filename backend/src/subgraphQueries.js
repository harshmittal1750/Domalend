/**
 * @fileoverview Subgraph Query Functions
 * @description Functions to query all fractional tokens and related data from Doma Subgraph
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
 * Query to get all fractional tokens (Doma API schema)
 * No parameters - fetches all tokens directly
 */
const GET_ALL_FRACTIONAL_TOKENS = gql`
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
 * Fetches all fractional token addresses from the Doma API
 * @returns {Promise<string[]>} Array of token addresses
 */
export async function getAllFractionalTokenAddresses() {
  try {
    console.log("Fetching all fractional token addresses from Doma API...");

    const allTokenAddresses = [];

    // Fetch all tokens in one query (no pagination parameters supported)
    const data = await graphQLClient.request(GET_ALL_FRACTIONAL_TOKENS);

    if (
      data.fractionalTokens &&
      data.fractionalTokens.items &&
      data.fractionalTokens.items.length > 0
    ) {
      const addresses = data.fractionalTokens.items.map((token) =>
        token.address.toLowerCase()
      );
      allTokenAddresses.push(...addresses);
      console.log(
        `Fetched ${addresses.length} tokens (total: ${data.fractionalTokens.totalCount})`
      );
    }

    console.log(
      `✓ Total fractional tokens found: ${allTokenAddresses.length}\n`
    );
    return allTokenAddresses;
  } catch (error) {
    console.error("Error fetching fractional token addresses:", error.message);
    if (error.response) {
      console.error(
        "API Error:",
        JSON.stringify(error.response.errors, null, 2)
      );
    }
    throw error;
  }
}

/**
 * Fetches summary information for all fractional tokens
 * @returns {Promise<Object[]>} Array of token summary objects
 */
export async function getAllFractionalTokensSummary() {
  try {
    console.log("Fetching fractional tokens summary from Doma API...");

    const allTokens = [];

    // Fetch all tokens in one query (no pagination parameters supported)
    const data = await graphQLClient.request(GET_ALL_FRACTIONAL_TOKENS);

    if (
      data.fractionalTokens &&
      data.fractionalTokens.items &&
      data.fractionalTokens.items.length > 0
    ) {
      const summaries = data.fractionalTokens.items.map((token) => {
        const domainName = token.name || token.params?.name || "Unknown";
        const tldMatch = domainName.match(/\.([a-z]+)$/i);
        const tld = tldMatch ? tldMatch[1] : "unknown";
        const nameWithoutTld = domainName.replace(/\.[a-z]+$/i, "");

        return {
          address: token.address.toLowerCase(),
          domainName: domainName,
          tld: tld,
          nameLength: nameWithoutTld.length,
          totalSupply: token.params?.totalSupply || "0",
          currentPrice: token.currentPrice || "0",
          status: token.status,
          chain: token.chain?.name || "Unknown",
          networkId: token.chain?.networkId || "",
        };
      });

      allTokens.push(...summaries);
      console.log(
        `Fetched ${summaries.length} tokens (total: ${data.fractionalTokens.totalCount})`
      );
    }

    console.log(`✓ Total tokens with summary: ${allTokens.length}\n`);
    return allTokens;
  } catch (error) {
    console.error("Error fetching token summaries:", error.message);
    if (error.response) {
      console.error(
        "API Error:",
        JSON.stringify(error.response.errors, null, 2)
      );
    }
    throw error;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log("=== Testing Subgraph Queries ===\n");

  try {
    // Test fetching all token addresses
    const addresses = await getAllFractionalTokenAddresses();
    console.log("Sample addresses:", addresses.slice(0, 5));

    console.log("\n" + "=".repeat(60) + "\n");

    // Test fetching summaries
    const summaries = await getAllFractionalTokensSummary();
    console.log("Sample summaries:");
    summaries.slice(0, 3).forEach((summary) => {
      console.log(`- ${summary.domainName} (${summary.address})`);
    });
  } catch (error) {
    console.error("Error in main:", error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
