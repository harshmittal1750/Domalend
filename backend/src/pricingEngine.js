/**
 * @fileoverview DomaRank AI Scoring Engine
 * @description Calculates risk-adjusted valuations for fractional domain tokens
 * based on domain characteristics, sales history, and market data
 */

import { calculateSalesStatistics } from "./dataCollector.js";

/**
 * TLD tier rankings based on popularity and market value
 */
const TLD_TIERS = {
  tier1: ["com", "net", "org", "io", "ai"], // Premium TLDs
  tier2: ["xyz", "co", "app", "dev", "tech"], // Popular new TLDs
  tier3: ["info", "online", "site", "store", "blog"], // Common TLDs
  tier4: [], // Everything else
};

/**
 * Scoring weights for the valuation algorithm
 */
const SCORING_WEIGHTS = {
  length: 50, // Domain length score (50% weight)
  tld: 30, // TLD quality score (30% weight)
  salesHistory: 20, // Sales performance score (20% weight)
};

/**
 * Calculates a score based on domain name length
 * Shorter domains are generally more valuable
 * @param {number} length - Domain name length (without TLD)
 * @returns {number} Score from 0-100
 */
function calculateLengthScore(length) {
  if (length === 1) return 100; // Single character - extremely rare
  if (length === 2) return 95; // Two characters - very rare
  if (length === 3) return 85; // Three characters - rare
  if (length === 4) return 75; // Four characters - premium
  if (length === 5) return 60; // Five characters - good
  if (length <= 7) return 45; // 6-7 characters - decent
  if (length <= 10) return 30; // 8-10 characters - average
  if (length <= 15) return 15; // 11-15 characters - below average
  return 5; // 16+ characters - low value
}

/**
 * Calculates a score based on TLD quality
 * @param {string} tld - Top-level domain (e.g., 'com', 'xyz')
 * @returns {number} Score from 0-100
 */
function calculateTldScore(tld) {
  const normalizedTld = tld.toLowerCase();

  if (TLD_TIERS.tier1.includes(normalizedTld)) return 100;
  if (TLD_TIERS.tier2.includes(normalizedTld)) return 70;
  if (TLD_TIERS.tier3.includes(normalizedTld)) return 40;
  return 20; // Tier 4 or unknown TLDs
}

/**
 * Calculates a score based on sales history performance
 * @param {Object} domainData - Domain data including sales history
 * @returns {number} Score from 0-100
 */
function calculateSalesHistoryScore(domainData) {
  const { salesHistory } = domainData;

  // No sales history = minimum score
  if (!salesHistory || salesHistory.length === 0) {
    return 10;
  }

  const stats = calculateSalesStatistics(domainData);

  // Calculate score based on multiple factors
  let score = 20; // Base score for having any sales

  // Volume factor: More sales = higher score (up to 30 points)
  const volumeScore = Math.min(30, stats.salesCount * 5);
  score += volumeScore;

  // Price trend factor: Higher average price = higher score (up to 30 points)
  // Normalize by dividing by 1 ETH (1e18 wei) and capping at 30
  const avgPriceInEth = stats.averagePrice / 1e18;
  const priceScore = Math.min(30, avgPriceInEth * 10);
  score += priceScore;

  // Recency factor: Recent sales boost score (up to 20 points)
  if (stats.lastSaleDate) {
    const daysSinceLastSale =
      (Date.now() - new Date(stats.lastSaleDate).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceLastSale < 30)
      score += 20; // Within last month
    else if (daysSinceLastSale < 90)
      score += 15; // Within last 3 months
    else if (daysSinceLastSale < 180)
      score += 10; // Within last 6 months
    else if (daysSinceLastSale < 365) score += 5; // Within last year
  }

  return Math.min(100, score);
}

/**
 * Calculates a composite quality score for a domain
 * @param {Object} domainData - Domain data from subgraph
 * @returns {number} Composite score from 0-100
 */
export function calculateDomainScore(domainData) {
  const lengthScore = calculateLengthScore(domainData.nameLength);
  const tldScore = calculateTldScore(domainData.tld);
  const salesScore = calculateSalesHistoryScore(domainData);

  // Apply weighted scoring algorithm
  const compositeScore =
    (SCORING_WEIGHTS.length * lengthScore +
      SCORING_WEIGHTS.tld * tldScore +
      SCORING_WEIGHTS.salesHistory * salesScore) /
    100;

  return compositeScore;
}

/**
 * Calculates risk adjustment factor based on market conditions
 * @param {Object} domainData - Domain data from subgraph
 * @returns {number} Risk multiplier from 0.5 to 1.0
 */
function calculateRiskAdjustment(domainData) {
  let riskFactor = 1.0; // Start with no adjustment

  // Check for market cap volatility
  const marketCap = parseFloat(domainData.marketCap || "0");
  if (marketCap === 0) {
    riskFactor *= 0.7; // Heavy discount for no market cap data
  }

  // Check liquidity based on sales frequency
  const { salesHistory } = domainData;
  if (!salesHistory || salesHistory.length === 0) {
    riskFactor *= 0.8; // Discount for no trading history
  } else if (salesHistory.length < 3) {
    riskFactor *= 0.9; // Slight discount for thin trading
  }

  // Check for recent activity
  const stats = calculateSalesStatistics(domainData);
  if (stats.lastSaleDate) {
    const daysSinceLastSale =
      (Date.now() - new Date(stats.lastSaleDate).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceLastSale > 365) {
      riskFactor *= 0.85; // Discount for stale market
    }
  }

  // Ensure risk factor stays within bounds
  return Math.max(0.5, Math.min(1.0, riskFactor));
}

/**
 * Main function: Calculates risk-adjusted USD valuation for a fractional domain token
 * This is the "AI Scoring Engine" that produces the final price
 *
 * @param {Object} domainData - Domain data from subgraph including:
 *   - nameLength: Domain name length
 *   - tld: Top-level domain
 *   - salesHistory: Array of sales
 *   - marketCap: Current market capitalization
 * @returns {Object} Valuation result with score, price, and details
 */
export function calculateDomaValue(domainData) {
  // Step 1: Calculate domain quality score (0-100)
  const domainScore = calculateDomainScore(domainData);

  // Step 2: Calculate base valuation from market cap
  const marketCap = parseFloat(domainData.marketCap || "0");
  const stats = calculateSalesStatistics(domainData);

  // Use market cap as baseline, or use average sale price if no market cap
  let baseValue;
  if (marketCap > 0) {
    baseValue = marketCap;
  } else if (stats.averagePrice > 0) {
    // Use average price * estimated supply (default 1000 tokens if unknown)
    const estimatedSupply = parseFloat(
      domainData.fractionalToken?.totalSupply || "1000"
    );
    baseValue = stats.averagePrice * estimatedSupply;
  } else {
    // Fallback: Use domain score to estimate value
    // Score-based estimation: 1 ETH base * (score/100) for domains with no data
    baseValue = (1e18 * domainScore) / 100;
  }

  // Step 3: Apply quality multiplier based on domain score
  // Higher quality domains get a premium (up to 2x), lower quality get discount
  const qualityMultiplier = 0.5 + domainScore / 100; // Range: 0.5x to 1.5x

  // Step 4: Apply risk adjustment
  const riskAdjustment = calculateRiskAdjustment(domainData);

  // Step 5: Calculate final risk-adjusted valuation
  const finalValuation = Math.floor(
    baseValue * qualityMultiplier * riskAdjustment
  );

  // Step 6: Calculate per-token price (in 18 decimals)
  const totalSupply = parseFloat(
    domainData.fractionalToken?.totalSupply || "1"
  );
  const pricePerToken =
    totalSupply > 0 ? Math.floor(finalValuation / totalSupply) : finalValuation;

  return {
    // Final price in USD with 18 decimals (Wei format)
    priceUSD18Decimals: pricePerToken.toString(),

    // Detailed breakdown
    breakdown: {
      domainScore: domainScore.toFixed(2),
      lengthScore: calculateLengthScore(domainData.nameLength).toFixed(2),
      tldScore: calculateTldScore(domainData.tld).toFixed(2),
      salesScore: calculateSalesHistoryScore(domainData).toFixed(2),
      baseValue: baseValue.toString(),
      qualityMultiplier: qualityMultiplier.toFixed(3),
      riskAdjustment: riskAdjustment.toFixed(3),
      finalValuation: finalValuation.toString(),
      totalSupply: totalSupply.toString(),
      pricePerToken: pricePerToken.toString(),
    },

    // Human-readable values
    humanReadable: {
      priceInETH: (pricePerToken / 1e18).toFixed(6),
      priceInUSD: `$${(pricePerToken / 1e18).toFixed(2)}`, // Assuming 1 ETH ≈ $1 for simplicity
      totalValuationInETH: (finalValuation / 1e18).toFixed(6),
      totalValuationInUSD: `$${(finalValuation / 1e18).toFixed(2)}`,
      qualityRating:
        domainScore >= 80
          ? "Excellent"
          : domainScore >= 60
            ? "Good"
            : domainScore >= 40
              ? "Average"
              : "Below Average",
    },

    // Metadata
    metadata: {
      domainName: domainData.domainName,
      tld: domainData.tld,
      nameLength: domainData.nameLength,
      tokenAddress: domainData.tokenAddress,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  };
}

/**
 * Batch calculation for multiple domains
 * @param {Object[]} domainsData - Array of domain data objects
 * @returns {Object[]} Array of valuation results
 */
export function calculateMultipleDomaValues(domainsData) {
  return domainsData.map((domainData) => {
    try {
      return calculateDomaValue(domainData);
    } catch (error) {
      console.error(
        `Error calculating value for ${domainData.tokenAddress}:`,
        error.message
      );
      return null;
    }
  });
}

/**
 * Export scoring weights for external configuration
 */
export const scoringConfig = {
  weights: SCORING_WEIGHTS,
  tldTiers: TLD_TIERS,
};
