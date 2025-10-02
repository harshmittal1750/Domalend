// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DomaRankOracle
 * @notice Oracle contract for providing USD valuations of fractional real estate tokens
 * @dev Prices are stored in USD with 18 decimals (e.g., 1 USD = 1e18)
 */
contract DomaRankOracle is Ownable {
    // ============ State Variables ============

    /// @notice Mapping of token addresses to their USD prices (18 decimals)
    mapping(address => uint256) public tokenPrices;

    // ============ Events ============

    /// @notice Emitted when a token price is updated
    event TokenValueUpdated(
        address indexed tokenAddress,
        uint256 newPrice,
        uint256 timestamp
    );

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Owner Functions ============

    /**
     * @notice Updates the USD price for a given token
     * @dev Only callable by the contract owner
     * @param _tokenAddress The address of the token to update
     * @param _price The new price in USD with 18 decimals (e.g., 1000e18 = $1000)
     */
    function updateTokenValue(
        address _tokenAddress,
        uint256 _price
    ) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_price > 0, "Price must be greater than 0");

        tokenPrices[_tokenAddress] = _price;

        emit TokenValueUpdated(_tokenAddress, _price, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Retrieves the stored USD price for a given token
     * @param _tokenAddress The address of the token to query
     * @return price The USD price with 18 decimals
     */
    function getTokenValue(
        address _tokenAddress
    ) external view returns (uint256 price) {
        price = tokenPrices[_tokenAddress];
        require(price > 0, "Token price not set");
        return price;
    }
}
