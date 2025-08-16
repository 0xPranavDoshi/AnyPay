import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*
 * AnyPayRouter
 * High-level orchestration contract that (in final form) will:
 * 1. Accept a source (token, chain) pair A and a target (token, chain) pair B.
 * 2. If source token != target token on the source chain, perform a Uniswap (or other DEX) swap
 *    to obtain the target token (still on the source chain).
 * 3. If source chain == target chain: simple ERC20 transfer to the destination user.
 * 4. Else: bridge (via Chainlink CCIP) the target token to the destination chain, then deliver to user.
 */

contract AnyPayRouter is ReentrancyGuard {

    error ZeroAddress();
    error ZeroChainSelector();
    error IdenticalSourceTarget();
    error UnsupportedChain(uint64 provided);
    error SenderIsDestination();

    event Executed(
        address indexed sender,
        address indexed destination,
        address sourceToken,
        address targetToken,
        bool swapped,
        bool bridged
    );

    /*
     * Primary entrypoint callable from front-end (single button trigger):
     * Orchestrates swap (if needed) and conditional bridge.
     *
     * Parameters:
     *  - source: token + chain selector describing what the user is providing (chain selector here MUST match this chain).
     *  - target: token + chain selector describing the desired end state for the user.
     *  - destination: final recipient address on the target chain.
     */
    function execute(
        address sourceToken,
        address targetToken,
        address destination,
        bool isCrossChain
    ) external nonReentrant {
        if (destination == address(0)) revert ZeroAddress();
        if (msg.sender == destination) revert SenderIsDestination();
        if (sourceToken == address(0) || targetToken == address(0)) revert ZeroAddress();
        if (sourceToken == targetToken && !isCrossChain) revert IdenticalSourceTarget();

        bool swapped = false;
        bool bridged = false;


        // 1. Swap sourceToken to targetToken if needed
        if (sourceToken != targetToken) {
            swapped = true;
            // TODO: Approve DEX router to spend sourceToken if needed
            // TODO: Call DEX (e.g., Uniswap) to swap sourceToken for targetToken
            // After swap, use IERC20(targetToken).balanceOf(address(this)) to get the amount to transfer/bridge
        } else {
            // If no swap, assume the amount is already in targetToken
            // Use IERC20(targetToken).balanceOf(address(this)) to get the amount to transfer/bridge
        }

        // 2. Transfer or bridge the targetToken
        if (!isCrossChain) {
            // TODO: Transfer all targetToken held by this contract to destination on same chain
            // IERC20(targetToken).transfer(destination, IERC20(targetToken).balanceOf(address(this)));
        } else {
            bridged = true;
            // TODO: Call external bridge/CCIP sender contract to bridge all targetToken held by this contract to destination on another chain
            // Pass IERC20(targetToken).balanceOf(address(this)) as the amount
        }

        emit Executed(
            msg.sender,
            destination,
            sourceToken,
            targetToken,
            swapped,
            bridged
        );
    }
}
