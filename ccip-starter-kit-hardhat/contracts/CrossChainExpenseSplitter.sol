// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {IERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";

// Minimal Uniswap V3 interfaces (no additional imports needed)
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWETH9 {
    function deposit() external payable;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * THIS IS THE EXAMPLE TITLE 
 * 
 * @title CrossChainExpenseSplitter
 * @notice A contract for splitting expenses across multiple blockchain networks with Uniswap integration
 */
contract CrossChainExpenseSplitter is CCIPReceiver {
    using SafeERC20 for IERC20;

    // Network-specific addresses (set in constructor)
    IERC20 public immutable s_usdc;
    IWETH9 public immutable s_weth;
    ISwapRouter public immutable s_swapRouter;

    // Custom errors
    error ExpenseNotFound();
    error ExpenseAlreadyExists();
    error AlreadyPaid();
    error ExpenseAlreadySettled();
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    error SwapFailed();
    error InsufficientETHForSwapAndFees();

    // Enhanced events
    event ExpenseCreated(bytes32 indexed expenseId, address creator, uint256 amount, string description);
    event TokenSwapped(address indexed user, uint256 ethIn, uint256 usdcOut);
    event ContributionMade(bytes32 indexed expenseId, address contributor, uint256 amount, string method);
    event ExpenseSettled(bytes32 indexed expenseId, address creator, uint256 totalPaid);
    event CCIPMessageSent(bytes32 indexed messageId, uint64 destinationChain);

    // Legacy events (keeping for compatibility)
    event ExpenseContribution(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address sender,
        string contribution,
        address token,
        uint256 tokenAmount
    );

    struct Expense {
        address creator;
        uint256 totalAmount; // in USDC (6 decimals)
        uint256 amountPaid;  // in USDC (6 decimals)
        mapping(address => uint256) contributions;
        mapping(address => bool) hasPaid;
        bool settled;
        string description;
    }

    // Storage
    bytes32 private s_lastReceivedMessageId;
    address private s_lastReceivedTokenAddress;
    uint256 private s_lastReceivedTokenAmount;
    string private s_lastReceivedText;
    mapping(bytes32 => Expense) public s_expenses;

    IERC20 private s_linkToken;

    constructor(
        address _router, 
        address _link,
        address _usdc,
        address _weth,
        address _swapRouter
    ) CCIPReceiver(_router) {
        s_linkToken = IERC20(_link);
        s_usdc = IERC20(_usdc);
        s_weth = IWETH9(_weth);
        s_swapRouter = ISwapRouter(_swapRouter);
    }

    /// @notice Creates a new expense
    /// @dev This function creates a new expense that others can contribute to
    function createExpense(
        bytes32 expenseId,
        uint256 totalAmount,
        string memory description
    ) external {
        if (s_expenses[expenseId].creator != address(0)) revert ExpenseAlreadyExists();
        
        s_expenses[expenseId].creator = msg.sender;
        s_expenses[expenseId].totalAmount = totalAmount;
        s_expenses[expenseId].description = description;

        emit ExpenseCreated(expenseId, msg.sender, totalAmount, description);
    }

    /// @notice Contribute with ETH (same chain) - Swaps ETH to USDC
    function contributeWithETHLocal(bytes32 expenseId) external payable {
        require(msg.value > 0, "Must send ETH");
        
        // Swap ETH → USDC via Uniswap V3
        uint256 usdcReceived = _swapETHForUSDC(msg.value);
        
        // Record contribution
        _recordContribution(expenseId, msg.sender, usdcReceived, "ETH_SWAP_LOCAL");
    }

    /// @notice Contribute with ETH (cross-chain) - Swaps ETH to USDC then bridges
    function contributeWithETHCrossChain(
        bytes32 expenseId,
        uint64 destinationChainSelector
    ) external payable {
        if (msg.value <= 0.002 ether) revert InsufficientETHForSwapAndFees();
        
        // Reserve ETH for CCIP fees (estimate)
        uint256 ethForSwap = msg.value - 0.001 ether;
        uint256 ethForCCIP = 0.001 ether;
        
        // Swap ETH → USDC
        uint256 usdcAmount = _swapETHForUSDC(ethForSwap);
        
        // Send cross-chain
        _sendCrossChainContribution(expenseId, msg.sender, usdcAmount, destinationChainSelector, ethForCCIP);
    }

    /// @notice Contribute with USDC (same chain)
    function contributeWithUSDCLocal(bytes32 expenseId, uint256 amount) external {
        s_usdc.safeTransferFrom(msg.sender, address(this), amount);
        _recordContribution(expenseId, msg.sender, amount, "USDC_LOCAL");
    }

    /// @notice Contribute with USDC (cross-chain)
    function contributeWithUSDCCrossChain(
        bytes32 expenseId,
        uint256 amount,
        uint64 destinationChainSelector
    ) external payable {
        s_usdc.safeTransferFrom(msg.sender, address(this), amount);
        _sendCrossChainContribution(expenseId, msg.sender, amount, destinationChainSelector, msg.value);
    }

    /// @notice Legacy function for backward compatibility
    function contributeToExpense(
        uint64 _destinationChainSelector,
        address _receiver,
        bytes32 _expenseId,
        string memory _contributorNote,
        address _token,
        uint256 _amount
    ) external payable {
        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Send cross-chain
        _sendCrossChainContribution(_expenseId, msg.sender, _amount, _destinationChainSelector, msg.value);
    }

    /// @notice Internal function to swap ETH for USDC using Uniswap V3
    function _swapETHForUSDC(uint256 ethAmount) internal returns (uint256 amountOut) {
        // Wrap ETH to WETH
        s_weth.deposit{value: ethAmount}();
        s_weth.approve(address(s_swapRouter), ethAmount);

        // Prepare swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(s_weth),
            tokenOut: address(s_usdc),
            fee: 3000, // 0.3% pool fee
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: ethAmount,
            amountOutMinimum: 0, // Accept any amount (use price oracle in production)
            sqrtPriceLimitX96: 0
        });

        // Execute swap
        try s_swapRouter.exactInputSingle(params) returns (uint256 _amountOut) {
            amountOut = _amountOut;
            emit TokenSwapped(msg.sender, ethAmount, amountOut);
        } catch {
            revert SwapFailed();
        }
    }

    /// @notice Internal function to send cross-chain contributions
    function _sendCrossChainContribution(
        bytes32 expenseId,
        address contributor,
        uint256 amount,
        uint64 destinationChainSelector,
        uint256 ccipFee
    ) internal {
        // Create CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            address(this), // receiver (this contract on destination)
            abi.encode(expenseId, contributor, amount),
            address(s_usdc), // token to transfer
            amount,
            address(0) // pay fees in ETH
        );

        IRouterClient router = IRouterClient(this.getRouter());
        uint256 fees = router.getFee(destinationChainSelector, evm2AnyMessage);

        if (fees > ccipFee) revert NotEnoughBalance(ccipFee, fees);

        // Approve USDC for transfer
        s_usdc.approve(address(router), amount);

        // Send CCIP message
        bytes32 messageId = router.ccipSend{value: ccipFee}(destinationChainSelector, evm2AnyMessage);

        emit CCIPMessageSent(messageId, destinationChainSelector);
    }

    /// @notice Construct a CCIP message (keeping original function)
    function _buildCCIPMessage(
        address _receiver,
        bytes memory _text,
        address _token,
        uint256 _amount,
        address _feeTokenAddress
    ) private pure returns (Client.EVM2AnyMessage memory) {
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: _token,
            amount: _amount
        });

        return Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: _text,
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 400_000})),
            feeToken: _feeTokenAddress
        });
    }

    /// @notice Function to receive CCIP messages (enhanced)
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override {
        // Decode the contribution data
        (bytes32 expenseId, address contributor, uint256 amount) = abi.decode(
            any2EvmMessage.data,
            (bytes32, address, uint256)
        );

        // Update tracking variables
        s_lastReceivedMessageId = any2EvmMessage.messageId;
        s_lastReceivedTokenAddress = any2EvmMessage.destTokenAmounts[0].token;
        s_lastReceivedTokenAmount = any2EvmMessage.destTokenAmounts[0].amount;

        // Record contribution to expense
        _recordContribution(expenseId, contributor, any2EvmMessage.destTokenAmounts[0].amount, "CROSS_CHAIN");

        emit ExpenseContribution(
            any2EvmMessage.messageId,
            any2EvmMessage.sourceChainSelector,
            abi.decode(any2EvmMessage.sender, (address)),
            "Cross-chain contribution",
            any2EvmMessage.destTokenAmounts[0].token,
            any2EvmMessage.destTokenAmounts[0].amount
        );
    }

    /// @notice Internal function to record contributions (enhanced)
    function _recordContribution(
        bytes32 expenseId,
        address contributor,
        uint256 amount,
        string memory method
    ) internal {
        Expense storage expense = s_expenses[expenseId];
        if (expense.creator == address(0)) revert ExpenseNotFound();
        if (expense.hasPaid[contributor]) revert AlreadyPaid();
        if (expense.settled) revert ExpenseAlreadySettled();

        expense.contributions[contributor] = amount;
        expense.hasPaid[contributor] = true;
        expense.amountPaid += amount;

        emit ContributionMade(expenseId, contributor, amount, method);

        // Auto-settle if fully funded
        if (expense.amountPaid >= expense.totalAmount && !expense.settled) {
            expense.settled = true;
            s_usdc.safeTransfer(expense.creator, expense.amountPaid);
            emit ExpenseSettled(expenseId, expense.creator, expense.amountPaid);
        }
    }

    /// @notice Get expense details
    function getExpenseDetails(bytes32 expenseId) external view returns (
        address creator,
        uint256 totalAmount,
        uint256 amountPaid,
        bool settled,
        string memory description
    ) {
        Expense storage expense = s_expenses[expenseId];
        return (expense.creator, expense.totalAmount, expense.amountPaid, expense.settled, expense.description);
    }

    /// @notice Get contribution amount for a specific user
    function getUserContribution(bytes32 expenseId, address user) external view returns (uint256) {
        return s_expenses[expenseId].contributions[user];
    }

    /// @notice Check if user has paid for an expense
    function hasUserPaid(bytes32 expenseId, address user) external view returns (bool) {
        return s_expenses[expenseId].hasPaid[user];
    }

    /// @notice Fetches the details of the last received message
    function getLastReceivedMessageDetails()
        external
        view
        returns (
            bytes32 messageId,
            string memory text,
            address tokenAddress,
            uint256 tokenAmount
        )
    {
        return (
            s_lastReceivedMessageId,
            s_lastReceivedText,
            s_lastReceivedTokenAddress,
            s_lastReceivedTokenAmount
        );
    }

    receive() external payable {}

    /// @notice Withdraw ETH from contract
    function withdraw(address _beneficiary) public {
        uint256 amount = address(this).balance;
        if (amount == 0) revert();
        
        (bool sent, ) = _beneficiary.call{value: amount}("");
        if (!sent) revert();
    }

    /// @notice Withdraw ERC20 tokens from contract
    function withdrawToken(address _beneficiary, address _token) public {
        uint256 amount = IERC20(_token).balanceOf(address(this));
        if (amount == 0) revert();
        IERC20(_token).safeTransfer(_beneficiary, amount);
    }
}
