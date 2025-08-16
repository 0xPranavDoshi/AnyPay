const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 CCIP Programmable Token Transfer Demo\n");
    
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
        arbitrumSepolia: "3478487238524512106",
        baseSepolia: "10344971235874465080"
    };
    
    // Wallets
    const BOB_KEY = "0x1b72ec747a8816f64f143372aff5f757a8ebfbd2ca2b0c7efbf6abf258a165bf";
    const ALICE_KEY = "0xf6a79890cca256fb4081b036658f79cc273713eb16d35786ee998c832f9fac37";
    
    // Generate expense ID
    const expenseId = ethers.keccak256(ethers.toUtf8Bytes("ptt-demo-expense-8-bob"));
    console.log(`📋 Expense ID: ${expenseId}`);
    
    console.log("\n🎯 Demo Scenario:");
    console.log("├── Bob creates expense on Base Sepolia (wants USDC settlement)");
    console.log("├── Alice has CCIP-BnM on Arbitrum Sepolia");
    console.log("├── Alice pays with CCIP-BnM → CCIP auto-converts to USDC on Base");
    console.log("└── Single transaction, any-token-to-any-token! 🔥\n");
    
    // Step 1: Create expense on Base Sepolia with Bob's wallet
    console.log("📍 Step 1: Creating expense on Base Sepolia...");
    try {
        const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        const bobWallet = new ethers.Wallet(BOB_KEY, baseProvider);
        
        const pttContract = new ethers.Contract(
            PTT_CONTRACTS.baseSepolia,
            [
                "function createExpense(bytes32 expenseId, uint256 totalAmount, string memory description, address settlementToken) external",
                "function getExpenseDetails(bytes32 expenseId) external view returns (address creator, uint256 totalAmount, uint256 amountPaid, bool settled, string memory description, address settlementToken)"
            ],
            bobWallet
        );
        
        // Create expense requiring USDC settlement
        const totalAmount = ethers.parseUnits("8", 6); // 8 USDC (6 decimals)
        const createTx = await pttContract.createExpense(
            expenseId,
            totalAmount,
            "CCIP PTT Demo - Any Token to Any Token",
            TOKENS.baseSepolia.usdc
        );
        
        console.log(`📤 Transaction sent: ${createTx.hash}`);
        const receipt = await createTx.wait();
        console.log(`✅ Expense created! Block: ${receipt.blockNumber}`);
        
        // Verify expense
        const expenseDetails = await pttContract.getExpenseDetails(expenseId);
        console.log(`💰 Expense Amount: ${ethers.formatUnits(expenseDetails[1], 6)} USDC`);
        console.log(`🎯 Settlement Token: ${expenseDetails[5]}`);
        
    } catch (error) {
        console.error("❌ Error creating expense:", error.message);
        return;
    }
    
    console.log("\n🚀 Ready for PTT Payment!");
    console.log("💡 Next: Alice can pay with CCIP-BnM from Arbitrum Sepolia");
    console.log("🔄 CCIP will automatically convert CCIP-BnM → USDC on Base Sepolia");
    console.log(`🌐 Use expense ID: ${expenseId}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});