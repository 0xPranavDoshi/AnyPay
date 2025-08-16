const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 CCIP PTT Cross-Chain Payment Demo\n");
    
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
    
    // Alice's wallet
    const ALICE_KEY = "0xf6a79890cca256fb4081b036658f79cc273713eb16d35786ee998c832f9fac37";
    
    // Expense ID from previous step
    const expenseId = "0x4402ed3a506bcaaea5e86ca7bcdef7c53751adf3f7943ba63296f8ddba57f1a5";
    
    console.log("🎯 Revolutionary PTT Payment:");
    console.log("├── Source: Arbitrum Sepolia (Alice has CCIP-BnM)");
    console.log("├── Destination: Base Sepolia (Expense needs USDC)");
    console.log("├── Magic: CCIP-BnM → auto-converts → USDC");
    console.log("└── Single transaction cross-chain swap + bridge! 🔥\n");
    
    // Connect to Arbitrum Sepolia
    console.log("📍 Connecting to Arbitrum Sepolia...");
    const arbProvider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
    const aliceWallet = new ethers.Wallet(ALICE_KEY, arbProvider);
    
    console.log(`👤 Alice's Address: ${aliceWallet.address}`);
    
    // Check CCIP-BnM balance
    const ccipBnMContract = new ethers.Contract(
        TOKENS.arbitrumSepolia.ccipBnM,
        ["function balanceOf(address) view returns (uint256)", "function approve(address spender, uint256 amount) returns (bool)"],
        aliceWallet
    );
    
    const balance = await ccipBnMContract.balanceOf(aliceWallet.address);
    console.log(`💰 Alice's CCIP-BnM Balance: ${ethers.formatEther(balance)} CCIP-BnM`);
    
    if (balance < ethers.parseEther("0.5")) {
        console.log("❌ Insufficient CCIP-BnM balance for payment");
        return;
    }
    
    // Connect to PTT contract on Arbitrum
    const pttContract = new ethers.Contract(
        PTT_CONTRACTS.arbitrumSepolia,
        [
            "function contributeWithPTT(bytes32 expenseId, uint64 destinationChainSelector, address tokenIn, uint256 amountIn, uint8 fromToken, uint8 toToken) external payable returns (bytes32 messageId)"
        ],
        aliceWallet
    );
    
    // Payment amount (0.5 CCIP-BnM)
    const paymentAmount = ethers.parseEther("0.5");
    
    console.log(`\n💸 Processing PTT Payment...`);
    console.log(`📊 Amount: ${ethers.formatEther(paymentAmount)} CCIP-BnM`);
    console.log(`🎯 Expense ID: ${expenseId}`);
    
    try {
        // Step 1: Approve CCIP-BnM spending
        console.log("🔓 Approving CCIP-BnM spending...");
        const approveTx = await ccipBnMContract.approve(PTT_CONTRACTS.arbitrumSepolia, paymentAmount);
        console.log(`📤 Approval sent: ${approveTx.hash}`);
        await approveTx.wait();
        console.log("✅ CCIP-BnM approved!");
        
        // Step 2: Execute PTT payment
        console.log("🚀 Executing PTT cross-chain payment...");
        
        // TokenType enum: USDC=0, CCIP_BNM=1, WETH=2, NATIVE_ETH=3
        const fromToken = 1; // CCIP_BNM
        const toToken = 0;   // USDC
        
        const pttTx = await pttContract.contributeWithPTT(
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
        
        console.log("\n🎉 CCIP PTT Payment Success!");
        console.log("🔄 CCIP is now processing:");
        console.log("├── Bridging CCIP-BnM from Arbitrum → Base");
        console.log("├── Converting CCIP-BnM → USDC on Base Sepolia");
        console.log("└── Settling expense automatically");
        
        console.log(`\n🔗 Track on Arbitrum: https://sepolia.arbiscan.io/tx/${pttTx.hash}`);
        console.log("🕐 CCIP processing time: ~10-20 minutes");
        
    } catch (error) {
        console.error("❌ PTT Payment failed:", error);
        if (error.data) {
            console.log("Error data:", error.data);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});