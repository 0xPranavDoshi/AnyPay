// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {IERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrossChainExpenseSplitterPTT
 * @dev Enhanced expense splitter using CCIP Programmable Token Transfers
 * Supports any-token-in, any-token-out cross-chain payments
 */
contract CrossChainExpenseSplitterPTT is CCIPReceiver, OwnerIsCreator {
    using SafeERC20 for IERC20;

    // Custom errors
    error ExpenseNotFound();
    error ExpenseAlreadyExists();
    error UserAlreadyPaid();
    error InsufficientPayment();
    error SwapFailed();
    error InvalidToken();

    // Supported tokens for PTT - only CCIP-BnM and USDC
    enum TokenType { USDC, CCIP_BNM }
    
    struct Expense {
        address creator;
        uint256 totalAmount;
        uint256 amountPaid;
        bool settled;
        string description;
        address settlementToken; // Token type for settlement (USDC, CCIP-BnM, etc.)
    }

    struct CrossChainPayment {
        bytes32 expenseId;
        address debtor;
        uint256 amount;
        TokenType fromToken;
        TokenType toToken;
        uint64 sourceChain;
    }

    // Storage
    mapping(bytes32 => Expense) public expenses;
    mapping(bytes32 => mapping(address => bool)) public hasUserPaid;
    mapping(bytes32 => mapping(address => uint256)) public userContributions;
    
    // Token addresses for PTT - only CCIP-BnM and USDC
    address public immutable CCIP_BNM;
    address public immutable USDC;

    // Events
    event ExpenseCreated(bytes32 indexed expenseId, address indexed creator, uint256 totalAmount, address settlementToken);
    event ContributionMade(bytes32 indexed expenseId, address indexed contributor, uint256 amount, bool isLocal, TokenType tokenType);
    event ExpenseSettled(bytes32 indexed expenseId, uint256 totalAmount, address recipient);
    event CrossChainPaymentReceived(bytes32 indexed expenseId, address indexed contributor, uint256 amount, TokenType fromToken, TokenType toToken);
    event TokenSwapped(address fromToken, address toToken, uint256 fromAmount, uint256 toAmount);
    event DirectPaymentSent(address indexed payer, address indexed recipient, uint256 amount, TokenType fromToken, string paymentId, bytes32 messageId);
    event DirectPaymentReceived(address indexed payer, address indexed recipient, uint256 amount, TokenType fromToken, string paymentId);

    constructor(
        address router,
        address ccipBnM,
        address usdc
    ) CCIPReceiver(router) {
        CCIP_BNM = ccipBnM;
        USDC = usdc;
    }

    /**
     * @dev Create a new expense
     */
    function createExpense(
        bytes32 expenseId,
        uint256 totalAmount,
        string memory description,
        address settlementToken
    ) external {
        if (expenses[expenseId].creator != address(0)) {
            revert ExpenseAlreadyExists();
        }

        expenses[expenseId] = Expense({
            creator: msg.sender,
            totalAmount: totalAmount,
            amountPaid: 0,
            settled: false,
            description: description,
            settlementToken: settlementToken
        });

        emit ExpenseCreated(expenseId, msg.sender, totalAmount, settlementToken);
    }

    /**
     * @dev Direct payment function - pay recipient cross-chain without expense management
     * This is what the frontend will call via the /api/pay endpoint
     */
    function payRecipient(
        address recipient,
        uint64 destinationChainSelector,
        address tokenIn,
        uint256 amountIn,
        TokenType fromToken,
        string memory paymentId
    ) external payable returns (bytes32 messageId) {
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
        messageId = router.ccipSend{value: fees}(destinationChainSelector, evm2AnyMessage);

        emit DirectPaymentSent(msg.sender, recipient, amountIn, fromToken, paymentId, messageId);
        return messageId;
    }

    /**
     * @dev Pay for an expense using CCIP PTT - any token in, any token out
     */
    function contributeWithPTT(
        bytes32 expenseId,
        uint64 destinationChainSelector,
        address tokenIn,
        uint256 amountIn,
        TokenType fromToken,
        TokenType toToken
    ) external payable returns (bytes32 messageId) {
        if (expenses[expenseId].creator == address(0)) {
            revert ExpenseNotFound();
        }
        if (hasUserPaid[expenseId][msg.sender]) {
            revert UserAlreadyPaid();
        }

        // Prepare cross-chain payment instruction
        CrossChainPayment memory payment = CrossChainPayment({
            expenseId: expenseId,
            debtor: msg.sender,
            amount: amountIn,
            fromToken: fromToken,
            toToken: toToken,
            sourceChain: uint64(block.chainid)
        });

        // Prepare tokens to send
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: tokenIn,
            amount: amountIn
        });

        // Encode payment instruction
        bytes memory message = abi.encode("PTT_PAYMENT", payment);

        // Create CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(address(this)),
            data: message,
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
        messageId = router.ccipSend{value: fees}(destinationChainSelector, evm2AnyMessage);

        emit ContributionMade(expenseId, msg.sender, amountIn, false, fromToken);
        return messageId;
    }

    /**
     * @dev Local contribution (same chain)
     */
    function contributeLocal(
        bytes32 expenseId,
        address token,
        uint256 amount,
        TokenType tokenType
    ) external {
        if (expenses[expenseId].creator == address(0)) {
            revert ExpenseNotFound();
        }
        if (hasUserPaid[expenseId][msg.sender]) {
            revert UserAlreadyPaid();
        }

        // Transfer tokens to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Convert to settlement token if needed
        uint256 settlementAmount = amount;
        if (token != expenses[expenseId].settlementToken) {
            settlementAmount = _convertToken(token, expenses[expenseId].settlementToken, amount);
        }

        // Update expense
        expenses[expenseId].amountPaid += settlementAmount;
        hasUserPaid[expenseId][msg.sender] = true;
        userContributions[expenseId][msg.sender] = settlementAmount;

        emit ContributionMade(expenseId, msg.sender, settlementAmount, true, tokenType);

        // Auto-settle if fully paid
        if (expenses[expenseId].amountPaid >= expenses[expenseId].totalAmount) {
            _settleExpense(expenseId);
        }
    }

    /**
     * @dev Handle cross-chain CCIP PTT payments
     */
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override {
        // First try to decode as direct payment
        try this.decodeDirectPayment(any2EvmMessage.data) returns (
            string memory action,
            address recipient,
            address payer,
            uint256 amount,
            TokenType fromToken,
            string memory paymentId
        ) {
            if (keccak256(bytes(action)) == keccak256(bytes("DIRECT_PAYMENT"))) {
                _processDirectPayment(any2EvmMessage, recipient, payer, amount, fromToken, paymentId);
                return;
            }
        } catch {
            // If direct payment decode fails, try expense payment
            try this.decodeExpensePayment(any2EvmMessage.data) returns (
                string memory action,
                CrossChainPayment memory payment
            ) {
                if (keccak256(bytes(action)) == keccak256(bytes("PTT_PAYMENT"))) {
                    _processCrossChainPayment(any2EvmMessage, payment);
                }
            } catch {
                // Invalid message format, ignore
                revert("Invalid message format");
            }
        }
    }

    // Helper functions for decoding (external for try/catch)
    function decodeDirectPayment(bytes memory data) external pure returns (
        string memory action,
        address recipient,
        address payer,
        uint256 amount,
        TokenType fromToken,
        string memory paymentId
    ) {
        return abi.decode(data, (string, address, address, uint256, TokenType, string));
    }

    function decodeExpensePayment(bytes memory data) external pure returns (
        string memory action,
        CrossChainPayment memory payment
    ) {
        return abi.decode(data, (string, CrossChainPayment));
    }

    /**
     * @dev Process direct payment (no expense tracking)
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
     * @dev Process received cross-chain payment with automatic token conversion
     */
    function _processCrossChainPayment(
        Client.Any2EVMMessage memory any2EvmMessage,
        CrossChainPayment memory payment
    ) internal {
        if (expenses[payment.expenseId].creator == address(0)) {
            revert ExpenseNotFound();
        }
        if (hasUserPaid[payment.expenseId][payment.debtor]) {
            revert UserAlreadyPaid();
        }

        // Get received token details
        Client.EVMTokenAmount memory receivedToken = any2EvmMessage.destTokenAmounts[0];
        uint256 receivedAmount = receivedToken.amount;

        // Convert to settlement token if needed
        address settlementToken = expenses[payment.expenseId].settlementToken;
        uint256 settlementAmount = receivedAmount;
        
        if (receivedToken.token != settlementToken) {
            settlementAmount = _convertToken(receivedToken.token, settlementToken, receivedAmount);
            emit TokenSwapped(receivedToken.token, settlementToken, receivedAmount, settlementAmount);
        }

        // Update expense
        expenses[payment.expenseId].amountPaid += settlementAmount;
        hasUserPaid[payment.expenseId][payment.debtor] = true;
        userContributions[payment.expenseId][payment.debtor] = settlementAmount;

        emit CrossChainPaymentReceived(
            payment.expenseId, 
            payment.debtor, 
            settlementAmount, 
            payment.fromToken, 
            payment.toToken
        );

        // Auto-settle if fully paid
        if (expenses[payment.expenseId].amountPaid >= expenses[payment.expenseId].totalAmount) {
            _settleExpense(payment.expenseId);
        }
    }

    /**
     * @dev Convert between supported tokens - CCIP-BnM and USDC only
     */
    function _convertToken(address fromToken, address toToken, uint256 amount) internal returns (uint256) {
        // If same token, no conversion needed
        if (fromToken == toToken) {
            return amount;
        }
        
        // CCIP-BnM to USDC conversion (1:1 for demo - in production use price oracle)
        if (fromToken == CCIP_BNM && toToken == USDC) {
            return amount; // 1:1 conversion for demo
        }
        
        // USDC to CCIP-BnM conversion (1:1 for demo - in production use price oracle)
        if (fromToken == USDC && toToken == CCIP_BNM) {
            return amount; // 1:1 conversion for demo
        }
        
        // Unsupported conversion
        revert InvalidToken();
    }

    /**
     * @dev Settle expense and transfer to creator
     */
    function _settleExpense(bytes32 expenseId) internal {
        Expense storage expense = expenses[expenseId];
        expense.settled = true;

        // Transfer settlement tokens to creator
        IERC20(expense.settlementToken).safeTransfer(
            expense.creator,
            expense.amountPaid
        );

        emit ExpenseSettled(expenseId, expense.amountPaid, expense.creator);
    }

    /**
     * @dev Get expense details
     */
    function getExpenseDetails(bytes32 expenseId) external view returns (
        address creator,
        uint256 totalAmount,
        uint256 amountPaid,
        bool settled,
        string memory description,
        address settlementToken
    ) {
        Expense memory expense = expenses[expenseId];
        return (
            expense.creator,
            expense.totalAmount,
            expense.amountPaid,
            expense.settled,
            expense.description,
            expense.settlementToken
        );
    }

    /**
     * @dev Emergency withdraw function
     */
    function withdraw(address beneficiary) public onlyOwner {
        uint256 amount = address(this).balance;
        if (amount > 0) {
            (bool sent,) = beneficiary.call{value: amount}("");
            require(sent, "Failed to withdraw ETH");
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