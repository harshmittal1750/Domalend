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
