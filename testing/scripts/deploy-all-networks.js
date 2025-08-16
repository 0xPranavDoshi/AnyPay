const { ethers, network } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n🚀 Deploying CrossChainExpenseSplitter on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);
    
    // Get network-specific config
    let config;
    if (network.name === "ethereumSepolia") {
        config = {
            ccipRouter: "0xD0daae2231E9CB96b94C8512223533293C3693Bf",
            link: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
            usdc: "0xf08A50178dfcDe18524640EA6618a1f965821715", // User's USDC on Ethereum Sepolia
            weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
            swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
            chainSelector: "16015286601757825753"
        };
    } else if (network.name === "arbitrumSepolia") {
        config = {
            ccipRouter: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
            link: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // User's USDC on Arbitrum Sepolia
            weth: "0xE591bf0A0CF924A0674d7792db046B23CEbF5f34",
            swapRouter: "0x101F443B4d1b059569D643917553c771E1b9663E",
            chainSelector: "3478487238524512106"
        };
    } else if (network.name === "baseSepolia") {
        config = {
            ccipRouter: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
            link: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
            usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // User's USDC address
            weth: "0x4200000000000000000000000000000000000006",
            swapRouter: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
            chainSelector: "10344971235874465080"
        };
    } else {
        throw new Error(`Unsupported network: ${network.name}`);
    }
    
    console.log("📋 Network Configuration:");
    console.log(`   CCIP Router: ${config.ccipRouter}`);
    console.log(`   LINK: ${config.link}`);
    console.log(`   USDC: ${config.usdc}`);
    console.log(`   WETH: ${config.weth}`);
    console.log(`   Swap Router: ${config.swapRouter}`);
    console.log(`   Chain Selector: ${config.chainSelector}\n`);
    
    // Deploy contract
    const ExpenseSplitter = await ethers.getContractFactory("CrossChainExpenseSplitter");
    const splitter = await ExpenseSplitter.deploy(
        config.ccipRouter,
        config.link,
        config.usdc,
        config.weth,
        config.swapRouter
    );
    
    await splitter.waitForDeployment();
    
    console.log(`✅ CrossChainExpenseSplitter deployed to: ${await splitter.getAddress()}`);
    console.log(`🔗 Block Explorer: https://${network.name === 'ethereumSepolia' ? 'sepolia.etherscan.io' : 
        network.name === 'arbitrumSepolia' ? 'sepolia.arbiscan.io' : 
        'sepolia.basescan.org'}/address/${await splitter.getAddress()}\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
