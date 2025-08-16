import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment...");
  
  try {
    const [deployer] = await ethers.getSigners();
    console.log("📍 Deploying with account:", deployer.address);
    
    // Check balance first
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      throw new Error("❌ No ETH balance! Get testnet ETH first.");
    }

    // Network-specific addresses
    const networks: { [key: string]: { router: string; link: string } } = {
      ethereumSepolia: {
        router: "0xD0daae2231E9CB96b94C8512223533293C3693Bf",
        link: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
      },
      baseSepolia: {
        router: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
        link: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410"
      }
    };

    const networkName = (process.env.HARDHAT_NETWORK || "ethereumSepolia") as string;
    const config = networks[networkName];
    
    if (!config) {
      throw new Error(`Network ${networkName} not configured`);
    }

    console.log("📋 Using router:", config.router);
    console.log("📋 Using LINK:", config.link);

    console.log("⏳ Deploying contract...");
    const ExpenseSplitter = await ethers.getContractFactory("CrossChainExpenseSplitter");
    const contract = await ExpenseSplitter.deploy(config.router, config.link);

    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log("✅ CrossChainExpenseSplitter deployed to:", address);
    
    // Show explorer link
    const explorers: { [key: string]: string } = {
      ethereumSepolia: `https://sepolia.etherscan.io/address/${address}`,
      baseSepolia: `https://sepolia.basescan.org/address/${address}`,
    };
    
    if (explorers[networkName]) {
      console.log("🔗 View on explorer:", explorers[networkName]);
    }

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main();
