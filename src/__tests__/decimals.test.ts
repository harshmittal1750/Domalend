/**
 * Comprehensive tests for decimal handling utilities
 * Tests conversion accuracy across different token types and decimal places
 */

import {
  toBaseUnit,
  fromBaseUnit,
  formatTokenAmount,
  formatUSDValue,
  BigIntMath,
  DecimalValidation,
  getTokenDisplayPrecision,
  DECIMAL_CONSTANTS,
} from "@/lib/decimals";

describe("Decimal Utilities", () => {
  describe("toBaseUnit", () => {
    test("converts ETH amounts correctly (18 decimals)", () => {
      expect(toBaseUnit("1", 18)).toBe(1000000000000000000n);
      expect(toBaseUnit("1.5", 18)).toBe(1500000000000000000n);
      expect(toBaseUnit("0.1", 18)).toBe(100000000000000000n);
      expect(toBaseUnit("0.000000000000000001", 18)).toBe(1n);
    });

    test("converts USDC amounts correctly (6 decimals)", () => {
      expect(toBaseUnit("1", 6)).toBe(1000000n);
      expect(toBaseUnit("1000", 6)).toBe(1000000000n);
      expect(toBaseUnit("0.01", 6)).toBe(10000n);
      expect(toBaseUnit("0.000001", 6)).toBe(1n);
    });

    test("converts WBTC amounts correctly (8 decimals)", () => {
      expect(toBaseUnit("1", 8)).toBe(100000000n);
      expect(toBaseUnit("0.5", 8)).toBe(50000000n);
      expect(toBaseUnit("0.00000001", 8)).toBe(1n);
    });

    test("handles edge cases", () => {
      expect(toBaseUnit("0", 18)).toBe(0n);
      expect(toBaseUnit("", 18)).toBe(0n);
      expect(toBaseUnit("0.0", 18)).toBe(0n);
    });

    test("handles numeric inputs", () => {
      expect(toBaseUnit(1, 18)).toBe(1000000000000000000n);
      expect(toBaseUnit(0.5, 6)).toBe(500000n);
    });
  });

  describe("fromBaseUnit", () => {
    test("converts ETH base units correctly", () => {
      expect(fromBaseUnit(1000000000000000000n, 18)).toBe("1");
      expect(fromBaseUnit(1500000000000000000n, 18)).toBe("1.5");
      expect(fromBaseUnit(100000000000000000n, 18)).toBe("0.1");
      expect(fromBaseUnit(1n, 18)).toBe("1e-18");
    });

    test("converts USDC base units correctly", () => {
      expect(fromBaseUnit(1000000n, 6)).toBe("1");
      expect(fromBaseUnit(1000000000n, 6)).toBe("1000");
      expect(fromBaseUnit(10000n, 6)).toBe("0.01");
      expect(fromBaseUnit(1n, 6)).toBe("0.000001");
    });

    test("applies precision correctly", () => {
      expect(fromBaseUnit(1500000000000000000n, 18, 2)).toBe("1.50");
      expect(fromBaseUnit(1230000n, 6, 2)).toBe("1.23");
      expect(fromBaseUnit(1239999n, 6, 2)).toBe("1.24"); // Rounds
    });

    test("handles zero values", () => {
      expect(fromBaseUnit(0n, 18)).toBe("0");
      expect(fromBaseUnit(0n, 6, 2)).toBe("0");
    });
  });

  describe("formatTokenAmount", () => {
    test("formats with token symbols", () => {
      expect(formatTokenAmount(1000000000000000000n, 18, "ETH")).toBe("1 ETH");
      expect(formatTokenAmount(1000000n, 6, "USDC")).toBe("1 USDC");
      expect(formatTokenAmount(50000000n, 8, "WBTC", 4)).toBe("0.5000 WBTC");
    });
  });

  describe("formatUSDValue", () => {
    test("formats USD values correctly", () => {
      expect(formatUSDValue(1000000000000000000n, 18, "2000")).toBe(
        "$2,000.00"
      );
      expect(formatUSDValue(1000000n, 6, "1.00")).toBe("$1.00");
      expect(formatUSDValue(500000000000000000n, 18, "3000.50")).toBe(
        "$1,500.25"
      );
    });

    test("handles zero and invalid values", () => {
      expect(formatUSDValue(0n, 18, "2000")).toBe("$0.00");
      expect(formatUSDValue(1000000n, 6, "0")).toBe("$0.00");
      expect(formatUSDValue(1000000n, 6, "")).toBe("$0.00");
    });
  });

  describe("BigIntMath", () => {
    describe("multiply", () => {
      test("multiplies with decimal scaling", () => {
        // 1 ETH (18 decimals) * 2000 USD/ETH (18 decimals) = 2000 USD (18 decimals)
        const result = BigIntMath.multiply(
          1000000000000000000n, // 1 ETH
          2000000000000000000000n, // 2000 USD (18 decimals)
          18, // ETH decimals
          18, // USD decimals
          18 // Result decimals
        );
        expect(result).toBe(2000000000000000000000n); // 2000 USD
      });

      test("handles different decimal combinations", () => {
        // 1000 USDC (6 decimals) * 1.5 rate (18 decimals) = 1500 USDC (6 decimals)
        const result = BigIntMath.multiply(
          1000000000n, // 1000 USDC
          1500000000000000000n, // 1.5 rate
          6, // USDC decimals
          18, // Rate decimals
          6 // Result decimals
        );
        expect(result).toBe(1500000000n); // 1500 USDC
      });
    });

    describe("divide", () => {
      test("divides with decimal scaling", () => {
        // 2000 USD (18 decimals) / 2000 USD/ETH (18 decimals) = 1 ETH (18 decimals)
        const result = BigIntMath.divide(
          2000000000000000000000n, // 2000 USD
          2000000000000000000000n, // 2000 USD/ETH
          18, // USD decimals
          18, // Price decimals
          18 // Result decimals
        );
        expect(result).toBe(1000000000000000000n); // 1 ETH
      });

      test("throws on division by zero", () => {
        expect(() => {
          BigIntMath.divide(1000n, 0n, 18, 18, 18);
        }).toThrow("Division by zero");
      });
    });

    describe("percentage", () => {
      test("calculates percentages correctly", () => {
        // 50% of 1000 USDC
        const result = BigIntMath.percentage(1000000000n, 5000n, 6);
        expect(result).toBe(500000000n); // 500 USDC
      });

      test("calculates basis points correctly", () => {
        // 150% (15000 basis points) of 100 ETH
        const result = BigIntMath.percentage(
          100000000000000000000n,
          15000n,
          18
        );
        expect(result).toBe(150000000000000000000n); // 150 ETH
      });
    });

    describe("ratio", () => {
      test("calculates ratios correctly", () => {
        // 1500 USD collateral / 1000 USD loan = 150% (15000 basis points)
        const result = BigIntMath.ratio(
          1500000000000000000000n, // 1500 USD
          1000000000000000000000n, // 1000 USD
          18, // Both have 18 decimals
          18
        );
        expect(result).toBe(15000n); // 150% in basis points
      });

      test("handles different decimal places", () => {
        // 1500 USDC (6 decimals) / 1 ETH (18 decimals worth 1000 USD)
        const ethValue = 1000000000000000000000n; // 1000 USD in 18 decimals
        const usdcValue = 1500000000n; // 1500 USDC in 6 decimals

        const result = BigIntMath.ratio(usdcValue, ethValue, 6, 18);
        expect(result).toBe(15000n); // 150% in basis points
      });
    });
  });

  describe("DecimalValidation", () => {
    describe("isValidDecimal", () => {
      test("validates decimal numbers (allows partial inputs)", () => {
        expect(DecimalValidation.isValidDecimal("123")).toBe(true);
        expect(DecimalValidation.isValidDecimal("123.456")).toBe(true);
        expect(DecimalValidation.isValidDecimal("0.001")).toBe(true);
        expect(DecimalValidation.isValidDecimal("1.")).toBe(true); // Allow trailing decimal
        expect(DecimalValidation.isValidDecimal("123.")).toBe(true); // Allow trailing decimal
        expect(DecimalValidation.isValidDecimal(".5")).toBe(false);
        expect(DecimalValidation.isValidDecimal("abc")).toBe(false);
        expect(DecimalValidation.isValidDecimal("12.34.56")).toBe(false);
        expect(DecimalValidation.isValidDecimal("")).toBe(false);
      });
    });

    describe("isCompleteDecimal", () => {
      test("validates complete decimal numbers", () => {
        expect(DecimalValidation.isCompleteDecimal("123")).toBe(true);
        expect(DecimalValidation.isCompleteDecimal("123.456")).toBe(true);
        expect(DecimalValidation.isCompleteDecimal("0.001")).toBe(true);
        expect(DecimalValidation.isCompleteDecimal("1.")).toBe(false); // Incomplete
        expect(DecimalValidation.isCompleteDecimal("123.")).toBe(false); // Incomplete
        expect(DecimalValidation.isCompleteDecimal(".5")).toBe(false);
        expect(DecimalValidation.isCompleteDecimal("abc")).toBe(false);
        expect(DecimalValidation.isCompleteDecimal("12.34.56")).toBe(false);
        expect(DecimalValidation.isCompleteDecimal("")).toBe(false);
      });
    });

    describe("hasValidPrecision", () => {
      test("validates decimal precision", () => {
        expect(DecimalValidation.hasValidPrecision("123.456789", 6)).toBe(true);
        expect(DecimalValidation.hasValidPrecision("123.456789", 5)).toBe(
          false
        );
        expect(DecimalValidation.hasValidPrecision("123", 6)).toBe(true);
        expect(DecimalValidation.hasValidPrecision("123.", 6)).toBe(true);
      });
    });

    describe("cleanInput", () => {
      test("cleans user input", () => {
        expect(DecimalValidation.cleanInput("$123.45", 6)).toBe("123.45");
        expect(DecimalValidation.cleanInput("1,234.567", 6)).toBe("1234.567");
        expect(DecimalValidation.cleanInput("123.456789", 4)).toBe("123.4567");
        expect(DecimalValidation.cleanInput("12.34.56", 6)).toBe("12.3456");
      });
    });
  });

  describe("getTokenDisplayPrecision", () => {
    test("returns correct precision for different tokens", () => {
      expect(getTokenDisplayPrecision("USDT")).toBe(2);
      expect(getTokenDisplayPrecision("USDC")).toBe(2);
      expect(getTokenDisplayPrecision("ETH")).toBe(4);
      expect(getTokenDisplayPrecision("WBTC")).toBe(4);
      expect(getTokenDisplayPrecision("ARB")).toBe(3);
      expect(getTokenDisplayPrecision("UNKNOWN")).toBe(4); // Default
    });
  });

  describe("Real-world scenarios", () => {
    test("ETH lending scenario", () => {
      // User wants to lend 1.5 ETH at $2000/ETH
      // Requires 150% collateral in USDC at $1/USDC

      const loanAmount = toBaseUnit("1.5", 18); // 1.5 ETH
      const ethPrice = toBaseUnit("2000", 18); // $2000/ETH
      const usdcPrice = toBaseUnit("1", 18); // $1/USDC
      const collateralRatio = 15000n; // 150% in basis points

      // Calculate loan value in USD
      const loanValueUSD = BigIntMath.multiply(
        loanAmount,
        ethPrice,
        18,
        18,
        18
      );
      expect(fromBaseUnit(loanValueUSD, 18)).toBe("3000"); // $3000

      // Calculate required collateral value
      const requiredCollateralUSD = BigIntMath.percentage(
        loanValueUSD,
        collateralRatio,
        18
      );
      expect(fromBaseUnit(requiredCollateralUSD, 18)).toBe("4500"); // $4500

      // Calculate required USDC amount
      const requiredUSDC = BigIntMath.divide(
        requiredCollateralUSD,
        usdcPrice,
        18,
        18,
        6
      );
      expect(fromBaseUnit(requiredUSDC, 6)).toBe("4500"); // 4500 USDC
    });

    test("USDC lending with WBTC collateral scenario", () => {
      // User wants to lend 10000 USDC
      // Uses WBTC as collateral at $45000/WBTC
      // Requires 120% collateral ratio

      const loanAmount = toBaseUnit("10000", 6); // 10000 USDC
      const usdcPrice = toBaseUnit("1", 18); // $1/USDC
      const wbtcPrice = toBaseUnit("45000", 18); // $45000/WBTC
      const collateralRatio = 12000n; // 120% in basis points

      // Calculate loan value in USD
      const loanValueUSD = BigIntMath.multiply(
        loanAmount,
        usdcPrice,
        6,
        18,
        18
      );
      expect(fromBaseUnit(loanValueUSD, 18)).toBe("10000"); // $10000

      // Calculate required collateral value
      const requiredCollateralUSD = BigIntMath.percentage(
        loanValueUSD,
        collateralRatio,
        18
      );
      expect(fromBaseUnit(requiredCollateralUSD, 18)).toBe("12000"); // $12000

      // Calculate required WBTC amount
      const requiredWBTC = BigIntMath.divide(
        requiredCollateralUSD,
        wbtcPrice,
        18,
        18,
        8
      );
      expect(fromBaseUnit(requiredWBTC, 8, 8)).toBe("0.26666666"); // ~0.267 WBTC
    });

    test("Interest calculation scenario", () => {
      // 1000 USDC loan at 5% APR for 30 days
      const principal = toBaseUnit("1000", 6); // 1000 USDC
      const annualRate = 500n; // 5% in basis points
      const days = 30n;

      // Calculate daily interest: (principal * rate * days) / (365 * 10000)
      const interest = (principal * annualRate * days) / (365n * 10000n);
      expect(fromBaseUnit(interest, 6, 2)).toBe("4.11"); // ~$4.11 interest
    });
  });

  describe("Edge cases and error handling", () => {
    test("handles very small amounts", () => {
      const smallAmount = 1n; // 1 wei
      expect(fromBaseUnit(smallAmount, 18)).toBe("1e-18");
    });

    test("handles very large amounts", () => {
      const largeAmount = 1000000000000000000000000n; // 1M ETH
      expect(fromBaseUnit(largeAmount, 18)).toBe("1000000");
    });

    test("handles precision limits", () => {
      // JavaScript number precision limits
      const preciseAmount = toBaseUnit("1.123456789012345678", 18);
      const converted = fromBaseUnit(preciseAmount, 18);
      expect(converted).toBe("1.1234567890123457");
    });
  });
});

describe("Constants", () => {
  test("decimal constants are correct", () => {
    expect(DECIMAL_CONSTANTS.BASIS_POINTS_SCALE).toBe(10000n);
    expect(DECIMAL_CONSTANTS.PERCENTAGE_SCALE).toBe(100n);
    expect(DECIMAL_CONSTANTS.ONE_ETH).toBe(1000000000000000000n);
    expect(DECIMAL_CONSTANTS.ONE_USDC).toBe(1000000n);
    expect(DECIMAL_CONSTANTS.ZERO).toBe(0n);
  });
});
