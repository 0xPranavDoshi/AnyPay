const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const network = hre.network.name;
  console.log(`\n🚀 Deploying CrossChainPaymentSplitterPTT to ${network}...`);

  // Get network-specific addresses
  const getNetworkAddresses = (networkName) => {
    switch (networkName) {
      case "ethereumSepolia":
        return {
          router: process.env.ETHEREUM_SEPOLIA_ROUTER,
          ccipBnM: process.env.ETHEREUM_SEPOLIA_CCIP_BNM,
          usdc: process.env.ETHEREUM_SEPOLIA_USDC,
          ccipLnM: "0x466D489b6d36E7E3b824ef491C225F5830E81cC1",
          chainSelector: process.env.ETHEREUM_SEPOLIA_CHAIN_SELECTOR
        };
      case "arbitrumSepolia":
        return {
          router: process.env.ARBITRUM_SEPOLIA_ROUTER,
          ccipBnM: process.env.ARBITRUM_SEPOLIA_CCIP_BNM,
          usdc: process.env.ARBITRUM_SEPOLIA_USDC,
          ccipLnM: "0x139E99f0ab4084E14e6bb7DacA289a91a2d92927",
          chainSelector: process.env.ARBITRUM_SEPOLIA_CHAIN_SELECTOR
        };
      case "baseSepolia":
        return {
          router: process.env.BASE_SEPOLIA_ROUTER,
          ccipBnM: process.env.BASE_SEPOLIA_CCIP_BNM,
          usdc: process.env.BASE_SEPOLIA_USDC,
          ccipLnM: "0xF1623862e4c9f9Fba1Ac0181C4fF53B4f958F065",
          chainSelector: process.env.BASE_SEPOLIA_CHAIN_SELECTOR
        };
      default:
        throw new Error(`Unsupported network: ${networkName}`);
    }
  };

  const addresses = getNetworkAddresses(network);
  
  console.log(`📋 Network Config:`);
  console.log(`- Router: ${addresses.router}`);
  console.log(`- CCIP-BnM: ${addresses.ccipBnM}`);
  console.log(`- USDC: ${addresses.usdc}`);
  console.log(`- CCIP-LnM: ${addresses.ccipLnM}`);
  console.log(`- Chain Selector: ${addresses.chainSelector}`);

  // Deploy the contract
  const CrossChainPaymentSplitterPTT = await hre.ethers.getContractFactory("CrossChainPaymentSplitterPTT");
  
  console.log(`\n⚙️ Deploying contract...`);
  const contract = await CrossChainPaymentSplitterPTT.deploy(
    addresses.router,
    addresses.ccipBnM,
    addresses.usdc,
    addresses.ccipLnM
  );

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`\n✅ CrossChainPaymentSplitterPTT deployed!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Network: ${network}`);
  
  // Verify supported tokens
  const [ccipBnMAddr, usdcAddr, ccipLnMAddr] = await contract.getSupportedTokens();
  console.log(`\n🪙 Supported Tokens:`);
  console.log(`- CCIP-BnM: ${ccipBnMAddr}`);
  console.log(`- USDC: ${usdcAddr}`);
  console.log(`- CCIP-LnM: ${ccipLnMAddr}`);

  // Save deployment info
  const deploymentInfo = {
    network: network,
    contractAddress: contractAddress,
    router: addresses.router,
    ccipBnM: addresses.ccipBnM,
    usdc: addresses.usdc,
    ccipLnM: addresses.ccipLnM,
    chainSelector: addresses.chainSelector,
    deployedAt: new Date().toISOString()
  };

  console.log(`\n📄 Deployment Info:`);
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return {
    contract,
    contractAddress,
    network,
    addresses
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`❌ Deployment failed:`, error);
      process.exit(1);
    });
}

module.exports = main;