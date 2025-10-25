/**
 * @fileoverview Uniswap V3 Pool Price Fetcher
 * @description Fetches real-time prices from Uniswap V3 pools on Doma network
 */

import { ethers } from "ethers";

// Doma testnet RPC
const DOMA_TESTNET_RPC = "https://rpc-testnet.doma.xyz";

// Minimal ABI to get the slot0 and token addresses from Uniswap V3 pool
const POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

// ERC20 ABI to get decimals
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

/**
 * Get the real-time price from a Uniswap V3 pool
 * @param {string} poolAddress - The Uniswap V3 pool address
 * @param {ethers.Provider} [provider] - Optional provider (will create new one if not provided)
 * @returns {Promise<{price: number, priceInverted: number, token0: string, token1: string, token0Symbol: string, token1Symbol: string} | null>}
 */
export async function getPoolPrice(poolAddress, provider = null) {
  if (!poolAddress || poolAddress === ethers.ZeroAddress) {
    return null;
  }

  try {
    // Use provided provider or create new one
    const rpcProvider =
      provider || new ethers.JsonRpcProvider(DOMA_TESTNET_RPC);
    const poolContract = new ethers.Contract(
      poolAddress,
      POOL_ABI,
      rpcProvider
    );

    // Get slot0 data (contains sqrtPriceX96)
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;

    // Get token addresses
    const token0Address = await poolContract.token0();
    const token1Address = await poolContract.token1();

    // Get token decimals and symbols
    const token0Contract = new ethers.Contract(
      token0Address,
      ERC20_ABI,
      rpcProvider
    );
    const token1Contract = new ethers.Contract(
      token1Address,
      ERC20_ABI,
      rpcProvider
    );

    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] =
      await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals(),
        token0Contract.symbol(),
        token1Contract.symbol(),
      ]);

    // Calculate the price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice ** 2;

    // Adjust for decimals to get the human-readable price
    // This gives us the price of token0 in terms of token1
    const decimalAdjustment =
      10 ** (Number(token1Decimals) - Number(token0Decimals));
    const humanPrice = price * decimalAdjustment;

    // Inverted price (price of token1 in terms of token0)
    const humanPriceInverted = 1 / humanPrice;

    // Validate prices are reasonable (not NaN, Infinity, or extremely large)
    if (
      !isFinite(humanPrice) ||
      !isFinite(humanPriceInverted) ||
      humanPrice <= 0 ||
      humanPriceInverted <= 0 ||
      humanPrice > 1e15 || // Price too large (> 1 quadrillion)
      humanPriceInverted > 1e15
    ) {
      console.warn(
        `⚠️ Invalid price for pool ${poolAddress}: ${humanPrice} / ${humanPriceInverted}`
      );
      return null;
    }

    console.log(
      `📊 Pool ${poolAddress}: ${token0Symbol}/${token1Symbol} = ${humanPrice.toFixed(6)} (${token1Symbol}/${token0Symbol} = ${humanPriceInverted.toFixed(6)})`
    );

    return {
      price: humanPrice, // Price of token0 in terms of token1
      priceInverted: humanPriceInverted, // Price of token1 in terms of token0
      token0: token0Address,
      token1: token1Address,
      token0Symbol,
      token1Symbol,
      token0Decimals: Number(token0Decimals),
      token1Decimals: Number(token1Decimals),
    };
  } catch (error) {
    console.error(
      `Failed to fetch pool price for ${poolAddress}:`,
      error.message
    );
    return null;
  }
}

/**
 * Get the USD price of a token from its pool
 * Assumes the pool is paired with a stablecoin (USDC, USDT, etc.)
 * @param {string} tokenAddress - The token address to get price for
 * @param {string} poolAddress - The Uniswap V3 pool address
 * @param {ethers.Provider} [provider] - Optional provider
 * @returns {Promise<number | null>} - Price in USD or null if failed
 */
export async function getTokenPriceUSD(
  tokenAddress,
  poolAddress,
  provider = null
) {
  const poolData = await getPoolPrice(poolAddress, provider);
  if (!poolData) {
    return null;
  }

  // Normalize addresses for comparison
  const tokenAddressLower = tokenAddress.toLowerCase();
  const token0Lower = poolData.token0.toLowerCase();
  const token1Lower = poolData.token1.toLowerCase();

  // Determine which token is our target token
  if (tokenAddressLower === token0Lower) {
    // Our token is token0, price is in terms of token1
    return poolData.price;
  } else if (tokenAddressLower === token1Lower) {
    // Our token is token1, use inverted price
    return poolData.priceInverted;
  } else {
    console.error(
      `Token ${tokenAddress} not found in pool ${poolAddress} (token0: ${poolData.token0}, token1: ${poolData.token1})`
    );
    return null;
  }
}

/**
 * Batch fetch prices for multiple tokens from their pools
 * @param {Array<{tokenAddress: string, poolAddress: string}>} tokens - Array of token/pool pairs
 * @param {ethers.Provider} [provider] - Optional provider
 * @returns {Promise<Map<string, number>>} - Map of token address -> USD price
 */
export async function batchGetTokenPrices(tokens, provider = null) {
  const rpcProvider = provider || new ethers.JsonRpcProvider(DOMA_TESTNET_RPC);
  const priceMap = new Map();

  const pricePromises = tokens.map(async ({ tokenAddress, poolAddress }) => {
    const price = await getTokenPriceUSD(
      tokenAddress,
      poolAddress,
      rpcProvider
    );
    if (price !== null) {
      priceMap.set(tokenAddress.toLowerCase(), price);
    }
  });

  await Promise.all(pricePromises);
  return priceMap;
}
