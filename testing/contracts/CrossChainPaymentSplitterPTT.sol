// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {IERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrossChainPaymentSplitterPTT
 * @dev Cross-chain payment splitter using CCIP Programmable Token Transfers
 * Supports CCIP-BnM and USDC cross-chain payments with automatic conversion
 * Designed to work with frontend Payment interface - no expense tracking needed
 */
contract CrossChainPaymentSplitterPTT is CCIPReceiver, OwnerIsCreator {
    using SafeERC20 for IERC20;

    // Custom errors
    error InvalidToken();
    error InsufficientAmount();
    error TransferFailed();

    // Supported tokens for PTT - USDC, CCIP-BnM and CCIP-LnM
    enum TokenType { USDC, CCIP_BNM, CCIP_LNM }
    
    // Token addresses for PTT - USDC, CCIP-BnM and CCIP-LnM
    address public immutable CCIP_BNM;
    address public immutable USDC;
    address public immutable CCIP_LNM;

    // Events
    event DirectPaymentSent(
        address indexed payer, 
        address indexed recipient, 
        uint256 amount, 
        TokenType fromToken, 
        string paymentId, 
        bytes32 messageId
    );
    event DirectPaymentReceived(
        address indexed payer, 
        address indexed recipient, 
        uint256 amount, 
        TokenType fromToken, 
        string paymentId
    );
    event TokenSwapped(
        address fromToken, 
        address toToken, 
        uint256 fromAmount, 
        uint256 toAmount
    );

    constructor(
        address router,
        address ccipBnM,
        address usdc,
        address ccipLnM
    ) CCIPReceiver(router) {
        CCIP_BNM = ccipBnM;
        USDC = usdc;
        CCIP_LNM = ccipLnM;
    }

    /**
     * @dev Direct payment function - pay recipient cross-chain without expense management
     * This is what the frontend will call via the /api/pay endpoint
     * Supports: CCIP-BnM → USDC (settlement), USDC → USDC (direct)
     */
    function payRecipient(
        address recipient,
        uint64 destinationChainSelector,
        address tokenIn,
        uint256 amountIn,
        TokenType fromToken,
        string memory paymentId
    ) external payable returns (bytes32 messageId) {
        if (amountIn == 0) revert InsufficientAmount();
        
        // Transfer tokens from user to contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Prepare cross-chain payment instruction
        bytes memory paymentData = abi.encode(
            "DIRECT_PAYMENT",
            recipient,
            msg.sender,
            amountIn,
            fromToken,
            paymentId
        );

        // Prepare tokens to send
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: tokenIn,
            amount: amountIn
        });

        // Create CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(address(this)),
            data: paymentData,
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 500_000})
            ),
            feeToken: address(0) // Pay fees in native token
        });

        // Get router and approve token
        IRouterClient router = IRouterClient(this.getRouter());
        IERC20(tokenIn).approve(address(router), amountIn);

        // Calculate fees and send
        uint256 fees = router.getFee(destinationChainSelector, evm2AnyMessage);
        if (msg.value < fees) revert InsufficientAmount();
        
        messageId = router.ccipSend{value: fees}(destinationChainSelector, evm2AnyMessage);

        emit DirectPaymentSent(msg.sender, recipient, amountIn, fromToken, paymentId, messageId);
        return messageId;
    }

    /**
     * @dev Handle cross-chain CCIP PTT payments
     */
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override {
        // Decode direct payment
        (
            string memory action,
            address recipient,
            address payer,
            uint256 amount,
            TokenType fromToken,
            string memory paymentId
        ) = abi.decode(any2EvmMessage.data, (string, address, address, uint256, TokenType, string));

        if (keccak256(bytes(action)) == keccak256(bytes("DIRECT_PAYMENT"))) {
            _processDirectPayment(any2EvmMessage, recipient, payer, amount, fromToken, paymentId);
        } else {
            revert("Invalid message format");
        }
    }

    /**
     * @dev Process direct payment (no expense tracking)
     * Always converts to USDC for settlement
     */
    function _processDirectPayment(
        Client.Any2EVMMessage memory any2EvmMessage,
        address recipient,
        address payer,
        uint256 amount,
        TokenType fromToken,
        string memory paymentId
    ) internal {
        // Get received token details
        Client.EVMTokenAmount memory receivedToken = any2EvmMessage.destTokenAmounts[0];
        uint256 receivedAmount = receivedToken.amount;

        // Convert to USDC if needed (our settlement token)
        uint256 settlementAmount = receivedAmount;
        if (receivedToken.token != USDC) {
            settlementAmount = _convertToken(receivedToken.token, USDC, receivedAmount);
            emit TokenSwapped(receivedToken.token, USDC, receivedAmount, settlementAmount);
        }

        // Send directly to recipient
        IERC20(USDC).safeTransfer(recipient, settlementAmount);

        emit DirectPaymentReceived(payer, recipient, settlementAmount, fromToken, paymentId);
    }

    /**
     * @dev Convert between supported tokens - CCIP-BnM and USDC only
     * 1:1 conversion for demo (in production use price oracle/DEX)
     */
    function _convertToken(address fromToken, address toToken, uint256 amount) internal returns (uint256) {
        // If same token, no conversion needed
        if (fromToken == toToken) {
            return amount;
        }
        
        // CCIP-BnM to USDC conversion (1:1 for demo)
        if (fromToken == CCIP_BNM && toToken == USDC) {
            return amount;
        }
        
        // CCIP-LnM to USDC conversion (1:1 for demo)
        if (fromToken == CCIP_LNM && toToken == USDC) {
            return amount;
        }
        
        // USDC to CCIP-BnM conversion (1:1 for demo)
        if (fromToken == USDC && toToken == CCIP_BNM) {
            return amount;
        }
        
        // USDC to CCIP-LnM conversion (1:1 for demo)
        if (fromToken == USDC && toToken == CCIP_LNM) {
            return amount;
        }
        
        // Unsupported conversion
        revert InvalidToken();
    }

    /**
     * @dev Get supported tokens for this chain
     */
    function getSupportedTokens() external view returns (address ccipBnM, address usdc, address ccipLnM) {
        return (CCIP_BNM, USDC, CCIP_LNM);
    }

    /**
     * @dev Get token type enum from address
     */
    function getTokenType(address token) external view returns (TokenType) {
        if (token == USDC) return TokenType.USDC;
        if (token == CCIP_BNM) return TokenType.CCIP_BNM;
        if (token == CCIP_LNM) return TokenType.CCIP_LNM;
        revert InvalidToken();
    }

    /**
     * @dev Emergency withdraw function
     */
    function withdraw(address beneficiary) public onlyOwner {
        uint256 amount = address(this).balance;
        if (amount > 0) {
            (bool sent,) = beneficiary.call{value: amount}("");
            if (!sent) revert TransferFailed();
        }
    }

    function withdrawToken(address beneficiary, address token) public onlyOwner {
        uint256 amount = IERC20(token).balanceOf(address(this));
        if (amount > 0) {
            IERC20(token).safeTransfer(beneficiary, amount);
        }
    }

    receive() external payable {}
}