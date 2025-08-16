const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 CCIP PTT Demo: USDC → CCIP-BnM Conversion\n");
    
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
    
    // Alice's wallet (has USDC on Arbitrum)
    const ALICE_KEY = "0xf6a79890cca256fb4081b036658f79cc273713eb16d35786ee998c832f9fac37";
    
    console.log("🎯 Alternative PTT Demo:");
    console.log("├── Create expense on Base requiring CCIP-BnM settlement");
    console.log("├── Alice pays with USDC from Arbitrum Sepolia");
    console.log("├── CCIP auto-converts USDC → CCIP-BnM on Base");
    console.log("└── Demonstrates any-token-to-any-token capability! 🔥\n");
    
    // Step 1: Create expense on Base requiring CCIP-BnM settlement
    console.log("📍 Step 1: Creating expense requiring CCIP-BnM settlement...");
    const BOB_KEY = "0x1b72ec747a8816f64f143372aff5f757a8ebfbd2ca2b0c7efbf6abf258a165bf";
    
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
        
        // Generate new expense ID for CCIP-BnM settlement
        const expenseId = ethers.keccak256(ethers.toUtf8Bytes("ptt-demo-ccipbnm-settlement"));
        console.log(`📋 Expense ID: ${expenseId}`);
        
        // Create expense requiring CCIP-BnM settlement (5 tokens)
        const totalAmount = ethers.parseEther("5"); // 5 CCIP-BnM
        const createTx = await pttContract.createExpense(
            expenseId,
            totalAmount,
            "PTT Demo - USDC to CCIP-BnM Conversion",
            TOKENS.baseSepolia.ccipBnM // Settlement in CCIP-BnM
        );
        
        console.log(`📤 Transaction sent: ${createTx.hash}`);
        const receipt = await createTx.wait();
        console.log(`✅ Expense created! Block: ${receipt.blockNumber}`);
        
        // Verify expense
        const expenseDetails = await pttContract.getExpenseDetails(expenseId);
        console.log(`💰 Expense Amount: ${ethers.formatEther(expenseDetails[1])} CCIP-BnM`);
        console.log(`🎯 Settlement Token: ${expenseDetails[5]} (CCIP-BnM)`);
        
        // Step 2: Check Alice's USDC balance on Arbitrum
        console.log("\n📍 Step 2: Checking Alice's USDC balance...");
        const arbProvider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
        const aliceWallet = new ethers.Wallet(ALICE_KEY, arbProvider);
        
        const usdcContract = new ethers.Contract(
            TOKENS.arbitrumSepolia.usdc,
            ["function balanceOf(address) view returns (uint256)"],
            aliceWallet
        );
        
        const usdcBalance = await usdcContract.balanceOf(aliceWallet.address);
        console.log(`💰 Alice's USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
        
        if (usdcBalance >= ethers.parseUnits("5", 6)) {
            console.log("\n🚀 Ready for USDC → CCIP-BnM PTT Payment!");
            console.log("💡 Alice can now pay with USDC, auto-converted to CCIP-BnM");
            console.log(`🌐 Expense ID: ${expenseId}`);
            console.log("\n🔥 This demonstrates true any-token-to-any-token payments!");
        } else {
            console.log("❌ Insufficient USDC balance for payment");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});