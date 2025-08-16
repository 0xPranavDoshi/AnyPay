const { ethers, network } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n🚀 Deploying CrossChainExpenseSplitterPTT on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);
    
    // Get network-specific config with CCIP-BnM addresses
    let config;
    if (network.name === "ethereumSepolia") {
        config = {
            ccipRouter: "0xD0daae2231E9CB96b94C8512223533293C3693Bf",
            ccipBnM: "0xF694E193200268f9a4868e4Aa017A0118C9a8177", // CCIP-BnM on Ethereum Sepolia
            usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // CCIP Official USDC
            weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
            chainSelector: "16015286601757825753"
        };
    } else if (network.name === "arbitrumSepolia") {
        config = {
            ccipRouter: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
            ccipBnM: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D", // CCIP-BnM on Arbitrum Sepolia ✅
            usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // CCIP Official USDC ✅
            weth: "0xE591bf0A0CF924A0674d7792db046B23CEbF5f34",
            chainSelector: "3478487238524512106"
        };
    } else if (network.name === "baseSepolia") {
        config = {
            ccipRouter: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
            ccipBnM: "0x88A2d74F47a237a62e7A51cdDa67270CE381555e", // CCIP-BnM on Base Sepolia ✅
            usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // CCIP Official USDC ✅
            weth: "0x4200000000000000000000000000000000000006",
            chainSelector: "10344971235874465080"
        };
    } else {
        throw new Error(`Unsupported network: ${network.name}`);
    }
    
    console.log("📋 Network Configuration (PTT):");
    console.log(`   CCIP Router: ${config.ccipRouter}`);
    console.log(`   CCIP-BnM: ${config.ccipBnM}`);
    console.log(`   USDC: ${config.usdc}`);
    console.log(`   WETH: ${config.weth}`);
    console.log(`   Chain Selector: ${config.chainSelector}\n`);
    
    // Deploy PTT contract
    const ExpenseSplitterPTT = await ethers.getContractFactory("CrossChainExpenseSplitterPTT");
    const splitterPTT = await ExpenseSplitterPTT.deploy(
        config.ccipRouter,
        config.ccipBnM,
        config.usdc,
        config.weth
    );
    
    await splitterPTT.waitForDeployment();
    
    console.log(`✅ CrossChainExpenseSplitterPTT deployed to: ${await splitterPTT.getAddress()}`);
    console.log(`🔗 Block Explorer: https://${network.name === 'ethereumSepolia' ? 'sepolia.etherscan.io' : 
        network.name === 'arbitrumSepolia' ? 'sepolia.arbiscan.io' : 
        'sepolia.basescan.org'}/address/${await splitterPTT.getAddress()}`);
    
    console.log(`\n🎯 PTT Features Available:`);
    console.log(`   ✅ CCIP-BnM ↔ USDC conversion`);
    console.log(`   ✅ Cross-chain swap + bridge in one transaction`);
    console.log(`   ✅ Any token in → Any token out`);
    console.log(`   ✅ Auto-settlement on full payment\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});