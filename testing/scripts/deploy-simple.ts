import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  console.log("🚀 Starting deployment...");

  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deploying with account:", deployer.address);

    // Check balance first
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      throw new Error("❌ No ETH balance! Get testnet ETH first.");
    }

    // Network-specific addresses
    const networks: {
      [key: string]: {
        router: string;
        link: string;
        usdc: string;
        weth: string;
        swapRouter: string;
      };
    } = {
      ethereumSepolia: {
        router: "0xD0daae2231E9CB96b94C8512223533293C3693Bf",
        link: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
        weth: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // Sepolia WETH
        swapRouter: "0x3bFA4769FB09eefC5a80d6E87f3D754c3A1D2B0a", // Sepolia Uniswap V3 Router
      },
      baseSepolia: {
        router: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
        link: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7c", // Base Sepolia USDC
        weth: "0x4200000000000000000000000000000000000006", // Base Sepolia WETH
        swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Base Sepolia Uniswap V3 Router
      },
    };

    const networkName = (process.env.HARDHAT_NETWORK ||
      "ethereumSepolia") as string;
    const config = networks[networkName];

    if (!config) {
      throw new Error(`Network ${networkName} not configured`);
    }

    console.log("📋 Using router:", config.router);
    console.log("📋 Using LINK:", config.link);
    console.log("📋 Using USDC:", config.usdc);
    console.log("📋 Using WETH:", config.weth);
    console.log("📋 Using SwapRouter:", config.swapRouter);

    console.log("⏳ Deploying contract...");
    const ExpenseSplitter = await hre.ethers.getContractFactory(
      "CrossChainExpenseSplitter"
    );
    const contract = await ExpenseSplitter.deploy(
      config.router,
      config.link,
      config.usdc,
      config.weth,
      config.swapRouter
    );

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
