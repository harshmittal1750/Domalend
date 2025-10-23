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
          launchpadSupply
          launchpadFeeBps
          poolSupply
          poolFeeBps
          initialPrice
          launchStartTime
          launchEndTime
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
