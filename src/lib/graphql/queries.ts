export const FRACTIONAL_TOKENS_QUERY = `
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
          quoteToken
          name
          symbol
          decimals
          totalSupply
          launchpadSupply
          launchpadFeeBps
          poolSupply
          poolFeeBps
          poolLiquidityLowerRangePercentBps
          poolLiquidityUpperRangePercentBps
          launchStartTime
          launchEndTime
          launchpadData
          bondingCurveModelImpl
          initialPrice
          finalPrice
          bondingCurveModelData
          liquidityMigratorImpl
          liquidityMigratorData
          hook
          vestingCliffSeconds
          vestingDurationSeconds
          initialPoolPrice
          buySellFeeRecipient
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
