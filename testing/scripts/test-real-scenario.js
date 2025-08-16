const { ethers } = require("hardhat");

async function main() {
    // Your deployed contract addresses
    const CONTRACT_ADDRESSES = {
        ethereumSepolia: "0x...", // Fill after deployment
        arbitrumSepolia: "0x...", // Fill after deployment
        baseSepolia: "0x..."      // Fill after deployment
    };
    
    const BASE_CHAIN_SELECTOR = "10344971235874465080";
    
    console.log("🍕 Testing Real Cross-Chain Pizza Expense...\n");
    
    // 1. Alice creates expense on Base
    console.log("📋 Step 1: Alice creates $60 pizza expense on Base Sepolia");
    const baseContract = await ethers.getContractAt(
        "CrossChainExpenseSplitter",
        CONTRACT_ADDRESSES.baseSepolia
    );
    
    const expenseId = ethers.utils.formatBytes32String("pizza_" + Date.now());
    const totalAmount = ethers.utils.parseUnits("60", 6); // $60 USDC
    
    await baseContract.createExpense(expenseId, totalAmount, "Friday Pizza Party");
    console.log("✅ Expense created on Base Sepolia\n");
    
    // 2. Bob contributes locally on Base with ETH
    console.log("💳 Step 2: Bob contributes $20 via ETH swap on Base Sepolia");
    await baseContract.contributeWithETHLocal(expenseId, {
        value: ethers.utils.parseEther("0.01") // ~$20 worth of ETH
    });
    console.log("✅ Bob's contribution recorded\n");
    
    // 3. Charlie contributes from Ethereum Sepolia
    console.log("⚡ Step 3: Charlie contributes from Ethereum Sepolia");
    const ethContract = await ethers.getContractAt(
        "CrossChainExpenseSplitter",
        CONTRACT_ADDRESSES.ethereumSepolia
    );
    
    await ethContract.contributeWithETHCrossChain(expenseId, BASE_CHAIN_SELECTOR, {
        value: ethers.utils.parseEther("0.015") // ETH for swap + CCIP fees
    });
    console.log("✅ Charlie's cross-chain contribution sent via CCIP\n");
    
    // 4. David contributes from Arbitrum Sepolia
    console.log("🚀 Step 4: David contributes from Arbitrum Sepolia");
    const arbContract = await ethers.getContractAt(
        "CrossChainExpenseSplitter",
        CONTRACT_ADDRESSES.arbitrumSepolia
    );
    
    await arbContract.contributeWithETHCrossChain(expenseId, BASE_CHAIN_SELECTOR, {
        value: ethers.utils.parseEther("0.015")
    });
    console.log("✅ David's cross-chain contribution sent via CCIP\n");
    
    // 5. Check final status
    console.log("📊 Checking final expense status...");
    const expense = await baseContract.getExpenseDetails(expenseId);
    console.log(`Total Amount: $${ethers.utils.formatUnits(expense.totalAmount, 6)}`);
    console.log(`Amount Paid: $${ethers.utils.formatUnits(expense.amountPaid, 6)}`);
    console.log(`Settled: ${expense.settled}`);
    console.log("\n🎉 Real cross-chain expense splitting complete!");
}

main().catch(console.error);
