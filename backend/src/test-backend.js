/**
 * @fileoverview Test script for oracle-backend.js
 * @description Tests the scoring algorithm with mock data
 */

import { calculateDomaRank } from "./oracle-backend.js";

console.log("🧪 Testing DomaRank Scoring Algorithm\n");
console.log("=".repeat(60));

// Test Case 1: Premium Short Domain
console.log("\nTest Case 1: Premium Short Domain (nft.com)");
console.log("-".repeat(60));

const test1 = {
  fractionalTokenAddress: "0x1234567890123456789012345678901234567890",
  domainName: "nft",
  tld: "com",
  nameLength: 3,
  yearsOnChain: 2.5,
  yearsUntilExpiry: 8.0,
  activeOffersCount: 12,
  livePriceUSD: 10000,
  salesHistoryCount: 50,
  totalSupply: "1000000000000000000000",
};

const result1 = calculateDomaRank(test1);

console.log("Input:", {
  domain: `${test1.domainName}.${test1.tld}`,
  length: test1.nameLength,
  age: test1.yearsOnChain.toFixed(1) + " years",
  expiry: test1.yearsUntilExpiry.toFixed(1) + " years",
  offers: test1.activeOffersCount,
  price: "$" + test1.livePriceUSD,
});

console.log("\nOutput:");
console.log("  DomaRank:", result1.domaRank + "/100");
console.log(
  "  Final Valuation: $" + result1.finalValuationUSD.toLocaleString()
);
console.log("  Breakdown:");
console.log("    - Age Score:", result1.breakdown.ageScore);
console.log("    - Demand Score:", result1.breakdown.demandScore);
console.log("    - Keyword Score:", result1.breakdown.keywordScore);
console.log("    - TLD Score:", result1.breakdown.tldScore);
console.log("    - Length Score:", result1.breakdown.lengthScore);
console.log(
  "    - Risk Adjustment:",
  (result1.breakdown.riskAdjustmentFactor * 100).toFixed(1) + "%"
);

// Test Case 2: Average Domain
console.log("\n" + "=".repeat(60));
console.log("\nTest Case 2: Average Domain (example.xyz)");
console.log("-".repeat(60));

const test2 = {
  fractionalTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  domainName: "example",
  tld: "xyz",
  nameLength: 7,
  yearsOnChain: 0.5,
  yearsUntilExpiry: 2.0,
  activeOffersCount: 2,
  livePriceUSD: 500,
  salesHistoryCount: 5,
  totalSupply: "1000000000000000000000",
};

const result2 = calculateDomaRank(test2);

console.log("Input:", {
  domain: `${test2.domainName}.${test2.tld}`,
  length: test2.nameLength,
  age: test2.yearsOnChain.toFixed(1) + " years",
  expiry: test2.yearsUntilExpiry.toFixed(1) + " years",
  offers: test2.activeOffersCount,
  price: "$" + test2.livePriceUSD,
});

console.log("\nOutput:");
console.log("  DomaRank:", result2.domaRank + "/100");
console.log(
  "  Final Valuation: $" + result2.finalValuationUSD.toLocaleString()
);
console.log("  Breakdown:");
console.log("    - Age Score:", result2.breakdown.ageScore);
console.log("    - Demand Score:", result2.breakdown.demandScore);
console.log("    - Keyword Score:", result2.breakdown.keywordScore);
console.log("    - TLD Score:", result2.breakdown.tldScore);
console.log("    - Length Score:", result2.breakdown.lengthScore);
console.log(
  "    - Risk Adjustment:",
  (result2.breakdown.riskAdjustmentFactor * 100).toFixed(1) + "%"
);

// Test Case 3: New Long Domain
console.log("\n" + "=".repeat(60));
console.log("\nTest Case 3: New, Long Domain (verylongdomainname.tech)");
console.log("-".repeat(60));

const test3 = {
  fractionalTokenAddress: "0x9876543210987654321098765432109876543210",
  domainName: "verylongdomainname",
  tld: "tech",
  nameLength: 18,
  yearsOnChain: 0.1,
  yearsUntilExpiry: 1.0,
  activeOffersCount: 0,
  livePriceUSD: 100,
  salesHistoryCount: 0,
  totalSupply: "1000000000000000000000",
};

const result3 = calculateDomaRank(test3);

console.log("Input:", {
  domain: `${test3.domainName}.${test3.tld}`,
  length: test3.nameLength,
  age: test3.yearsOnChain.toFixed(1) + " years",
  expiry: test3.yearsUntilExpiry.toFixed(1) + " years",
  offers: test3.activeOffersCount,
  price: "$" + test3.livePriceUSD,
});

console.log("\nOutput:");
console.log("  DomaRank:", result3.domaRank + "/100");
console.log(
  "  Final Valuation: $" + result3.finalValuationUSD.toLocaleString()
);
console.log("  Breakdown:");
console.log("    - Age Score:", result3.breakdown.ageScore);
console.log("    - Demand Score:", result3.breakdown.demandScore);
console.log("    - Keyword Score:", result3.breakdown.keywordScore);
console.log("    - TLD Score:", result3.breakdown.tldScore);
console.log("    - Length Score:", result3.breakdown.lengthScore);
console.log(
  "    - Risk Adjustment:",
  (result3.breakdown.riskAdjustmentFactor * 100).toFixed(1) + "%"
);

// Test Case 4: Crypto Keyword Domain
console.log("\n" + "=".repeat(60));
console.log("\nTest Case 4: Crypto Keyword Domain (defi.io)");
console.log("-".repeat(60));

const test4 = {
  fractionalTokenAddress: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  domainName: "defi",
  tld: "io",
  nameLength: 4,
  yearsOnChain: 3.0,
  yearsUntilExpiry: 10.0,
  activeOffersCount: 8,
  livePriceUSD: 15000,
  salesHistoryCount: 100,
  totalSupply: "1000000000000000000000",
};

const result4 = calculateDomaRank(test4);

console.log("Input:", {
  domain: `${test4.domainName}.${test4.tld}`,
  length: test4.nameLength,
  age: test4.yearsOnChain.toFixed(1) + " years",
  expiry: test4.yearsUntilExpiry.toFixed(1) + " years",
  offers: test4.activeOffersCount,
  price: "$" + test4.livePriceUSD.toLocaleString(),
});

console.log("\nOutput:");
console.log("  DomaRank:", result4.domaRank + "/100");
console.log(
  "  Final Valuation: $" + result4.finalValuationUSD.toLocaleString()
);
console.log("  Breakdown:");
console.log("    - Age Score:", result4.breakdown.ageScore);
console.log("    - Demand Score:", result4.breakdown.demandScore);
console.log("    - Keyword Score:", result4.breakdown.keywordScore);
console.log("    - TLD Score:", result4.breakdown.tldScore);
console.log("    - Length Score:", result4.breakdown.lengthScore);
console.log(
  "    - Risk Adjustment:",
  (result4.breakdown.riskAdjustmentFactor * 100).toFixed(1) + "%"
);

// Summary
console.log("\n" + "=".repeat(60));
console.log("TEST SUMMARY");
console.log("=".repeat(60));

const tests = [
  { name: "nft.com (premium)", result: result1 },
  { name: "example.xyz (average)", result: result2 },
  { name: "verylongdomainname.tech (weak)", result: result3 },
  { name: "defi.io (strong)", result: result4 },
];

console.log("\nDomaRank Comparison:");
tests.forEach((test) => {
  const bar = "█".repeat(Math.floor(test.result.domaRank / 2));
  console.log(
    `  ${test.name.padEnd(35)} ${test.result.domaRank
      .toFixed(1)
      .padStart(6)}/100 ${bar}`
  );
});

console.log("\nValuation Comparison:");
tests.forEach((test) => {
  const originalPrice = test.result.breakdown.livePriceUSD;
  const finalPrice = test.result.finalValuationUSD;
  const discount = ((1 - finalPrice / originalPrice) * 100).toFixed(1);

  console.log(
    `  ${test.name.padEnd(35)} $${originalPrice
      .toLocaleString()
      .padStart(10)} → $${finalPrice
      .toLocaleString()
      .padStart(10)} (${discount}% ${discount > 0 ? "discount" : "premium"})`
  );
});

console.log("\n✅ All tests completed successfully!\n");
