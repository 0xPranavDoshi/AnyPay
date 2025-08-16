const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 COMPLETE CCIP PTT DEMO: Cross-Chain + Cross-Token\n");
    
    // Contract addresses
    const PTT_CONTRACTS = {
        arbitrumSepolia: "0xc4D234C069425f21b62fb742F1C39f0E4D253Ecd",
        baseSepolia: "0xe5c8119C06Ea10173Fd291CAacB083c33AccfA52"
    };
    
    // Token addresses
    const TOKENS = {
        arbitrumSepolia: {
            ccipBnM: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D",
            usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
        },
        baseSepolia: {
            ccipBnM: "0x88A2d74F47a237a62e7A51cdDa67270CE381555e",
            usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        }
    };
    
    // Chain selectors
    const CHAIN_SELECTORS = {
        arbitrumSepolia: BigInt("3478487238524512106"),
        baseSepolia: BigInt("10344971235874465080")
    };
    
    // Wallets
    const BOB_KEY = "0x1b72ec747a8816f64f143372aff5f757a8ebfbd2ca2b0c7efbf6abf258a165bf";
    const ALICE_KEY = "0xf6a79890cca256fb4081b036658f79cc273713eb16d35786ee998c832f9fac37";
    
    console.log("🎯 Revolutionary Cross-Chain Cross-Token Demo:");
    console.log("├── Source: Arbitrum Sepolia (Alice has 1 CCIP-BnM)");
    console.log("├── Destination: Base Sepolia (Expense needs USDC settlement)");
    console.log("├── Payment: 0.5 CCIP-BnM → Auto-converts → 0.5 USDC");
    console.log("└── Single transaction cross-chain swap + bridge! 🔥\n");
    
    // ==============================================
    // STEP 1: Create expense on Base Sepolia (USDC settlement)
    // ==============================================
    console.log("📍 STEP 1: Creating expense on Base Sepolia (USDC settlement)...");
    
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const bobWallet = new ethers.Wallet(BOB_KEY, baseProvider);
    
    const basePttContract = new ethers.Contract(
        PTT_CONTRACTS.baseSepolia,
        [
            "function createExpense(bytes32 expenseId, uint256 totalAmount, string memory description, address settlementToken) external",
            "function getExpenseDetails(bytes32 expenseId) external view returns (address creator, uint256 totalAmount, uint256 amountPaid, bool settled, string memory description, address settlementToken)"
        ],
        bobWallet
    );
    
    // Generate unique expense ID
    const expenseId = ethers.keccak256(ethers.toUtf8Bytes("ptt-cross-chain-cross-token-0.5"));
    console.log(`📋 Expense ID: ${expenseId}`);
    
    try {
        // Create expense requiring 0.5 USDC settlement
        const totalAmount = ethers.parseUnits("0.5", 6); // 0.5 USDC (6 decimals)
        const createTx = await basePttContract.createExpense(
            expenseId,
            totalAmount,
            "PTT Demo: Cross-Chain Cross-Token Payment",
            TOKENS.baseSepolia.usdc // Settlement in USDC
        );
        
        console.log(`📤 Create expense transaction: ${createTx.hash}`);
        const createReceipt = await createTx.wait();
        console.log(`✅ Expense created on Base Sepolia! Block: ${createReceipt.blockNumber}`);
        
        // Verify expense
        const expenseDetails = await basePttContract.getExpenseDetails(expenseId);
        console.log(`💰 Expense Amount: ${ethers.formatUnits(expenseDetails[1], 6)} USDC`);
        console.log(`🎯 Settlement Token: USDC (${expenseDetails[5]})`);
        
    } catch (error) {
        console.error("❌ Error creating expense:", error.message);
        return;
    }
    
    // ==============================================
    // STEP 2: Alice pays with CCIP-BnM from Arbitrum
    // ==============================================
    console.log("\n📍 STEP 2: Alice pays with CCIP-BnM from Arbitrum Sepolia...");
    
    const arbProvider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
    const aliceWallet = new ethers.Wallet(ALICE_KEY, arbProvider);
    
    console.log(`👤 Alice's Address: ${aliceWallet.address}`);
    
    // Check CCIP-BnM balance
    const ccipBnMContract = new ethers.Contract(
        TOKENS.arbitrumSepolia.ccipBnM,
        [
            "function balanceOf(address) view returns (uint256)", 
            "function approve(address spender, uint256 amount) returns (bool)"
        ],
        aliceWallet
    );
    
    const balance = await ccipBnMContract.balanceOf(aliceWallet.address);
    console.log(`💰 Alice's CCIP-BnM Balance: ${ethers.formatEther(balance)} CCIP-BnM`);
    
    if (balance < ethers.parseEther("0.5")) {
        console.log("❌ Insufficient CCIP-BnM balance for payment");
        return;
    }
    
    // Connect to PTT contract on Arbitrum
    const arbPttContract = new ethers.Contract(
        PTT_CONTRACTS.arbitrumSepolia,
        [
            "function contributeWithPTT(bytes32 expenseId, uint64 destinationChainSelector, address tokenIn, uint256 amountIn, uint8 fromToken, uint8 toToken) external payable returns (bytes32 messageId)"
        ],
        aliceWallet
    );
    
    // Payment amount (0.5 CCIP-BnM)
    const paymentAmount = ethers.parseEther("0.5");
    
    console.log(`\n💸 Processing Revolutionary PTT Payment...`);
    console.log(`📊 Amount: ${ethers.formatEther(paymentAmount)} CCIP-BnM`);
    console.log(`🔄 CCIP-BnM (Arbitrum) → USDC (Base)`);
    console.log(`🎯 Expense ID: ${expenseId}`);
    
    try {
        // Step 2a: Approve CCIP-BnM spending
        console.log("\n🔓 Approving CCIP-BnM spending...");
        const approveTx = await ccipBnMContract.approve(PTT_CONTRACTS.arbitrumSepolia, paymentAmount);
        console.log(`📤 Approval sent: ${approveTx.hash}`);
        await approveTx.wait();
        console.log("✅ CCIP-BnM approved!");
        
        // Step 2b: Execute PTT payment
        console.log("\n🚀 Executing Cross-Chain Cross-Token PTT Payment...");
        
        // TokenType enum: USDC=0, CCIP_BNM=1, WETH=2, NATIVE_ETH=3
        const fromToken = 1; // CCIP_BNM (source token)
        const toToken = 0;   // USDC (destination token)
        
        const pttTx = await arbPttContract.contributeWithPTT(
            expenseId,
            CHAIN_SELECTORS.baseSepolia,
            TOKENS.arbitrumSepolia.ccipBnM,
            paymentAmount,
            fromToken,
            toToken,
            { 
                value: ethers.parseEther("0.01"), // ETH for CCIP fees
                gasLimit: 1000000 
            }
        );
        
        console.log(`📤 PTT Transaction sent: ${pttTx.hash}`);
        const receipt = await pttTx.wait();
        console.log(`✅ PTT Payment initiated! Block: ${receipt.blockNumber}`);
        
        console.log("\n🎉 REVOLUTIONARY PTT SUCCESS!");
        console.log("🔄 CCIP is now processing the magic:");
        console.log("├── ⚡ Bridging 0.5 CCIP-BnM from Arbitrum → Base");
        console.log("├── 🔄 Converting CCIP-BnM → USDC on Base Sepolia");
        console.log("├── 💰 Settling expense automatically");
        console.log("└── ✨ All in ONE transaction!");
        
        console.log(`\n🔗 Track Transaction:`);
        console.log(`   Arbitrum: https://sepolia.arbiscan.io/tx/${pttTx.hash}`);
        console.log(`   Base: Check Base Sepolia in ~10-20 minutes`);
        console.log(`\n🕐 CCIP processing time: ~10-20 minutes`);
        console.log(`📋 Expense ID: ${expenseId}`);
        
        console.log("\n🚀 This demonstrates the FUTURE of cross-chain payments:");
        console.log("✅ Any token on any chain → Any token on any chain");
        console.log("✅ Single transaction user experience");
        console.log("✅ No DEX liquidity dependencies");
        console.log("✅ Perfect for hackathons and production!");
        
    } catch (error) {
        console.error("❌ PTT Payment failed:", error.message);
        if (error.data) {
            console.log("Error data:", error.data);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});