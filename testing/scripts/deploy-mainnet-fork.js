const { ethers, network } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n🚀 Deploying CrossChainExpenseSplitter on mainnet fork`);
    console.log(`📍 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);
    
    // Real mainnet addresses
    const config = {
        ccipRouter: "0x80226fc0ee2b096224eeac085bb9a8cba1146f7d", // CCIP Router V1_2 on mainnet
        link: "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK token on mainnet
        usdc: "0xA0b86a33E6441e8042F0a04cF4A8d5EcaD72E7CD", // USDC on mainnet (Circle)
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on mainnet
        swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 SwapRouter on mainnet
        chainSelector: "5009297550715157269" // Ethereum mainnet chain selector
    };
    
    console.log("📋 Mainnet Configuration:");
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
    console.log(`🌐 Network: ${network.name} (forked from mainnet)`);
    console.log(`💧 Real Uniswap pools with actual liquidity available!\n`);
    
    // Test the Uniswap swap to make sure it works
    console.log("🧪 Testing Uniswap swap functionality...");
    
    try {
        // Get some WETH first
        const wethContract = new ethers.Contract(
            config.weth,
            ["function deposit() payable", "function balanceOf(address) view returns (uint256)"],
            deployer
        );
        
        console.log("🔄 Wrapping 1 ETH to WETH...");
        const wrapTx = await wethContract.deposit({ value: ethers.parseEther("1") });
        await wrapTx.wait();
        
        const wethBalance = await wethContract.balanceOf(deployer.address);
        console.log(`✅ WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
        
        // Test the actual swap function from our contract
        console.log("🔄 Testing ETH → USDC swap through our contract...");
        const swapTx = await splitter.contributeWithETHLocal(
            "0x1234567890123456789012345678901234567890123456789012345678901234", // dummy expense ID
            { value: ethers.parseEther("0.1") }
        );
        
        console.log(`📤 Swap transaction sent: ${swapTx.hash}`);
        const receipt = await swapTx.wait();
        console.log(`✅ Swap successful! Block: ${receipt.blockNumber}`);
        
    } catch (error) {
        console.log(`❌ Swap test failed: ${error.message}`);
        console.log("But the contract deployment was successful!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});