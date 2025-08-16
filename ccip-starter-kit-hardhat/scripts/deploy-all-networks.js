const { ethers, network } = require("hardhat");
const { NetworkConfig } = require("../contracts/NetworkConfig.sol");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n🚀 Deploying CrossChainExpenseSplitter on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);
    
    // Get network-specific config
    let config;
    if (network.name === "ethereumSepolia") {
        config = NetworkConfig.getEthereumSepoliaConfig();
    } else if (network.name === "arbitrumSepolia") {
        config = NetworkConfig.getArbitrumSepoliaConfig();
    } else if (network.name === "baseSepolia") {
        config = NetworkConfig.getBaseSepoliaConfig();
    } else {
        throw new Error(`Unsupported network: ${network.name}`);
    }
    
    console.log("📋 Network Configuration:");
    console.log(`   CCIP Router: ${config.ccipRouter}`);
    console.log(`   USDC: ${config.usdc}`);
    console.log(`   WETH: ${config.weth}`);
    console.log(`   Swap Router: ${config.swapRouter}`);
    console.log(`   Chain Selector: ${config.chainSelector}\n`);
    
    // Deploy contract
    const ExpenseSplitter = await ethers.getContractFactory("CrossChainExpenseSplitter");
    const splitter = await ExpenseSplitter.deploy(
        config.ccipRouter,
        config.usdc,
        config.weth,
        config.swapRouter
    );
    
    await splitter.deployed();
    
    console.log(`✅ CrossChainExpenseSplitter deployed to: ${splitter.address}`);
    console.log(`🔗 Block Explorer: https://${network.name === 'ethereumSepolia' ? 'sepolia.etherscan.io' : 
        network.name === 'arbitrumSepolia' ? 'sepolia.arbiscan.io' : 
        'sepolia.basescan.org'}/address/${splitter.address}\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
