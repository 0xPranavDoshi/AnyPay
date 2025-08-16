import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("deploy-expense-splitter", "Deploy CrossChainExpenseSplitter contract")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log(`🚀 Deploying CrossChainExpenseSplitter on ${hre.network.name}...`);

    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`📍 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);

    // Network-specific addresses
    const networkConfigs: { [key: string]: any } = {
      ethereumSepolia: {
        router: "0xD0daae2231E9CB96b94C8512223533293C3693Bf",
        link: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
        swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"
      },
      arbitrumSepolia: {
        router: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
        link: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
        usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        weth: "0xE591bf0A0CF924A0674d7792db046B23CEbF5f34",
        swapRouter: "0x101F443B4d1b059569D643917553c771E1b9663E"
      },
      baseSepolia: {
        router: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
        link: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        weth: "0x4200000000000000000000000000000000000006",
        swapRouter: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"
      }
    };

    const config = networkConfigs[hre.network.name];
    if (!config) throw new Error(`Network ${hre.network.name} not supported`);

    console.log(`📋 Network Configuration:`);
    console.log(`   Router: ${config.router}`);
    console.log(`   LINK: ${config.link}`);
    console.log(`   USDC: ${config.usdc}`);
    console.log(`   WETH: ${config.weth}`);
    console.log(`   SwapRouter: ${config.swapRouter}`);

    const ExpenseSplitter = await hre.ethers.getContractFactory("CrossChainExpenseSplitter");
    const contract = await ExpenseSplitter.deploy(
      config.router,
      config.link,
      config.usdc,
      config.weth,
      config.swapRouter
    );

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`✅ CrossChainExpenseSplitter deployed to: ${address}`);
    console.log(`🔗 Explorer: ${getExplorerUrl(hre.network.name, address)}\n`);
  });

function getExplorerUrl(networkName: string, address: string): string {
  const explorers: { [key: string]: string } = {
    ethereumSepolia: `https://sepolia.etherscan.io/address/${address}`,
    arbitrumSepolia: `https://sepolia.arbiscan.io/address/${address}`,
    baseSepolia: `https://sepolia.basescan.org/address/${address}`,
  };
  return explorers[networkName] || `Address: ${address}`;
}
