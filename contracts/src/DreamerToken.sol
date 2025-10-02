// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DreamerToken
 * @dev The native governance/reward token for the DreamLend protocol
 * @notice This is the $DREAM token that users earn through liquidity mining
 */
contract DreamerToken is ERC20, Ownable {
    // ============ Constants ============

    /// @notice Total supply of DREAM tokens (100 million with 18 decimals)
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10 ** 18;

    // ============ Events ============

    event TokensTransferred(
        address indexed from,
        address indexed to,
        uint256 amount,
        string purpose
    );

    // ============ Constructor ============

    /**
     * @notice Initialize the DreamerToken contract
     * @dev Mints the entire total supply to the contract deployer
     */
    constructor() ERC20("Dreamer Token", "DREAM") Ownable(msg.sender) {
        // Mint entire total supply to the contract deployer
        _mint(msg.sender, TOTAL_SUPPLY);

        emit TokensTransferred(
            address(0),
            msg.sender,
            TOTAL_SUPPLY,
            "Initial token mint to deployer"
        );
    }

    // ============ Owner Functions ============

    /**
     * @notice Transfer tokens to the rewards distributor contract
     * @dev Only callable by the contract owner for initial setup
     * @param _distributorAddress The address of the RewardsDistributor contract
     * @param _amount The amount of tokens to transfer for rewards distribution
     */
    function transferToRewardsDistributor(
        address _distributorAddress,
        uint256 _amount
    ) external onlyOwner {
        require(
            _distributorAddress != address(0),
            "Invalid distributor address"
        );
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");

        _transfer(msg.sender, _distributorAddress, _amount);

        emit TokensTransferred(
            msg.sender,
            _distributorAddress,
            _amount,
            "Transfer to rewards distributor"
        );
    }

    /**
     * @notice Emergency function to recover tokens sent to this contract by mistake
     * @dev Only callable by the contract owner
     * @param _tokenAddress The address of the token to recover (use address(0) for ETH)
     * @param _amount The amount to recover
     * @param _recipient The address to send recovered tokens to
     */
    function emergencyRecoverTokens(
        address _tokenAddress,
        uint256 _amount,
        address _recipient
    ) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient address");

        if (_tokenAddress == address(0)) {
            // Recover ETH
            require(
                address(this).balance >= _amount,
                "Insufficient ETH balance"
            );
            payable(_recipient).transfer(_amount);
        } else {
            // Recover ERC20 tokens
            IERC20 token = IERC20(_tokenAddress);
            require(
                token.balanceOf(address(this)) >= _amount,
                "Insufficient token balance"
            );
            token.transfer(_recipient, _amount);
        }

        emit TokensTransferred(
            address(this),
            _recipient,
            _amount,
            "Emergency token recovery"
        );
    }

    // ============ View Functions ============

    /**
     * @notice Get the total supply of DREAM tokens
     * @return The total supply in wei (with 18 decimals)
     */
    function getTotalSupply() external pure returns (uint256) {
        return TOTAL_SUPPLY;
    }

    /**
     * @notice Check if an address has a minimum balance
     * @param _account The address to check
     * @param _minimumBalance The minimum balance required
     * @return True if the account has at least the minimum balance
     */
    function hasMinimumBalance(
        address _account,
        uint256 _minimumBalance
    ) external view returns (bool) {
        return balanceOf(_account) >= _minimumBalance;
    }

    // ============ Overrides ============

    /**
     * @notice Override transfer to add custom logic if needed
     * @dev Currently just calls parent implementation, but can be extended
     */
    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom to add custom logic if needed
     * @dev Currently just calls parent implementation, but can be extended
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        return super.transferFrom(from, to, amount);
    }
}
