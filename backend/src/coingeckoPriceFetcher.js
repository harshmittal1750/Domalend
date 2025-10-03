import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

/**
 * CoinGecko Price Fetcher
 * Fetches real-time prices for crypto tokens from CoinGecko API
 */
export class CoinGeckoPriceFetcher {
  constructor(config = {}) {
    this.apiUrl =
      config.apiUrl ||
      process.env.CRYPTO_API_URL ||
      "https://api.coingecko.com/api/v3";
    this.apiKey = config.apiKey || process.env.CRYPTO_API_KEY || "";

    // Map token symbols to CoinGecko IDs
    this.tokenMapping = {
      MWBTC: "bitcoin",
      MARB: "arbitrum",
      MSOL: "solana",
      USDTEST: "tether", // Official Doma testnet USD token, using USDT price feed
      MUSDC: "usd-coin",
      // Add more mappings as needed
    };

    console.log("🦎 CoinGecko Price Fetcher initialized");
    console.log(`   API URL: ${this.apiUrl}`);

    if (this.apiKey) {
      const keyType = this.apiKey.startsWith("CG-") ? "Demo" : "Pro";
      console.log(`   API Key: ✓ Configured (${keyType} tier)`);
    } else {
      console.log(`   API Key: ⚠ Not configured (using free tier)`);
    }
  }

  /**
   * Fetch price for a single token
   * @param {string} symbol - Token symbol (e.g., "MWBTC")
   * @returns {Promise<{priceUSD: number, priceUSD18Decimals: string}>}
   */
  async fetchPrice(symbol) {
    const coinId = this.tokenMapping[symbol];
    if (!coinId) {
      throw new Error(`No CoinGecko mapping found for token: ${symbol}`);
    }

    try {
      // Build URL with optional API key
      const params = new URLSearchParams({
        ids: coinId,
        vs_currencies: "usd",
        precision: "18", // Request high precision
      });

      const headers = {
        accept: "application/json",
      };

      // Add API key header if configured
      // Demo API uses: x-cg-demo-api-key
      // Pro API uses: x-cg-pro-api-key
      if (this.apiKey) {
        // Detect if it's a demo key (starts with CG-)
        const isDemoKey = this.apiKey.startsWith("CG-");
        headers[isDemoKey ? "x-cg-demo-api-key" : "x-cg-pro-api-key"] =
          this.apiKey;
      }

      const url = `${this.apiUrl}/simple/price?${params}`;

      console.log(`🔍 Fetching ${symbol} (${coinId}) price from CoinGecko...`);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `CoinGecko API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (!data[coinId] || !data[coinId].usd) {
        throw new Error(`No USD price found for ${coinId}`);
      }

      const priceUSD = data[coinId].usd;

      // Convert to 18 decimals for on-chain storage
      const priceUSD18Decimals = ethers.parseUnits(priceUSD.toString(), 18);

      console.log(`   ✓ ${symbol}: $${priceUSD.toFixed(2)}`);

      return {
        symbol,
        coinId,
        priceUSD,
        priceUSD18Decimals: priceUSD18Decimals.toString(),
        timestamp: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      console.error(`❌ Failed to fetch price for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch prices for multiple tokens in batch
   * @param {string[]} symbols - Array of token symbols
   * @returns {Promise<Object[]>}
   */
  async fetchPrices(symbols) {
    console.log(`\n📊 Fetching prices for ${symbols.length} tokens...`);

    const results = [];
    const errors = [];

    // CoinGecko free tier rate limit: 10-30 calls/minute
    // Batch request is more efficient
    try {
      const coinIds = symbols
        .map((symbol) => this.tokenMapping[symbol])
        .filter(Boolean);

      if (coinIds.length === 0) {
        throw new Error("No valid token mappings found");
      }

      const params = new URLSearchParams({
        ids: coinIds.join(","),
        vs_currencies: "usd",
        precision: "18",
      });

      const headers = {
        accept: "application/json",
      };

      if (this.apiKey) {
        // Detect if it's a demo key (starts with CG-)
        const isDemoKey = this.apiKey.startsWith("CG-");
        headers[isDemoKey ? "x-cg-demo-api-key" : "x-cg-pro-api-key"] =
          this.apiKey;
      }

      const url = `${this.apiUrl}/simple/price?${params}`;

      console.log(`🔍 Batch fetching: ${coinIds.join(", ")}`);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `CoinGecko API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      // Process results for each symbol
      for (const symbol of symbols) {
        const coinId = this.tokenMapping[symbol];
        if (!coinId) {
          errors.push({
            symbol,
            error: "No CoinGecko mapping",
          });
          continue;
        }

        if (!data[coinId] || !data[coinId].usd) {
          errors.push({
            symbol,
            coinId,
            error: "No USD price in response",
          });
          continue;
        }

        const priceUSD = data[coinId].usd;
        const priceUSD18Decimals = ethers.parseUnits(priceUSD.toString(), 18);

        results.push({
          symbol,
          coinId,
          priceUSD,
          priceUSD18Decimals: priceUSD18Decimals.toString(),
          timestamp: Math.floor(Date.now() / 1000),
        });

        console.log(`   ✓ ${symbol}: $${priceUSD.toFixed(2)}`);
      }

      if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} price fetch errors:`, errors);
      }

      console.log(`✅ Successfully fetched ${results.length} prices\n`);

      return { results, errors };
    } catch (error) {
      console.error("❌ Batch fetch failed:", error.message);
      throw error;
    }
  }

  /**
   * Add or update token mapping
   * @param {string} symbol - Token symbol
   * @param {string} coinId - CoinGecko coin ID
   */
  addTokenMapping(symbol, coinId) {
    this.tokenMapping[symbol] = coinId;
    console.log(`✓ Added mapping: ${symbol} -> ${coinId}`);
  }

  /**
   * Get all configured token mappings
   * @returns {Object}
   */
  getTokenMappings() {
    return { ...this.tokenMapping };
  }

  /**
   * Test connection to CoinGecko API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      console.log("🧪 Testing CoinGecko API connection...");

      const headers = {
        accept: "application/json",
      };

      if (this.apiKey) {
        // Detect if it's a demo key (starts with CG-)
        const isDemoKey = this.apiKey.startsWith("CG-");
        headers[isDemoKey ? "x-cg-demo-api-key" : "x-cg-pro-api-key"] =
          this.apiKey;
      }

      const response = await fetch(`${this.apiUrl}/ping`, { headers });

      if (!response.ok) {
        console.error(`❌ Connection test failed: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log(`✅ CoinGecko API is reachable:`, data);
      return true;
    } catch (error) {
      console.error("❌ Connection test error:", error.message);
      return false;
    }
  }
}

// Example usage (if run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new CoinGeckoPriceFetcher();

  // Test connection
  await fetcher.testConnection();

  // Test fetching prices
  try {
    const symbols = ["MWBTC", "MARB", "MSOL", "MUSDT", "MUSDC"];
    const { results, errors } = await fetcher.fetchPrices(symbols);

    console.log("\n📊 Final Results:");
    console.log(JSON.stringify(results, null, 2));

    if (errors.length > 0) {
      console.log("\n⚠️ Errors:");
      console.log(JSON.stringify(errors, null, 2));
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
