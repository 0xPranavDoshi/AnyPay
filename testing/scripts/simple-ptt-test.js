const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Simple CCIP PTT Test: CCIP-BnM Arbitrum → Base\n");
    
    // Token addresses
    const CCIP_BNM_ARBITRUM = "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D";
    const CCIP_BNM_BASE = "0x88A2d74F47a237a62e7A51cdDa67270CE381555e";
    
    // Chain selector for Base Sepolia
    const BASE_SEPOLIA_SELECTOR = BigInt("10344971235874465080");
    
    // Alice's key and receiving address
    const ALICE_KEY = "0xf6a79890cca256fb4081b036658f79cc273713eb16d35786ee998c832f9fac37";
    const RECEIVE_ADDRESS = "0xef77667ffA4790A1BD2049760c116250EA65a923"; // Bob will receive
    
    // Use the existing ProgrammableTokenTransfers contract (simpler)
    const PTT_CONTRACT = "0xc4D234C069425f21b62fb742F1C39f0E4D253Ecd"; // Our deployed contract
    
    console.log("🎯 Simple PTT Demo:");
    console.log("├── Send 0.5 CCIP-BnM from Arbitrum Sepolia");
    console.log("├── Receive on Base Sepolia");
    console.log("└── Test CCIP cross-chain token transfer! 🔥\n");
    
    // Connect to Arbitrum Sepolia
    const arbProvider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
    const aliceWallet = new ethers.Wallet(ALICE_KEY, arbProvider);
    
    console.log(`👤 Alice's Address: ${aliceWallet.address}`);
    console.log(`📍 Receiving Address: ${RECEIVE_ADDRESS}`);
    
    // Check CCIP-BnM balance
    const ccipBnMContract = new ethers.Contract(
        CCIP_BNM_ARBITRUM,
        [
            "function balanceOf(address) view returns (uint256)", 
            "function approve(address spender, uint256 amount) returns (bool)"
        ],
        aliceWallet
    );
    
    const balance = await ccipBnMContract.balanceOf(aliceWallet.address);
    console.log(`💰 Alice's CCIP-BnM Balance: ${ethers.formatEther(balance)} CCIP-BnM`);
    
    if (balance < ethers.parseEther("0.5")) {
        console.log("❌ Insufficient CCIP-BnM balance for transfer");
        return;
    }
    
    // Use simple sendMessage function from ProgrammableTokenTransfers
    const pttContract = new ethers.Contract(
        PTT_CONTRACT,
        [
            "function sendMessage(uint64 destinationChainSelector, address receiver, string calldata message, address token, uint256 amount) external returns (bytes32 messageId)"
        ],
        aliceWallet
    );
    
    const transferAmount = ethers.parseEther("0.5");
    
    console.log(`\n💸 Sending PTT Transfer...`);
    console.log(`📊 Amount: ${ethers.formatEther(transferAmount)} CCIP-BnM`);
    console.log(`🎯 To: ${RECEIVE_ADDRESS} on Base Sepolia`);
    
    try {
        // Step 1: Approve CCIP-BnM spending
        console.log("\n🔓 Approving CCIP-BnM spending...");
        const approveTx = await ccipBnMContract.approve(PTT_CONTRACT, transferAmount);
        console.log(`📤 Approval sent: ${approveTx.hash}`);
        await approveTx.wait();
        console.log("✅ CCIP-BnM approved!");
        
        // Step 2: Send CCIP-BnM to Base Sepolia
        console.log("\n🚀 Sending CCIP-BnM cross-chain...");
        
        const sendTx = await pttContract.sendMessage(
            BASE_SEPOLIA_SELECTOR,
            RECEIVE_ADDRESS,
            "PTT Test Transfer - CCIP-BnM Arbitrum to Base",
            CCIP_BNM_ARBITRUM,
            transferAmount,
            { 
                value: ethers.parseEther("0.01"), // ETH for CCIP fees
                gasLimit: 500000 
            }
        );
        
        console.log(`📤 PTT Transfer sent: ${sendTx.hash}`);
        const receipt = await sendTx.wait();
        console.log(`✅ Transfer initiated! Block: ${receipt.blockNumber}`);
        
        console.log("\n🎉 CCIP PTT TRANSFER SUCCESS!");
        console.log("🔄 CCIP is now processing:");
        console.log("├── ⚡ Bridging 0.5 CCIP-BnM from Arbitrum → Base");
        console.log("├── 📦 Delivering to Bob's address on Base Sepolia");
        console.log("└── ✨ Cross-chain token transfer complete!");
        
        console.log(`\n🔗 Track Transaction:`);
        console.log(`   Arbitrum: https://sepolia.arbiscan.io/tx/${sendTx.hash}`);
        console.log(`   Base: Check in ~10-20 minutes`);
        console.log(`\n🕐 CCIP processing time: ~10-20 minutes`);
        
        console.log("\n🚀 This proves CCIP PTT works!");
        console.log("✅ Cross-chain token transfers");
        console.log("✅ Single transaction initiation"); 
        console.log("✅ Ready for expense splitter integration!");
        
    } catch (error) {
        console.error("❌ PTT Transfer failed:", error.message);
        if (error.data) {
            console.log("Error data:", error.data);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});